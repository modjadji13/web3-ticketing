# Web3 Tickets Backend

Rust/Axum backend for the Web3 ticketing architecture.

It models the middleware and API boundary from the architecture document:

- event deployment metadata
- live seat state
- 5-minute seat holds
- `reserve_seat` purchase flow
- `mint_ticket` ticket record creation
- capped resale via `transfer_ticket`
- door validation via `verify_ticket`

The first version uses in-memory state so it can run locally without Redis,
PostgreSQL, Solana, IPFS, or LI.FI credentials. Those integrations can be added
behind the same handlers.

## Run

```powershell
cargo run
```

Server:

```text
http://127.0.0.1:8090
```

Set `PORT` to use a different local port.

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

- Replace in-memory seat holds with Redis TTL keys.
- Persist events, orders, and tickets in PostgreSQL.
- Emit seat-state broadcasts through WebSocket channels.
- Replace ticket mint placeholders with Solana Anchor + Metaplex Bubblegum calls.
- Add LI.FI quote/build-transaction endpoints for cross-chain checkout.
