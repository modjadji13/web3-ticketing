use axum::{
    body::Body,
    extract::{FromRequestParts, Path, State},
    http::{header, request::Parts, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use base64::{engine::general_purpose, Engine as _};
use chrono::{DateTime, Duration, Utc};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rand::{distributions::Alphanumeric, Rng};
use redis::aio::ConnectionManager;
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgRow, PgPool, Postgres, QueryBuilder, Row};
use std::{net::SocketAddr, sync::Arc};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use uuid::Uuid;

// Shared app state. The backend now uses PostgreSQL as the source of truth.
#[derive(Clone)]
struct AppState {
    db: PgPool,
    redis: ConnectionManager,
    jwt_secret: Arc<Vec<u8>>,
    jwt_ttl_seconds: i64,
}

#[derive(Clone, Serialize)]
struct Event {
    id: Uuid,
    name: String,
    venue: String,
    chain: String,
    price_lamports: u64,
    sale_start: DateTime<Utc>,
    per_wallet_limit: u16,
    resale_cap_bps: u16,
    royalty_bps: u16,
    created_at: DateTime<Utc>,
}

#[derive(Clone, Serialize)]
struct Seat {
    id: String,
    row: String,
    number: u16,
    status: SeatStatus,
    hold: Option<SeatHold>,
    ticket_id: Option<Uuid>,
}

#[derive(Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
enum SeatStatus {
    Available,
    Held,
    Reserved,
    Used,
}

#[derive(Clone, Serialize)]
struct SeatHold {
    #[serde(skip_serializing)]
    wallet_address: String,
    expires_at: DateTime<Utc>,
}

#[derive(Clone, Serialize)]
struct Ticket {
    id: Uuid,
    event_id: Uuid,
    seat_id: String,
    owner_wallet: String,
    onchain_ticket_address: Option<String>,
    payment_signature: Option<String>,
    mint_address: String,
    metadata_uri: String,
    price_lamports: u64,
    used_at: Option<DateTime<Utc>>,
    created_at: DateTime<Utc>,
    transfers: Vec<TicketTransfer>,
}

#[derive(Clone, Deserialize, Serialize)]
struct TicketTransfer {
    from_wallet: String,
    to_wallet: String,
    price_lamports: u64,
    organiser_royalty_lamports: u64,
    transferred_at: DateTime<Utc>,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    database: &'static str,
}

#[derive(Clone, Serialize)]
struct User {
    id: Uuid,
    wallet_address: String,
    email: Option<String>,
    email_verified: bool,
    created_at: DateTime<Utc>,
}

#[derive(Deserialize)]
struct WalletNonceRequest {
    wallet_address: String,
}

#[derive(Serialize)]
struct WalletNonceResponse {
    nonce_id: String,
    message: String,
    expires_at: DateTime<Utc>,
}

#[derive(Deserialize)]
struct WalletVerifyRequest {
    wallet_address: String,
    nonce_id: String,
    message: String,
    signature: String,
}

#[derive(Serialize)]
struct AuthResponse {
    token: String,
    token_type: &'static str,
    expires_at: DateTime<Utc>,
    user: User,
}

#[derive(Serialize)]
struct AuthMeResponse {
    user_id: Uuid,
    wallet_address: String,
}

#[derive(Deserialize)]
struct GoogleAuthRequest {
    access_token: String,
}

#[derive(Deserialize)]
struct GoogleTokenInfo {
    aud: String,
    email: String,
    email_verified: Option<bool>,
    verified_email: Option<bool>,
}

#[derive(Clone)]
struct AuthUser {
    user_id: Uuid,
    wallet_address: String,
}

#[derive(Clone, Deserialize, Serialize)]
struct Claims {
    sub: String,
    user_id: Uuid,
    exp: usize,
}

#[derive(Deserialize)]
struct CreateEventRequest {
    name: String,
    venue: String,
    chain: Option<String>,
    price_lamports: u64,
    sale_start: Option<DateTime<Utc>>,
    per_wallet_limit: Option<u16>,
    resale_cap_bps: Option<u16>,
    royalty_bps: Option<u16>,
    rows: Option<u16>,
    seats_per_row: Option<u16>,
}

#[derive(Deserialize)]
struct HoldSeatRequest {}

#[derive(Deserialize)]
struct ReserveSeatRequest {
    hold_wallet_address: Option<String>,
    payment_signature: Option<String>,
    onchain_ticket_address: Option<String>,
    metadata_uri: Option<String>,
}

#[derive(Serialize)]
struct ReserveSeatResponse {
    ticket: Ticket,
    reserve_instruction: &'static str,
    mint_instruction: &'static str,
    payment_signature: Option<String>,
}

#[derive(Deserialize)]
struct TransferTicketRequest {
    buyer_wallet: String,
    resale_price_lamports: u64,
}

#[derive(Deserialize)]
struct VerifyTicketRequest {
    event_id: Uuid,
    seat_id: String,
    mark_used: Option<bool>,
}

#[derive(Serialize)]
struct VerifyTicketResponse {
    valid: bool,
    reason: String,
    ticket: Option<Ticket>,
}

#[derive(Deserialize)]
struct VoiceConfirmationRequest {
    event_name: String,
    seat_label: String,
    email: Option<String>,
    ticket_id: Option<Uuid>,
}

#[derive(Serialize)]
struct ElevenLabsTextToSpeechRequest {
    text: String,
    model_id: &'static str,
    voice_settings: ElevenLabsVoiceSettings,
}

#[derive(Serialize)]
struct ElevenLabsVoiceSettings {
    stability: f32,
    similarity_boost: f32,
}

#[derive(Debug, Serialize)]
struct ApiError {
    #[serde(skip)]
    status: StatusCode,
    error: String,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.status, Json(self)).into_response()
    }
}

type ApiResult<T> = Result<Json<T>, ApiError>;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "web3_tickets_backend=info,tower_http=info".into()),
        )
        .init();

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://web3_tickets:web3_tickets@127.0.0.1:5433/web3_tickets".into()
    });
    let db = PgPool::connect(&database_url)
        .await
        .expect("connect to PostgreSQL; start docker compose postgres or set DATABASE_URL");
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into());
    let redis_client = redis::Client::open(redis_url).expect("create Redis client");
    let redis = redis_client
        .get_connection_manager()
        .await
        .expect("connect to Redis; start docker compose redis or set REDIS_URL");
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    if jwt_secret.as_bytes().len() < 32 {
        panic!("JWT_SECRET must be at least 32 bytes");
    }
    let jwt_ttl_seconds = std::env::var("JWT_TTL_SECONDS")
        .ok()
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(3600);

    init_db(&db).await.expect("initialize PostgreSQL schema");
    seed_demo_event(&db).await.expect("seed demo event");

    let state = AppState {
        db,
        redis,
        jwt_secret: Arc::new(jwt_secret.into_bytes()),
        jwt_ttl_seconds,
    };
    let app = Router::new()
        .route("/health", get(health))
        .route("/auth/wallet/nonce", post(create_wallet_nonce))
        .route("/auth/wallet/verify", post(verify_wallet_auth))
        .route("/auth/google", post(link_google_account))
        .route("/auth/me", get(auth_me))
        .route("/api/events", get(list_events).post(create_event))
        .route("/api/events/:event_id/seats", get(list_seats))
        .route("/api/events/:event_id/seats/:seat_id/hold", post(hold_seat))
        .route(
            "/api/events/:event_id/seats/:seat_id/reserve",
            post(reserve_seat),
        )
        .route("/api/tickets/:ticket_id", get(get_ticket))
        .route("/api/tickets/:ticket_id/transfer", post(transfer_ticket))
        .route("/api/tickets/verify", post(verify_ticket))
        .route("/api/voice/confirmation", post(create_voice_confirmation))
        .with_state(state)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let port = std::env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8090);
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    tracing::info!("Rust backend listening on http://{addr}");

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("bind backend listener");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("serve backend");
}

async fn init_db(db: &PgPool) -> Result<(), sqlx::Error> {
    // The prototype creates its own schema at startup so a fresh Postgres
    // container can run the demo without a separate migration command.
    let statements = [
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            wallet_address TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            email_verified BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS events (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            venue TEXT NOT NULL,
            chain TEXT NOT NULL,
            price_lamports BIGINT NOT NULL,
            sale_start TIMESTAMPTZ NOT NULL,
            per_wallet_limit INTEGER NOT NULL,
            resale_cap_bps INTEGER NOT NULL,
            royalty_bps INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS seats (
            event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            id TEXT NOT NULL,
            row_label TEXT NOT NULL,
            number INTEGER NOT NULL,
            status TEXT NOT NULL,
            hold_wallet_address TEXT,
            hold_expires_at TIMESTAMPTZ,
            ticket_id UUID,
            PRIMARY KEY (event_id, id)
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS tickets (
            id UUID PRIMARY KEY,
            event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            seat_id TEXT NOT NULL,
            owner_wallet TEXT NOT NULL,
            onchain_ticket_address TEXT,
            payment_signature TEXT,
            mint_address TEXT NOT NULL,
            metadata_uri TEXT NOT NULL,
            price_lamports BIGINT NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL,
            transfers JSONB NOT NULL DEFAULT '[]'::jsonb,
            UNIQUE (event_id, seat_id)
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS processed_signatures (
            event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            payment_signature TEXT NOT NULL,
            ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
            processed_at TIMESTAMPTZ NOT NULL,
            PRIMARY KEY (event_id, payment_signature)
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS hold_attempts (
            id UUID PRIMARY KEY,
            event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            seat_id TEXT NOT NULL,
            wallet_address TEXT NOT NULL,
            attempted_at TIMESTAMPTZ NOT NULL
        )
        "#,
        "CREATE INDEX IF NOT EXISTS idx_seats_event_status ON seats(event_id, status)",
        "CREATE INDEX IF NOT EXISTS idx_tickets_event_owner ON tickets(event_id, owner_wallet)",
        "CREATE INDEX IF NOT EXISTS idx_hold_attempts_wallet_time ON hold_attempts(wallet_address, attempted_at)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_verified ON users(email) WHERE email IS NOT NULL",
    ];

    for statement in statements {
        sqlx::query(statement).execute(db).await?;
    }

    Ok(())
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "web3-tickets-backend",
        database: "postgres",
    })
}

#[async_trait::async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.strip_prefix("Bearer "))
            .ok_or_else(|| unauthorized("missing bearer token"))?;
        let claims = decode::<Claims>(
            token,
            &DecodingKey::from_secret(state.jwt_secret.as_ref()),
            &Validation::default(),
        )
        .map_err(|_| unauthorized("invalid bearer token"))?
        .claims;
        Ok(AuthUser {
            user_id: claims.user_id,
            wallet_address: claims.sub,
        })
    }
}

async fn create_wallet_nonce(
    State(state): State<AppState>,
    Json(payload): Json<WalletNonceRequest>,
) -> ApiResult<WalletNonceResponse> {
    require_non_empty("wallet_address", &payload.wallet_address)?;
    validate_wallet_address(&payload.wallet_address)?;
    let nonce_id = random_token(16);
    let nonce = random_token(32);
    let expires_at = Utc::now() + Duration::seconds(120);
    let message = wallet_auth_message(&payload.wallet_address, &nonce, expires_at);
    let payload_json = serde_json::json!({
        "wallet_address": payload.wallet_address,
        "nonce": nonce,
        "message": message,
        "expires_at": expires_at,
    })
    .to_string();
    let mut conn = state.redis.clone();
    let stored: Option<String> = redis::cmd("SET")
        .arg(wallet_nonce_key(&payload.wallet_address, &nonce_id))
        .arg(payload_json)
        .arg("NX")
        .arg("EX")
        .arg(120)
        .query_async(&mut conn)
        .await
        .map_err(redis_error)?;
    if stored.is_none() {
        return Err(conflict("auth nonce already exists; retry sign-in"));
    }
    Ok(Json(WalletNonceResponse {
        nonce_id,
        message,
        expires_at,
    }))
}

async fn verify_wallet_auth(
    State(state): State<AppState>,
    Json(payload): Json<WalletVerifyRequest>,
) -> ApiResult<AuthResponse> {
    validate_wallet_address(&payload.wallet_address)?;
    require_non_empty("nonce_id", &payload.nonce_id)?;
    require_non_empty("message", &payload.message)?;
    require_non_empty("signature", &payload.signature)?;

    let nonce_key = wallet_nonce_key(&payload.wallet_address, &payload.nonce_id);
    let mut conn = state.redis.clone();
    let nonce_payload: Option<String> = redis::cmd("GETDEL")
        .arg(&nonce_key)
        .query_async(&mut conn)
        .await
        .map_err(redis_error)?;
    let nonce_payload =
        nonce_payload.ok_or_else(|| unauthorized("auth nonce expired or missing"))?;
    let nonce_value: serde_json::Value =
        serde_json::from_str(&nonce_payload).map_err(|_| unauthorized("auth nonce is invalid"))?;
    let expected_message = nonce_value
        .get("message")
        .and_then(|value| value.as_str())
        .ok_or_else(|| unauthorized("auth nonce message is invalid"))?;
    let expected_wallet = nonce_value
        .get("wallet_address")
        .and_then(|value| value.as_str())
        .ok_or_else(|| unauthorized("auth nonce wallet is invalid"))?;
    if expected_wallet != payload.wallet_address || expected_message != payload.message {
        return Err(unauthorized("signed message does not match nonce"));
    }
    verify_wallet_signature(
        &payload.wallet_address,
        &payload.message,
        &payload.signature,
    )?;
    let user = upsert_user_for_wallet(&state.db, &payload.wallet_address).await?;
    let expires_at = Utc::now() + Duration::seconds(state.jwt_ttl_seconds);
    let token = sign_jwt(&state, &user, expires_at)?;
    Ok(Json(AuthResponse {
        token,
        token_type: "Bearer",
        expires_at,
        user,
    }))
}

async fn auth_me(auth: AuthUser) -> Json<AuthMeResponse> {
    Json(AuthMeResponse {
        user_id: auth.user_id,
        wallet_address: auth.wallet_address,
    })
}

async fn link_google_account(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<GoogleAuthRequest>,
) -> ApiResult<User> {
    require_non_empty("access_token", &payload.access_token)?;
    let expected_aud = std::env::var("GOOGLE_CLIENT_ID")
        .or_else(|_| std::env::var("VITE_GOOGLE_CLIENT_ID"))
        .map_err(|_| bad_request("Google OAuth client id is not configured on the backend"))?;
    let profile = reqwest::Client::new()
        .get("https://oauth2.googleapis.com/tokeninfo")
        .query(&[("access_token", payload.access_token)])
        .send()
        .await
        .map_err(elevenlabs_error)?;
    if !profile.status().is_success() {
        return Err(unauthorized("Google token is invalid"));
    }
    let profile: GoogleTokenInfo = profile.json().await.map_err(elevenlabs_error)?;
    if profile.aud != expected_aud {
        return Err(unauthorized(
            "Google token audience does not match this app",
        ));
    }
    if !(profile
        .email_verified
        .or(profile.verified_email)
        .unwrap_or(false))
    {
        return Err(unauthorized("Google email is not verified"));
    }
    if let Some(existing_user_id) =
        sqlx::query_scalar::<_, Uuid>("SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1")
            .bind(&profile.email)
            .bind(auth.user_id)
            .fetch_optional(&state.db)
            .await
            .map_err(db_error)?
    {
        if existing_user_id != auth.user_id {
            return Err(conflict("email already linked to another wallet"));
        }
    }
    let row = sqlx::query(
        r#"
        UPDATE users
        SET email = $2, email_verified = TRUE
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(auth.user_id)
    .bind(&profile.email)
    .fetch_one(&state.db)
    .await
    .map_err(db_error)?;
    Ok(Json(row_to_user(&row)?))
}

async fn list_events(State(state): State<AppState>) -> ApiResult<Vec<Event>> {
    let rows = sqlx::query("SELECT * FROM events ORDER BY created_at")
        .fetch_all(&state.db)
        .await
        .map_err(db_error)?;

    Ok(Json(
        rows.iter().map(row_to_event).collect::<Result<_, _>>()?,
    ))
}

async fn create_event(
    State(state): State<AppState>,
    Json(payload): Json<CreateEventRequest>,
) -> ApiResult<Event> {
    let event = Event {
        id: Uuid::new_v4(),
        name: payload.name,
        venue: payload.venue,
        chain: payload.chain.unwrap_or_else(|| "solana-devnet".into()),
        price_lamports: payload.price_lamports,
        sale_start: payload.sale_start.unwrap_or_else(Utc::now),
        per_wallet_limit: payload.per_wallet_limit.unwrap_or(4),
        resale_cap_bps: payload.resale_cap_bps.unwrap_or(12_000),
        royalty_bps: payload.royalty_bps.unwrap_or(500),
        created_at: Utc::now(),
    };

    insert_event(&state.db, &event).await?;
    let seats = if uses_fnb_stadium_inventory(&event.name) {
        generate_jcole_seats()
    } else {
        generate_seats(
            payload.rows.unwrap_or(8),
            payload.seats_per_row.unwrap_or(12),
        )
    };
    insert_seats(&state.db, event.id, &seats).await?;

    Ok(Json(event))
}

async fn list_seats(
    State(state): State<AppState>,
    Path(event_id): Path<Uuid>,
) -> ApiResult<Vec<Seat>> {
    expire_holds(&state.db, event_id).await?;

    let rows =
        sqlx::query("SELECT * FROM seats WHERE event_id = $1 ORDER BY row_label, number, id")
            .bind(event_id)
            .fetch_all(&state.db)
            .await
            .map_err(db_error)?;

    Ok(Json(
        rows.iter().map(row_to_seat).collect::<Result<_, _>>()?,
    ))
}

async fn hold_seat(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((event_id, seat_id)): Path<(Uuid, String)>,
    Json(_payload): Json<HoldSeatRequest>,
) -> ApiResult<Seat> {
    expire_holds(&state.db, event_id).await?;
    enforce_hold_rate_limit(&state.db, event_id, &seat_id, &auth.wallet_address).await?;
    let expires_at = Utc::now() + Duration::minutes(2);

    let row = sqlx::query(
        r#"
        UPDATE seats
        SET status = 'held', hold_wallet_address = $3, hold_expires_at = $4
        WHERE event_id = $1 AND id = $2
          AND (
            status = 'available'
            OR (status = 'held' AND hold_wallet_address = $3)
          )
        RETURNING *
        "#,
    )
    .bind(event_id)
    .bind(&seat_id)
    .bind(&auth.wallet_address)
    .bind(expires_at)
    .fetch_optional(&state.db)
    .await
    .map_err(db_error)?
    .ok_or_else(|| bad_request("seat is not available"))?;

    Ok(Json(row_to_seat(&row)?))
}

async fn reserve_seat(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((event_id, seat_id)): Path<(Uuid, String)>,
    Json(payload): Json<ReserveSeatRequest>,
) -> ApiResult<ReserveSeatResponse> {
    let payment_signature =
        required_string("payment_signature", payload.payment_signature.as_deref())?;
    let onchain_ticket_address = required_string(
        "onchain_ticket_address",
        payload.onchain_ticket_address.as_deref(),
    )?;
    expire_holds(&state.db, event_id).await?;
    let mut tx = state.db.begin().await.map_err(db_error)?;

    let event = sqlx::query("SELECT * FROM events WHERE id = $1")
        .bind(event_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(db_error)?
        .map(|row| row_to_event(&row))
        .transpose()?
        .ok_or_else(|| not_found("event not found"))?;

    if let Some(ticket) = ticket_for_signature_tx(&mut tx, event_id, &payment_signature).await? {
        if ticket.owner_wallet != auth.wallet_address {
            return Err(conflict(
                "payment signature was already processed for another wallet",
            ));
        }
        tx.commit().await.map_err(db_error)?;
        return Ok(Json(ReserveSeatResponse {
            payment_signature: Some(payment_signature),
            ticket,
            reserve_instruction: "reserve_seat",
            mint_instruction: "mint_ticket",
        }));
    }

    let seat_row = sqlx::query("SELECT * FROM seats WHERE event_id = $1 AND id = $2 FOR UPDATE")
        .bind(event_id)
        .bind(&seat_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(db_error)?
        .ok_or_else(|| not_found("seat not found"))?;
    let seat = row_to_seat(&seat_row)?;

    if seat.status == SeatStatus::Reserved {
        let ticket = ticket_for_seat_tx(&mut tx, event_id, &seat_id).await?;
        if ticket.owner_wallet == auth.wallet_address {
            tx.commit().await.map_err(db_error)?;
            return Ok(Json(ReserveSeatResponse {
                payment_signature: payload
                    .payment_signature
                    .clone()
                    .or_else(|| ticket.payment_signature.clone()),
                ticket,
                reserve_instruction: "reserve_seat",
                mint_instruction: "mint_ticket",
            }));
        }
        return Err(bad_request("seat is already reserved"));
    }

    enforce_wallet_limit_tx(
        &mut tx,
        event_id,
        &auth.wallet_address,
        event.per_wallet_limit,
    )
    .await?;

    let hold_matches_checkout = |hold: &SeatHold| {
        hold.wallet_address == auth.wallet_address
            || payload
                .hold_wallet_address
                .as_deref()
                .is_some_and(|wallet| wallet == hold.wallet_address)
    };

    match (&seat.status, &seat.hold) {
        (SeatStatus::Available, _) => {
            return Err(conflict(
                "seat hold expired or missing; start checkout again",
            ))
        }
        (SeatStatus::Held, Some(hold)) if hold_matches_checkout(hold) => {}
        (SeatStatus::Held, _) => return Err(conflict("seat is held by another checkout session")),
        _ => return Err(conflict("seat is not available")),
    }

    let ticket = Ticket {
        id: Uuid::new_v4(),
        event_id,
        seat_id: seat_id.clone(),
        owner_wallet: auth.wallet_address,
        onchain_ticket_address: Some(onchain_ticket_address),
        payment_signature: Some(payment_signature.clone()),
        mint_address: format!("cNFT-{}", Uuid::new_v4()),
        metadata_uri: payload
            .metadata_uri
            .unwrap_or_else(|| "ipfs://pending-ticket-metadata".into()),
        price_lamports: event.price_lamports,
        used_at: None,
        created_at: Utc::now(),
        transfers: Vec::new(),
    };

    insert_ticket_tx(&mut tx, &ticket).await?;
    insert_processed_signature_tx(&mut tx, event_id, &payment_signature, ticket.id).await?;
    sqlx::query(
        r#"
        UPDATE seats
        SET status = 'reserved', hold_wallet_address = NULL, hold_expires_at = NULL, ticket_id = $3
        WHERE event_id = $1 AND id = $2
        "#,
    )
    .bind(event_id)
    .bind(&seat_id)
    .bind(ticket.id)
    .execute(&mut *tx)
    .await
    .map_err(db_error)?;

    tx.commit().await.map_err(db_error)?;
    Ok(Json(ReserveSeatResponse {
        ticket,
        reserve_instruction: "reserve_seat",
        mint_instruction: "mint_ticket",
        payment_signature: Some(payment_signature),
    }))
}

async fn get_ticket(
    State(state): State<AppState>,
    Path(ticket_id): Path<Uuid>,
) -> ApiResult<Ticket> {
    let row = sqlx::query("SELECT * FROM tickets WHERE id = $1")
        .bind(ticket_id)
        .fetch_optional(&state.db)
        .await
        .map_err(db_error)?
        .ok_or_else(|| not_found("ticket not found"))?;

    Ok(Json(row_to_ticket(&row)?))
}

async fn transfer_ticket(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(ticket_id): Path<Uuid>,
    Json(payload): Json<TransferTicketRequest>,
) -> ApiResult<Ticket> {
    let mut tx = state.db.begin().await.map_err(db_error)?;
    let ticket_row = sqlx::query("SELECT * FROM tickets WHERE id = $1 FOR UPDATE")
        .bind(ticket_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(db_error)?
        .ok_or_else(|| not_found("ticket not found"))?;
    let mut ticket = row_to_ticket(&ticket_row)?;

    if ticket.owner_wallet != auth.wallet_address {
        return Err(bad_request("seller does not own this ticket"));
    }

    let event_row = sqlx::query("SELECT * FROM events WHERE id = $1")
        .bind(ticket.event_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(db_error)?;
    let event = row_to_event(&event_row)?;

    let max_resale = ticket.price_lamports * u64::from(event.resale_cap_bps) / 10_000;
    if payload.resale_price_lamports > max_resale {
        return Err(bad_request("resale price exceeds event cap"));
    }

    let royalty = payload.resale_price_lamports * u64::from(event.royalty_bps) / 10_000;
    ticket.owner_wallet = payload.buyer_wallet.clone();
    ticket.transfers.push(TicketTransfer {
        from_wallet: auth.wallet_address,
        to_wallet: payload.buyer_wallet,
        price_lamports: payload.resale_price_lamports,
        organiser_royalty_lamports: royalty,
        transferred_at: Utc::now(),
    });

    update_ticket_owner_tx(&mut tx, &ticket).await?;
    tx.commit().await.map_err(db_error)?;
    Ok(Json(ticket))
}

async fn verify_ticket(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<VerifyTicketRequest>,
) -> ApiResult<VerifyTicketResponse> {
    let mut tx = state.db.begin().await.map_err(db_error)?;
    let ticket = ticket_for_seat_tx(&mut tx, payload.event_id, &payload.seat_id).await?;

    if ticket.owner_wallet != auth.wallet_address {
        return Ok(Json(VerifyTicketResponse {
            valid: false,
            reason: "wallet does not own this ticket".into(),
            ticket: Some(ticket),
        }));
    }

    if ticket.used_at.is_some() {
        return Ok(Json(VerifyTicketResponse {
            valid: false,
            reason: "ticket was already used".into(),
            ticket: Some(ticket),
        }));
    }

    let mut ticket = ticket;
    if payload.mark_used.unwrap_or(true) {
        let used_at = Utc::now();
        ticket.used_at = Some(used_at);
        sqlx::query("UPDATE tickets SET used_at = $2 WHERE id = $1")
            .bind(ticket.id)
            .bind(used_at)
            .execute(&mut *tx)
            .await
            .map_err(db_error)?;
        sqlx::query("UPDATE seats SET status = 'used' WHERE event_id = $1 AND id = $2")
            .bind(payload.event_id)
            .bind(&payload.seat_id)
            .execute(&mut *tx)
            .await
            .map_err(db_error)?;
    }

    tx.commit().await.map_err(db_error)?;
    Ok(Json(VerifyTicketResponse {
        valid: true,
        reason: "ticket ownership verified".into(),
        ticket: Some(ticket),
    }))
}

async fn create_voice_confirmation(
    Json(payload): Json<VoiceConfirmationRequest>,
) -> Result<Response, ApiError> {
    let api_key = std::env::var("ELEVENLABS_API_KEY").map_err(|_| {
        bad_request("ElevenLabs is not configured. Set ELEVENLABS_API_KEY on the backend.")
    })?;
    let voice_id =
        std::env::var("ELEVENLABS_VOICE_ID").unwrap_or_else(|_| "21m00Tcm4TlvDq8ikWAM".into());
    let ticket_ref = payload
        .ticket_id
        .map(|id| format!(" Ticket reference {id}."))
        .unwrap_or_default();
    let email_line = payload
        .email
        .filter(|email| !email.trim().is_empty())
        .map(|email| format!(" A receipt was linked to {email}."))
        .unwrap_or_default();
    let message = format!(
        "Your {} ticket for {} is confirmed. The seat is now reserved on Solana Devnet and recorded in the Web3 Tickets backend.{}{}",
        payload.event_name, payload.seat_label, ticket_ref, email_line
    );
    let tts_request = ElevenLabsTextToSpeechRequest {
        text: message,
        model_id: "eleven_multilingual_v2",
        voice_settings: ElevenLabsVoiceSettings {
            stability: 0.45,
            similarity_boost: 0.75,
        },
    };
    let endpoint = format!("https://api.elevenlabs.io/v1/text-to-speech/{voice_id}");
    let response = reqwest::Client::new()
        .post(endpoint)
        .header("xi-api-key", api_key)
        .header(header::ACCEPT, "audio/mpeg")
        .json(&tts_request)
        .send()
        .await
        .map_err(elevenlabs_error)?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(bad_request(&format!(
            "ElevenLabs request failed with status {status}: {}",
            body.chars().take(180).collect::<String>()
        )));
    }

    let audio = response.bytes().await.map_err(elevenlabs_error)?;
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "audio/mpeg")
        .body(Body::from(audio))
        .map_err(|error| bad_request(&format!("voice response build failed: {error}")))
}

async fn insert_event(db: &PgPool, event: &Event) -> Result<(), ApiError> {
    sqlx::query(
        r#"
        INSERT INTO events (
            id, name, venue, chain, price_lamports, sale_start, per_wallet_limit,
            resale_cap_bps, royalty_bps, created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        "#,
    )
    .bind(event.id)
    .bind(&event.name)
    .bind(&event.venue)
    .bind(&event.chain)
    .bind(event.price_lamports as i64)
    .bind(event.sale_start)
    .bind(i32::from(event.per_wallet_limit))
    .bind(i32::from(event.resale_cap_bps))
    .bind(i32::from(event.royalty_bps))
    .bind(event.created_at)
    .execute(db)
    .await
    .map_err(db_error)?;

    Ok(())
}

async fn insert_seats(db: &PgPool, event_id: Uuid, seats: &[Seat]) -> Result<(), ApiError> {
    // Insert in chunks to avoid 90,000 one-row round trips while keeping the
    // schema simple and readable for handoff.
    for chunk in seats.chunks(5_000) {
        let mut builder = QueryBuilder::<Postgres>::new(
            "INSERT INTO seats (event_id, id, row_label, number, status) ",
        );
        builder.push_values(chunk, |mut row, seat| {
            row.push_bind(event_id)
                .push_bind(&seat.id)
                .push_bind(&seat.row)
                .push_bind(i32::from(seat.number))
                .push_bind(status_str(&seat.status));
        });
        builder.push(" ON CONFLICT (event_id, id) DO NOTHING");
        builder.build().execute(db).await.map_err(db_error)?;
    }
    Ok(())
}

async fn insert_ticket_tx(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    ticket: &Ticket,
) -> Result<(), ApiError> {
    sqlx::query(
        r#"
        INSERT INTO tickets (
            id, event_id, seat_id, owner_wallet, onchain_ticket_address,
            payment_signature, mint_address, metadata_uri, price_lamports,
            used_at, created_at, transfers
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        "#,
    )
    .bind(ticket.id)
    .bind(ticket.event_id)
    .bind(&ticket.seat_id)
    .bind(&ticket.owner_wallet)
    .bind(&ticket.onchain_ticket_address)
    .bind(&ticket.payment_signature)
    .bind(&ticket.mint_address)
    .bind(&ticket.metadata_uri)
    .bind(ticket.price_lamports as i64)
    .bind(ticket.used_at)
    .bind(ticket.created_at)
    .bind(sqlx::types::Json(&ticket.transfers))
    .execute(&mut **tx)
    .await
    .map_err(db_error)?;

    Ok(())
}

async fn upsert_user_for_wallet(db: &PgPool, wallet_address: &str) -> Result<User, ApiError> {
    let row = sqlx::query(
        r#"
        INSERT INTO users (id, wallet_address, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (wallet_address) DO UPDATE
        SET wallet_address = EXCLUDED.wallet_address
        RETURNING *
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(wallet_address)
    .bind(Utc::now())
    .fetch_one(db)
    .await
    .map_err(db_error)?;
    row_to_user(&row)
}

async fn insert_processed_signature_tx(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    event_id: Uuid,
    payment_signature: &str,
    ticket_id: Uuid,
) -> Result<(), ApiError> {
    sqlx::query(
        r#"
        INSERT INTO processed_signatures (event_id, payment_signature, ticket_id, processed_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (event_id, payment_signature) DO NOTHING
        "#,
    )
    .bind(event_id)
    .bind(payment_signature)
    .bind(ticket_id)
    .bind(Utc::now())
    .execute(&mut **tx)
    .await
    .map_err(db_error)?;

    Ok(())
}

async fn update_ticket_owner_tx(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    ticket: &Ticket,
) -> Result<(), ApiError> {
    sqlx::query("UPDATE tickets SET owner_wallet = $2, transfers = $3 WHERE id = $1")
        .bind(ticket.id)
        .bind(&ticket.owner_wallet)
        .bind(sqlx::types::Json(&ticket.transfers))
        .execute(&mut **tx)
        .await
        .map_err(db_error)?;
    Ok(())
}

async fn ticket_for_seat_tx(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    event_id: Uuid,
    seat_id: &str,
) -> Result<Ticket, ApiError> {
    let row = sqlx::query("SELECT * FROM tickets WHERE event_id = $1 AND seat_id = $2")
        .bind(event_id)
        .bind(seat_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(db_error)?
        .ok_or_else(|| not_found("ticket for seat not found"))?;
    row_to_ticket(&row)
}

async fn ticket_for_signature_tx(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    event_id: Uuid,
    payment_signature: &str,
) -> Result<Option<Ticket>, ApiError> {
    let row = sqlx::query(
        r#"
        SELECT tickets.*
        FROM processed_signatures
        JOIN tickets ON tickets.id = processed_signatures.ticket_id
        WHERE processed_signatures.event_id = $1
          AND processed_signatures.payment_signature = $2
        "#,
    )
    .bind(event_id)
    .bind(payment_signature)
    .fetch_optional(&mut **tx)
    .await
    .map_err(db_error)?;

    row.map(|row| row_to_ticket(&row)).transpose()
}

async fn enforce_wallet_limit_tx(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    event_id: Uuid,
    wallet_address: &str,
    per_wallet_limit: u16,
) -> Result<(), ApiError> {
    let owned: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM tickets WHERE event_id = $1 AND owner_wallet = $2",
    )
    .bind(event_id)
    .bind(wallet_address)
    .fetch_one(&mut **tx)
    .await
    .map_err(db_error)?;

    if owned >= i64::from(per_wallet_limit) {
        return Err(bad_request("wallet purchase limit reached"));
    }
    Ok(())
}

async fn enforce_hold_rate_limit(
    db: &PgPool,
    event_id: Uuid,
    seat_id: &str,
    wallet_address: &str,
) -> Result<(), ApiError> {
    let now = Utc::now();
    sqlx::query("DELETE FROM hold_attempts WHERE attempted_at < $1")
        .bind(now - Duration::minutes(10))
        .execute(db)
        .await
        .map_err(db_error)?;

    let recent_attempts: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM hold_attempts WHERE wallet_address = $1 AND attempted_at >= $2",
    )
    .bind(wallet_address)
    .bind(now - Duration::minutes(1))
    .fetch_one(db)
    .await
    .map_err(db_error)?;

    if recent_attempts >= 12 {
        return Err(too_many_requests(
            "too many seat hold attempts; wait a minute and try again",
        ));
    }

    sqlx::query(
        r#"
        INSERT INTO hold_attempts (id, event_id, seat_id, wallet_address, attempted_at)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(event_id)
    .bind(seat_id)
    .bind(wallet_address)
    .bind(now)
    .execute(db)
    .await
    .map_err(db_error)?;

    Ok(())
}

async fn expire_holds(db: &PgPool, event_id: Uuid) -> Result<(), ApiError> {
    sqlx::query(
        r#"
        UPDATE seats
        SET status = 'available', hold_wallet_address = NULL, hold_expires_at = NULL
        WHERE event_id = $1 AND status = 'held' AND hold_expires_at <= NOW()
        "#,
    )
    .bind(event_id)
    .execute(db)
    .await
    .map_err(db_error)?;
    Ok(())
}

async fn seed_demo_event(db: &PgPool) -> Result<(), ApiError> {
    let existing: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM events WHERE name = $1 AND venue = $2 LIMIT 1")
            .bind("J. Cole")
            .bind("FNB Stadium, Johannesburg, Gauteng, South Africa")
            .fetch_optional(db)
            .await
            .map_err(db_error)?;

    if existing.is_some() {
        return Ok(());
    }

    let event = Event {
        id: Uuid::new_v4(),
        name: "J. Cole".into(),
        venue: "FNB Stadium, Johannesburg, Gauteng, South Africa".into(),
        chain: "solana-devnet".into(),
        price_lamports: 935_000_000,
        sale_start: Utc::now(),
        per_wallet_limit: 2,
        resale_cap_bps: 1_200,
        royalty_bps: 500,
        created_at: Utc::now(),
    };

    insert_event(db, &event).await?;
    insert_seats(db, event.id, &generate_jcole_seats()).await?;
    Ok(())
}

fn generate_jcole_seats() -> Vec<Seat> {
    let mut seats = Vec::new();
    let sections = fnb_stadium_sections();
    let total_capacity: u32 = sections.iter().map(|section| section.capacity).sum();
    assert_eq!(
        total_capacity, 90_000,
        "FNB demo inventory must equal 90,000 seats"
    );

    for section in sections {
        for index in 1..=section.capacity {
            let (id, row, number) = section_alias(section.id, index).unwrap_or_else(|| {
                (
                    format!("{}-{index}", section.id),
                    section.id.to_string(),
                    index as u16,
                )
            });
            seats.push(Seat {
                id,
                row,
                number,
                status: SeatStatus::Available,
                hold: None,
                ticket_id: None,
            });
        }
    }
    seats
}

fn uses_fnb_stadium_inventory(event_name: &str) -> bool {
    matches!(event_name, "J. Cole" | "Scorpion Kings Live")
}

fn row_to_user(row: &PgRow) -> Result<User, ApiError> {
    Ok(User {
        id: row.try_get("id").map_err(db_error)?,
        wallet_address: row.try_get("wallet_address").map_err(db_error)?,
        email: row.try_get("email").map_err(db_error)?,
        email_verified: row.try_get("email_verified").map_err(db_error)?,
        created_at: row.try_get("created_at").map_err(db_error)?,
    })
}

struct VenueSection {
    id: &'static str,
    capacity: u32,
}

fn fnb_stadium_sections() -> Vec<VenueSection> {
    let mut sections = vec![
        VenueSection {
            id: "GENERAL-ADMISSION",
            capacity: 18_500,
        },
        VenueSection {
            id: "FRONT-ZONE-NORTH",
            capacity: 12_000,
        },
        VenueSection {
            id: "FRONT-ZONE-SOUTH",
            capacity: 12_000,
        },
        VenueSection {
            id: "VIP",
            capacity: 1_000,
        },
    ];

    for id in [101, 102, 103, 104, 105] {
        sections.push(leaked_section(id, 650));
    }
    for id in 122..=149 {
        sections.push(leaked_section(id, 650));
    }
    for id in 216..=234 {
        sections.push(leaked_section(id, 450));
    }
    for id in 500..=503 {
        sections.push(leaked_section(id, 550));
    }
    for id in 520..=545 {
        sections.push(leaked_section(id, 550));
    }
    sections
}

fn leaked_section(id: i32, capacity: u32) -> VenueSection {
    VenueSection {
        id: Box::leak(id.to_string().into_boxed_str()),
        capacity,
    }
}

fn section_alias(section_id: &str, index: u32) -> Option<(String, String, u16)> {
    let alias = match (section_id, index) {
        ("GENERAL-ADMISSION", 1) => Some(("SCORPION-RING-STANDING-1", "Standing", 1)),
        ("FRONT-ZONE-NORTH", 1) => Some(("SCORPION-PIT-STANDING-1", "Standing", 1)),
        ("VIP", 1) => Some(("SCORPION-PIT-SEATED-1", "Seated", 1)),
        ("538", 1) => Some(("538-G", "G", 538)),
        ("531", 1) => Some(("531-X", "X", 531)),
        ("545", 1) => Some(("545-ROW", "ROW", 545)),
        ("535", 1) => Some(("535-ROW", "ROW", 535)),
        ("536", 1) => Some(("536-ROW", "ROW", 536)),
        _ => None,
    }?;
    Some((alias.0.to_string(), alias.1.to_string(), alias.2))
}

fn generate_seats(rows: u16, seats_per_row: u16) -> Vec<Seat> {
    let mut seats = Vec::new();
    for row_index in 0..rows {
        let row = ((b'A' + (row_index as u8)) as char).to_string();
        for number in 1..=seats_per_row {
            seats.push(Seat {
                id: format!("{row}{number}"),
                row: row.clone(),
                number,
                status: SeatStatus::Available,
                hold: None,
                ticket_id: None,
            });
        }
    }
    seats
}

fn row_to_event(row: &PgRow) -> Result<Event, ApiError> {
    Ok(Event {
        id: row.try_get("id").map_err(db_error)?,
        name: row.try_get("name").map_err(db_error)?,
        venue: row.try_get("venue").map_err(db_error)?,
        chain: row.try_get("chain").map_err(db_error)?,
        price_lamports: i64_to_u64(row.try_get("price_lamports").map_err(db_error)?)?,
        sale_start: row.try_get("sale_start").map_err(db_error)?,
        per_wallet_limit: i32_to_u16(row.try_get("per_wallet_limit").map_err(db_error)?)?,
        resale_cap_bps: i32_to_u16(row.try_get("resale_cap_bps").map_err(db_error)?)?,
        royalty_bps: i32_to_u16(row.try_get("royalty_bps").map_err(db_error)?)?,
        created_at: row.try_get("created_at").map_err(db_error)?,
    })
}

fn row_to_seat(row: &PgRow) -> Result<Seat, ApiError> {
    let hold_wallet_address: Option<String> =
        row.try_get("hold_wallet_address").map_err(db_error)?;
    let hold_expires_at: Option<DateTime<Utc>> =
        row.try_get("hold_expires_at").map_err(db_error)?;
    Ok(Seat {
        id: row.try_get("id").map_err(db_error)?,
        row: row.try_get("row_label").map_err(db_error)?,
        number: i32_to_u16(row.try_get("number").map_err(db_error)?)?,
        status: parse_status(row.try_get::<String, _>("status").map_err(db_error)?)?,
        hold: hold_wallet_address
            .zip(hold_expires_at)
            .map(|(wallet_address, expires_at)| SeatHold {
                wallet_address,
                expires_at,
            }),
        ticket_id: row.try_get("ticket_id").map_err(db_error)?,
    })
}

fn row_to_ticket(row: &PgRow) -> Result<Ticket, ApiError> {
    let transfers_json: sqlx::types::Json<Vec<TicketTransfer>> =
        row.try_get("transfers").map_err(db_error)?;
    Ok(Ticket {
        id: row.try_get("id").map_err(db_error)?,
        event_id: row.try_get("event_id").map_err(db_error)?,
        seat_id: row.try_get("seat_id").map_err(db_error)?,
        owner_wallet: row.try_get("owner_wallet").map_err(db_error)?,
        onchain_ticket_address: row.try_get("onchain_ticket_address").map_err(db_error)?,
        payment_signature: row.try_get("payment_signature").map_err(db_error)?,
        mint_address: row.try_get("mint_address").map_err(db_error)?,
        metadata_uri: row.try_get("metadata_uri").map_err(db_error)?,
        price_lamports: i64_to_u64(row.try_get("price_lamports").map_err(db_error)?)?,
        used_at: row.try_get("used_at").map_err(db_error)?,
        created_at: row.try_get("created_at").map_err(db_error)?,
        transfers: transfers_json.0,
    })
}

fn parse_status(status: String) -> Result<SeatStatus, ApiError> {
    match status.as_str() {
        "available" => Ok(SeatStatus::Available),
        "held" => Ok(SeatStatus::Held),
        "reserved" => Ok(SeatStatus::Reserved),
        "used" => Ok(SeatStatus::Used),
        _ => Err(bad_request("unknown seat status in database")),
    }
}

fn status_str(status: &SeatStatus) -> &'static str {
    match status {
        SeatStatus::Available => "available",
        SeatStatus::Held => "held",
        SeatStatus::Reserved => "reserved",
        SeatStatus::Used => "used",
    }
}

fn require_non_empty(field: &str, value: &str) -> Result<(), ApiError> {
    if value.trim().is_empty() {
        return Err(bad_request(&format!("{field} is required")));
    }
    Ok(())
}

fn required_string(field: &str, value: Option<&str>) -> Result<String, ApiError> {
    let value = value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| bad_request(&format!("{field} is required")))?;
    Ok(value.to_string())
}

fn validate_wallet_address(wallet_address: &str) -> Result<(), ApiError> {
    let bytes = bs58::decode(wallet_address)
        .into_vec()
        .map_err(|_| bad_request("wallet_address must be a base58 Solana public key"))?;
    if bytes.len() != 32 {
        return Err(bad_request(
            "wallet_address must be a 32-byte Solana public key",
        ));
    }
    Ok(())
}

fn random_token(len: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(len)
        .map(char::from)
        .collect()
}

fn wallet_nonce_key(wallet_address: &str, nonce_id: &str) -> String {
    format!("auth_nonce:{wallet_address}:{nonce_id}")
}

fn wallet_auth_message(wallet_address: &str, nonce: &str, expires_at: DateTime<Utc>) -> String {
    format!(
        "Web3 Tickets wants you to sign in with your Solana wallet.\n\nWallet: {wallet_address}\nNonce: {nonce}\nExpires At: {}",
        expires_at.to_rfc3339()
    )
}

fn verify_wallet_signature(
    wallet_address: &str,
    message: &str,
    signature: &str,
) -> Result<(), ApiError> {
    let public_key_bytes = bs58::decode(wallet_address)
        .into_vec()
        .map_err(|_| unauthorized("wallet public key is invalid"))?;
    let public_key_bytes: [u8; 32] = public_key_bytes
        .try_into()
        .map_err(|_| unauthorized("wallet public key must be 32 bytes"))?;
    let signature_bytes = bs58::decode(signature)
        .into_vec()
        .or_else(|_| general_purpose::STANDARD.decode(signature))
        .map_err(|_| unauthorized("wallet signature encoding is invalid"))?;
    let signature = Signature::try_from(signature_bytes.as_slice())
        .map_err(|_| unauthorized("wallet signature must be 64 bytes"))?;
    let verifying_key = VerifyingKey::from_bytes(&public_key_bytes)
        .map_err(|_| unauthorized("wallet public key is invalid"))?;
    verifying_key
        .verify(message.as_bytes(), &signature)
        .map_err(|_| unauthorized("wallet signature is invalid"))
}

fn sign_jwt(state: &AppState, user: &User, expires_at: DateTime<Utc>) -> Result<String, ApiError> {
    let claims = Claims {
        sub: user.wallet_address.clone(),
        user_id: user.id,
        exp: expires_at.timestamp() as usize,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.jwt_secret.as_ref()),
    )
    .map_err(|error| bad_request(&format!("jwt signing failed: {error}")))
}

fn i64_to_u64(value: i64) -> Result<u64, ApiError> {
    u64::try_from(value).map_err(|_| bad_request("database value is negative"))
}

fn i32_to_u16(value: i32) -> Result<u16, ApiError> {
    u16::try_from(value).map_err(|_| bad_request("database value is out of range"))
}

fn db_error(error: sqlx::Error) -> ApiError {
    ApiError {
        status: StatusCode::BAD_REQUEST,
        error: format!("database error: {error}"),
    }
}

fn elevenlabs_error(error: reqwest::Error) -> ApiError {
    ApiError {
        status: StatusCode::BAD_REQUEST,
        error: format!("ElevenLabs request failed: {error}"),
    }
}

fn redis_error(error: redis::RedisError) -> ApiError {
    ApiError {
        status: StatusCode::BAD_REQUEST,
        error: format!("redis error: {error}"),
    }
}

fn bad_request(message: &str) -> ApiError {
    ApiError {
        status: StatusCode::BAD_REQUEST,
        error: message.into(),
    }
}

fn unauthorized(message: &str) -> ApiError {
    ApiError {
        status: StatusCode::UNAUTHORIZED,
        error: message.into(),
    }
}

fn conflict(message: &str) -> ApiError {
    ApiError {
        status: StatusCode::CONFLICT,
        error: message.into(),
    }
}

fn not_found(message: &str) -> ApiError {
    ApiError {
        status: StatusCode::NOT_FOUND,
        error: message.into(),
    }
}

fn too_many_requests(message: &str) -> ApiError {
    ApiError {
        status: StatusCode::TOO_MANY_REQUESTS,
        error: message.into(),
    }
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}
