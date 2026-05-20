# Web3 Tickets Backend

Rust/Axum backend for the Web3 ticketing architecture, backed by PostgreSQL
for durable ticket state and Redis for short-lived checkout seat holds.

It models the middleware and API boundary from the architecture document:

- event deployment metadata
- live seat state
- 10-minute Redis seat holds
- `reserve_seat` purchase flow
- `mint_ticket` ticket record creation
- capped resale via `transfer_ticket`
- door validation via `verify_ticket`

The backend persists event metadata, 90,000-seat venue inventory, reservations,
tickets, transfers, and scan state in PostgreSQL. Temporary checkout holds are
stored as Redis TTL keys and overlaid onto seat listings. Solana, IPFS, and
LI.FI data are currently stored as references on the ticket record.

## Run

Start PostgreSQL and Redis from the repo root:

```powershell
docker compose up -d postgres redis
```

Then run the backend:

```powershell
cargo run
```

Server:

```text
http://127.0.0.1:8090
```

Set `PORT` to use a different local port. Set `DATABASE_URL` to use a different
PostgreSQL database. The default is:

```text
postgres://web3_tickets:web3_tickets@127.0.0.1:5433/web3_tickets
```

Set `REDIS_URL` to use a different Redis instance. The default is:

```text
redis://127.0.0.1:6379
```

Set `ELEVENLABS_API_KEY` to enable voice confirmations after checkout. You can
also set `ELEVENLABS_VOICE_ID`; otherwise the backend uses the demo default
voice id.

## Endpoints

```text
GET  /health
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

## Next Integration Points

- Move schema creation into versioned SQL migrations.
- Add Kafka outbox events after confirmed reservations.
- Emit seat-state broadcasts through WebSocket channels.
- Replace ticket mint placeholders with Solana Anchor + Metaplex Bubblegum calls.
- Add LI.FI quote/build-transaction endpoints for cross-chain checkout.
