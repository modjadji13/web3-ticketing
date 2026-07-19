# Web3 Ticketing

Blockchain ticketing for large-venue events. Seats are held and reserved through a Rust API,
tickets are anchored to a Solana program, and checkout confirms the purchase with a
generated voice message.

- **Frontend** — React 18 + Vite, Phantom wallet connection on Solana Devnet
- **Backend** — Rust/Axum API with PostgreSQL persistence (90,000-seat venue inventory) and Redis-backed seat holds
- **On-chain** — Anchor program (`initialize_event`, `reserve_seat`, `transfer_ticket`, `verify_ticket`)
- **Extras** — ElevenLabs voice confirmation, Google Sign-In, an MCP server for the local API

## Requirements

- Node.js 20+
- Rust (stable) and Cargo
- Docker (for PostgreSQL and Redis)
- Solana CLI + Anchor CLI — only if you build or deploy the on-chain program
- Phantom wallet set to Devnet

## Quick start

**1. Configure environment**

```powershell
Copy-Item .env.example .env.local
```

**2. Start PostgreSQL and Redis**

```powershell
docker compose up -d postgres redis
```

Both are required — the backend exits on startup if it cannot reach Redis.

**3. Start the backend** — serves `http://127.0.0.1:8090`

```powershell
cd backend
cargo run
```

**4. Start the frontend** — serves `http://127.0.0.1:5173`

```powershell
npm install
npm run dev
```

Fund your Phantom Devnet wallet at <https://faucet.solana.com/> before running a checkout.

## Environment variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | frontend | Google OAuth Web client ID for checkout sign-in |
| `GOOGLE_CLIENT_ID` | backend | Verifies Google ID tokens |
| `DATABASE_URL` | backend | PostgreSQL connection (default port `5433`) |
| `REDIS_URL` | backend | Redis connection for seat holds (default `redis://127.0.0.1:6379`) |
| `JWT_SECRET` | backend | Session signing key, 32+ random bytes |
| `JWT_TTL_SECONDS` | backend | Session lifetime |
| `ELEVENLABS_API_KEY` | backend | Enables voice confirmation; checkout still completes without it |
| `ELEVENLABS_VOICE_ID` | backend | Voice to synthesize with |
| `PORT` | backend | Override the default `8090` |

The ElevenLabs key stays server-side — the browser only receives the returned MP3.

For Google Sign-In, add these authorized JavaScript origins to your OAuth client:

```text
http://127.0.0.1:5173
http://127.0.0.1:5174
http://localhost:5173
http://localhost:5174
```

Restart Vite after editing `.env.local`.

## API

```text
GET  /health
POST /auth/wallet/nonce
POST /auth/wallet/verify
POST /auth/google
GET  /auth/me
GET  /api/events
POST /api/events
GET  /api/events/:event_id/seats
POST /api/events/:event_id/seats/:seat_id/hold
POST /api/events/:event_id/seats/:seat_id/reserve
GET  /api/tickets/:ticket_id
POST /api/tickets/:ticket_id/transfer
POST /api/tickets/verify
POST /api/voice/confirmation
```

Seat holds are stored as Redis keys with a 10-minute TTL and overlaid onto seat listings, so
they expire on their own. Resale through `transfer_ticket` is price-capped.

## On-chain program

The Anchor program lives in [programs/web3_tickets/](programs/web3_tickets/) and targets Devnet
at program ID `35wzuQvuh6PkqoTe8sgZu8hx8cV4sG2G8h89zELaLmKD`.

```powershell
solana config set --url devnet
anchor build
anchor deploy
anchor keys sync
```

## Testing

End-to-end smoke test against a running backend and frontend:

```powershell
npm run test:e2e
```

Override targets with `API_URL` and `FRONTEND_URL`.

## MCP server

An MCP server exposes the local backend to MCP clients with `health`, `list_events`,
`list_seats`, `get_ticket`, and `verify_ticket` tools.

```powershell
npm run mcp
```

See [mcp/README.md](mcp/README.md) for client configuration.

## Project structure

```text
src/                        React frontend (pages, components, services)
backend/                    Rust/Axum API and PostgreSQL persistence
programs/web3_tickets/      Anchor on-chain program
mcp/                        MCP server for the local backend
scripts/                    End-to-end smoke test
docker-compose.yml          Local PostgreSQL and Redis
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Build the frontend for production |
| `npm run preview` | Preview the production build |
| `npm run test:e2e` | Run the end-to-end smoke test |
| `npm run mcp` | Start the MCP server |

## Roadmap

- Move backend schema creation into versioned SQL migrations
- Broadcast live seat state over WebSockets
- Replace ticket mint placeholders with Anchor + Metaplex Bubblegum calls
- Add LI.FI cross-chain checkout quotes
