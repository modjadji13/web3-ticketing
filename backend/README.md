# Web3 Tickets Backend

Rust/Axum backend for the Web3 ticketing architecture, backed by PostgreSQL.

It models the middleware and API boundary from the architecture document:

- event deployment metadata
- live seat state
- 5-minute seat holds
- `reserve_seat` purchase flow
- `mint_ticket` ticket record creation
- capped resale via `transfer_ticket`
- door validation via `verify_ticket`

The backend persists event metadata, 90,000-seat venue inventory, seat holds,
reservations, tickets, transfers, and scan state in PostgreSQL. Solana, IPFS,
and LI.FI data are currently stored as references on the ticket record.

## Run

Start PostgreSQL from the repo root:

```powershell
docker compose up -d postgres
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
```

## Next Integration Points

- Move schema creation into versioned SQL migrations.
- Replace database-backed seat holds with Redis TTL keys if high-volume lock
  throughput becomes necessary.
- Emit seat-state broadcasts through WebSocket channels.
- Replace ticket mint placeholders with Solana Anchor + Metaplex Bubblegum calls.
- Add LI.FI quote/build-transaction endpoints for cross-chain checkout.
