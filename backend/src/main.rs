use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{Arc, RwLock},
};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    store: Arc<RwLock<Store>>,
}

#[derive(Default)]
struct Store {
    events: HashMap<Uuid, Event>,
    seats: HashMap<Uuid, HashMap<String, Seat>>,
    tickets: HashMap<Uuid, Ticket>,
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
    wallet_address: String,
    expires_at: DateTime<Utc>,
}

#[derive(Clone, Serialize)]
struct Ticket {
    id: Uuid,
    event_id: Uuid,
    seat_id: String,
    owner_wallet: String,
    mint_address: String,
    metadata_uri: String,
    price_lamports: u64,
    used_at: Option<DateTime<Utc>>,
    created_at: DateTime<Utc>,
    transfers: Vec<TicketTransfer>,
}

#[derive(Clone, Serialize)]
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
struct HoldSeatRequest {
    wallet_address: String,
}

#[derive(Deserialize)]
struct ReserveSeatRequest {
    wallet_address: String,
    payment_signature: Option<String>,
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
    seller_wallet: String,
    buyer_wallet: String,
    resale_price_lamports: u64,
}

#[derive(Deserialize)]
struct VerifyTicketRequest {
    event_id: Uuid,
    seat_id: String,
    wallet_address: String,
    mark_used: Option<bool>,
}

#[derive(Serialize)]
struct VerifyTicketResponse {
    valid: bool,
    reason: String,
    ticket: Option<Ticket>,
}

#[derive(Serialize)]
struct ApiError {
    error: String,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (StatusCode::BAD_REQUEST, Json(self)).into_response()
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

    let state = AppState {
        store: Arc::new(RwLock::new(Store::default())),
    };

    seed_demo_event(&state);

    let app = Router::new()
        .route("/health", get(health))
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

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "web3-tickets-backend",
    })
}

async fn list_events(State(state): State<AppState>) -> ApiResult<Vec<Event>> {
    let store = read_store(&state)?;
    Ok(Json(store.events.values().cloned().collect()))
}

async fn create_event(
    State(state): State<AppState>,
    Json(payload): Json<CreateEventRequest>,
) -> ApiResult<Event> {
    let mut store = write_store(&state)?;
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

    let seats = generate_seats(
        payload.rows.unwrap_or(8),
        payload.seats_per_row.unwrap_or(12),
    );
    store.seats.insert(event.id, seats);
    store.events.insert(event.id, event.clone());

    Ok(Json(event))
}

async fn list_seats(
    State(state): State<AppState>,
    Path(event_id): Path<Uuid>,
) -> ApiResult<Vec<Seat>> {
    let mut store = write_store(&state)?;
    expire_holds(&mut store, event_id);

    let seats = store
        .seats
        .get(&event_id)
        .ok_or_else(|| not_found("event seats not found"))?
        .values()
        .cloned()
        .collect();

    Ok(Json(seats))
}

async fn hold_seat(
    State(state): State<AppState>,
    Path((event_id, seat_id)): Path<(Uuid, String)>,
    Json(payload): Json<HoldSeatRequest>,
) -> ApiResult<Seat> {
    let mut store = write_store(&state)?;
    expire_holds(&mut store, event_id);

    let seat = get_seat_mut(&mut store, event_id, &seat_id)?;
    if seat.status != SeatStatus::Available {
        return Err(bad_request("seat is not available"));
    }

    seat.status = SeatStatus::Held;
    seat.hold = Some(SeatHold {
        wallet_address: payload.wallet_address,
        expires_at: Utc::now() + Duration::minutes(5),
    });

    Ok(Json(seat.clone()))
}

async fn reserve_seat(
    State(state): State<AppState>,
    Path((event_id, seat_id)): Path<(Uuid, String)>,
    Json(payload): Json<ReserveSeatRequest>,
) -> ApiResult<ReserveSeatResponse> {
    let mut store = write_store(&state)?;
    expire_holds(&mut store, event_id);

    let event = store
        .events
        .get(&event_id)
        .cloned()
        .ok_or_else(|| not_found("event not found"))?;

    enforce_wallet_limit(
        &store,
        event_id,
        &payload.wallet_address,
        event.per_wallet_limit,
    )?;

    {
        let seat = get_seat_mut(&mut store, event_id, &seat_id)?;
        match (&seat.status, &seat.hold) {
            (SeatStatus::Available, _) => {}
            (SeatStatus::Held, Some(hold)) if hold.wallet_address == payload.wallet_address => {}
            (SeatStatus::Held, _) => return Err(bad_request("seat is held by another wallet")),
            _ => return Err(bad_request("seat is not available")),
        }
    }

    let ticket = Ticket {
        id: Uuid::new_v4(),
        event_id,
        seat_id: seat_id.clone(),
        owner_wallet: payload.wallet_address,
        mint_address: format!("cNFT-{}", Uuid::new_v4()),
        metadata_uri: payload
            .metadata_uri
            .unwrap_or_else(|| "ipfs://pending-ticket-metadata".into()),
        price_lamports: event.price_lamports,
        used_at: None,
        created_at: Utc::now(),
        transfers: Vec::new(),
    };

    let seat = get_seat_mut(&mut store, event_id, &seat_id)?;
    seat.status = SeatStatus::Reserved;
    seat.hold = None;
    seat.ticket_id = Some(ticket.id);

    store.tickets.insert(ticket.id, ticket.clone());

    Ok(Json(ReserveSeatResponse {
        ticket,
        reserve_instruction: "reserve_seat",
        mint_instruction: "mint_ticket",
        payment_signature: payload.payment_signature,
    }))
}

async fn get_ticket(
    State(state): State<AppState>,
    Path(ticket_id): Path<Uuid>,
) -> ApiResult<Ticket> {
    let store = read_store(&state)?;
    let ticket = store
        .tickets
        .get(&ticket_id)
        .cloned()
        .ok_or_else(|| not_found("ticket not found"))?;

    Ok(Json(ticket))
}

async fn transfer_ticket(
    State(state): State<AppState>,
    Path(ticket_id): Path<Uuid>,
    Json(payload): Json<TransferTicketRequest>,
) -> ApiResult<Ticket> {
    let mut store = write_store(&state)?;
    let ticket_snapshot = store
        .tickets
        .get(&ticket_id)
        .cloned()
        .ok_or_else(|| not_found("ticket not found"))?;

    if ticket_snapshot.owner_wallet != payload.seller_wallet {
        return Err(bad_request("seller does not own this ticket"));
    }

    let event = store
        .events
        .get(&ticket_snapshot.event_id)
        .ok_or_else(|| not_found("event not found"))?;
    let max_resale = ticket_snapshot.price_lamports * u64::from(event.resale_cap_bps) / 10_000;
    if payload.resale_price_lamports > max_resale {
        return Err(bad_request("resale price exceeds event cap"));
    }

    let royalty = payload.resale_price_lamports * u64::from(event.royalty_bps) / 10_000;
    let ticket = store
        .tickets
        .get_mut(&ticket_id)
        .ok_or_else(|| not_found("ticket not found"))?;

    ticket.owner_wallet = payload.buyer_wallet.clone();
    ticket.transfers.push(TicketTransfer {
        from_wallet: payload.seller_wallet,
        to_wallet: payload.buyer_wallet,
        price_lamports: payload.resale_price_lamports,
        organiser_royalty_lamports: royalty,
        transferred_at: Utc::now(),
    });

    Ok(Json(ticket.clone()))
}

async fn verify_ticket(
    State(state): State<AppState>,
    Json(payload): Json<VerifyTicketRequest>,
) -> ApiResult<VerifyTicketResponse> {
    let mut store = write_store(&state)?;
    let ticket_id = store
        .seats
        .get(&payload.event_id)
        .and_then(|seats| seats.get(&payload.seat_id))
        .and_then(|seat| seat.ticket_id)
        .ok_or_else(|| not_found("ticket for seat not found"))?;

    let mut ticket = store
        .tickets
        .get(&ticket_id)
        .cloned()
        .ok_or_else(|| not_found("ticket not found"))?;

    if ticket.owner_wallet != payload.wallet_address {
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

    if payload.mark_used.unwrap_or(true) {
        let used_at = Utc::now();
        ticket.used_at = Some(used_at);
        store.tickets.insert(ticket.id, ticket.clone());

        if let Some(seats) = store.seats.get_mut(&payload.event_id) {
            if let Some(seat) = seats.get_mut(&payload.seat_id) {
                seat.status = SeatStatus::Used;
            }
        }
    }

    Ok(Json(VerifyTicketResponse {
        valid: true,
        reason: "ticket ownership verified".into(),
        ticket: Some(ticket),
    }))
}

fn seed_demo_event(state: &AppState) {
    let mut store = state.store.write().expect("seed store lock");
    let event = Event {
        id: Uuid::new_v4(),
        name: "Chainwave Summit".into(),
        venue: "Cape Town ICC".into(),
        chain: "solana-devnet".into(),
        price_lamports: 32_000_000,
        sale_start: Utc::now(),
        per_wallet_limit: 4,
        resale_cap_bps: 12_000,
        royalty_bps: 500,
        created_at: Utc::now(),
    };

    store.seats.insert(event.id, generate_seats(10, 16));
    store.events.insert(event.id, event);
}

fn generate_seats(rows: u16, seats_per_row: u16) -> HashMap<String, Seat> {
    let mut seats = HashMap::new();
    for row_index in 0..rows {
        let row = ((b'A' + (row_index as u8)) as char).to_string();
        for number in 1..=seats_per_row {
            let id = format!("{row}{number}");
            seats.insert(
                id.clone(),
                Seat {
                    id,
                    row: row.clone(),
                    number,
                    status: SeatStatus::Available,
                    hold: None,
                    ticket_id: None,
                },
            );
        }
    }
    seats
}

fn expire_holds(store: &mut Store, event_id: Uuid) {
    let now = Utc::now();
    if let Some(seats) = store.seats.get_mut(&event_id) {
        for seat in seats.values_mut() {
            if matches!(&seat.hold, Some(hold) if hold.expires_at <= now) {
                seat.hold = None;
                if seat.status == SeatStatus::Held {
                    seat.status = SeatStatus::Available;
                }
            }
        }
    }
}

fn enforce_wallet_limit(
    store: &Store,
    event_id: Uuid,
    wallet_address: &str,
    per_wallet_limit: u16,
) -> Result<(), ApiError> {
    let owned = store
        .tickets
        .values()
        .filter(|ticket| ticket.event_id == event_id && ticket.owner_wallet == wallet_address)
        .count();

    if owned >= usize::from(per_wallet_limit) {
        return Err(bad_request("wallet purchase limit reached"));
    }

    Ok(())
}

fn get_seat_mut<'a>(
    store: &'a mut Store,
    event_id: Uuid,
    seat_id: &str,
) -> Result<&'a mut Seat, ApiError> {
    store
        .seats
        .get_mut(&event_id)
        .ok_or_else(|| not_found("event seats not found"))?
        .get_mut(seat_id)
        .ok_or_else(|| not_found("seat not found"))
}

fn read_store(state: &AppState) -> Result<std::sync::RwLockReadGuard<'_, Store>, ApiError> {
    state
        .store
        .read()
        .map_err(|_| bad_request("store lock poisoned"))
}

fn write_store(state: &AppState) -> Result<std::sync::RwLockWriteGuard<'_, Store>, ApiError> {
    state
        .store
        .write()
        .map_err(|_| bad_request("store lock poisoned"))
}

fn bad_request(message: &str) -> ApiError {
    ApiError {
        error: message.into(),
    }
}

fn not_found(message: &str) -> ApiError {
    ApiError {
        error: message.into(),
    }
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}
