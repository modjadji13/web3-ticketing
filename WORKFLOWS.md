# Web3 Ticketing Handoff

This document maps how the current Web3 ticketing demo is connected. It is written for a third party who needs to understand the working prototype, the live workflow, and the next engineering steps.

## Current Stack

- Frontend: Vite + React in `src/`
- Backend: Rust + Axum in `backend/`
- Wallet / chain: Solana Devnet through `@solana/web3.js`
- Google sign-in: Google Identity Services, configured by `VITE_GOOGLE_CLIENT_ID`
- Seat map asset: `public/maps/fnb-stadium-map.svg`
- Local frontend URL: `http://127.0.0.1:5174`
- Backend API URL: `http://127.0.0.1:8090`

## High-Level System

```mermaid
flowchart LR
  User[User browser] --> React[Vite React frontend]
  React --> Google[Google Identity Services]
  React --> Phantom[Phantom wallet]
  Phantom --> Solana[Solana Devnet RPC]
  React --> Backend[Rust Axum backend]
  Backend --> Store[PostgreSQL event, seat, ticket store]
  Backend --> TicketState[Seat status: available, held, reserved, used]
```

The frontend drives the user experience. The backend owns the event inventory, seat status, and local ticket records. Solana Devnet signs and records the demo chain reservation data. Google is only used to confirm the checkout email.

## Frontend Page Flow

```mermaid
flowchart TD
  Home[HomePage] -->|See tickets| Tickets[TicketsPage]
  Tickets -->|Click map tag or listing| Checkout[CheckoutPage]
  Checkout -->|Confirm quantity| Final[FinalCheckoutPage]
  Final -->|Enter email or Google sign-in| Payment[Solana payment modal]
  Payment -->|Pay with Phantom| SolanaBuy[Solana reservation + backend reservation]
  Payment -->|Devnet test checkout| TestBuy[Backend-only test reservation]
  SolanaBuy --> TicketsRefresh[Refresh backend seats]
  TestBuy --> TicketsRefresh
  TicketsRefresh --> Tickets
```

Relevant files:

- `src/App.jsx`: page state, selected seat state, buy actions, backend seat refresh
- `src/pages/HomePage.jsx`: event discovery page
- `src/pages/TicketsPage.jsx`: seat-map page, map tags, listings, reserved-seat hiding
- `src/pages/CheckoutPage.jsx`: selected ticket confirmation
- `src/pages/FinalCheckoutPage.jsx`: email, Google sign-in, Solana payment modal
- `src/components/TicketUi.jsx`: shared checkout header, order card, footer, map image component

## Seat Selection Flow

```mermaid
sequenceDiagram
  participant U as User
  participant T as TicketsPage
  participant A as App.jsx
  participant C as Checkout pages
  participant B as Backend

  U->>T: Click section 531 tag or listing
  T->>A: onCheckout("531-X")
  A->>A: setSelectedSeatId("531-X")
  A->>C: Render checkout for Section 531 - Row X
  U->>C: Confirm email and pay
  A->>B: POST /api/events/:event_id/seats/531-X/reserve
  B->>B: Mark seat 531-X reserved
  A->>B: GET /api/events/:event_id/seats
  B-->>A: Seat list with 531-X reserved
  A->>T: Pass updated seats
  T->>T: Hide map tag/listing with seatId 531-X
```

Important fix already applied: the selected seat is no longer hardcoded to `538-G`. A clicked tag or listing now maps to a concrete backend seat id and that id is used through checkout, Solana, and backend reservation.

Seat mapping lives in:

- `src/data/ticketData.js`
- `src/pages/TicketsPage.jsx`

Examples:

```text
Map/listing section 538 -> backend seat 538-G
Map/listing section 531 -> backend seat 531-X
Map/listing section 545 -> backend seat 545-ROW
Map/listing GA  -> backend seat GENERAL-ADMISSION-1
Map/listing FRONT -> backend seat FRONT-ZONE-NORTH-1
Default numbered section 541 -> backend seat 541-1
```

## Ticket Purchase Workflow

```mermaid
sequenceDiagram
  participant U as User
  participant F as FinalCheckoutPage
  participant G as Google
  participant W as Phantom Wallet
  participant S as Solana Devnet
  participant A as App.jsx
  participant B as Rust Backend

  U->>F: Enter email or click Continue with Google
  F->>G: Request Google email profile
  G-->>F: Email address
  F->>F: Open Solana payment modal
  U->>F: Pay with Phantom
  F->>A: onBuy(email)
  A->>W: Ask wallet to sign/send transaction
  W->>S: Submit reserve_seat transaction
  S-->>A: Signature + ticket PDA
  A->>B: POST reserve seat with wallet, signature, ticket PDA
  B->>B: Create local ticket and mark seat reserved
  B-->>A: Ticket record
  A->>B: GET latest seats
  B-->>A: Updated seat state
```

The app also has a demo fallback button:

- `Devnet test checkout`: skips Phantom and creates a backend reservation using a generated test payment signature.
- This is useful for demos when Phantom, Devnet SOL, or browser wallet permissions are blocking.

## Google Sign-In

Google sign-in is configured in `.env.local`:

```text
VITE_GOOGLE_CLIENT_ID=842289718082-fo06i7dnd946pjq0bcn61n3o58npbd2o.apps.googleusercontent.com
```

The code loads Google Identity Services from:

```text
https://accounts.google.com/gsi/client
```

Flow:

```mermaid
sequenceDiagram
  participant User
  participant Frontend
  participant Google

  User->>Frontend: Click Continue with Google
  Frontend->>Google: initTokenClient with VITE_GOOGLE_CLIENT_ID
  Google-->>Frontend: OAuth access token
  Frontend->>Google: GET oauth2/v3/userinfo
  Google-->>Frontend: Email profile
  Frontend->>Frontend: Set checkout email
```

The Google Cloud OAuth client must include the local origins used by the app:

```text
http://127.0.0.1:5174
http://localhost:5174
http://127.0.0.1:5173
http://localhost:5173
```

## Solana / Web3 Integration

Relevant file:

- `src/services/solanaTickets.js`

The frontend uses:

- `@solana/web3.js`
- Solana Devnet RPC via `clusterApiUrl('devnet')`
- Phantom wallet through `window.solana`
- Program id: `35wzuQvuh6PkqoTe8sgZu8hx8cV4sG2G8h89zELaLmKD`

Current chain flow:

```mermaid
flowchart TD
  SeatId[selectedSeatId] --> PDA1[Derive ticket PDA]
  Wallet[Phantom wallet] --> Tx[Build transaction]
  Tx --> Init[initialize_event if event PDA does not exist]
  Tx --> Reserve[reserve_seat selectedSeatId]
  Reserve --> Devnet[Send to Solana Devnet]
  Devnet --> Sig[Return signature and PDA]
  Sig --> BackendReserve[Send signature/PDA to backend reserve endpoint]
```

The backend stores the Solana result with the local ticket:

- `wallet_address`
- `payment_signature`
- `onchain_ticket_address`
- `metadata_uri`

## Backend API

Backend routes are defined in `backend/src/main.rs`.

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

Backend state model:

```mermaid
stateDiagram-v2
  [*] --> Available
  Available --> Held: hold_seat
  Held --> Available: hold expires
  Available --> Reserved: reserve_seat
  Held --> Reserved: reserve by same wallet
  Reserved --> Used: verify_ticket with mark_used
```

Backend data ownership:

- `events`: PostgreSQL table for event metadata such as name, venue, chain, price, resale cap
- `seats`: PostgreSQL table keyed by `(event_id, id)` for venue inventory and seat state
- `tickets`: PostgreSQL table for ticket records created after reservation
- `holds`: stored on each seat row as `hold_wallet_address` and `hold_expires_at`

The J. Cole demo event seeds a 90,000-seat inventory in `generate_jcole_seats()`.

## Backend Reservation Rules

```mermaid
flowchart TD
  Request[Reserve seat request] --> Expire[Expire stale holds]
  Expire --> Exists{Seat already reserved?}
  Exists -->|Same wallet| ReturnExisting[Return existing ticket]
  Exists -->|Different wallet| ErrorReserved[Error: seat already reserved]
  Exists -->|No| Status{Seat status}
  Status -->|Available| CreateTicket[Create ticket]
  Status -->|Held by same wallet| CreateTicket
  Status -->|Held by other wallet| ErrorHeld[Error: seat held by another wallet]
  Status -->|Other| ErrorUnavailable[Error: seat is not available]
  CreateTicket --> MarkReserved[Mark seat reserved and attach ticket_id]
  MarkReserved --> Response[Return ticket]
```

## Seat Map Implementation

The current map asset is:

```text
public/maps/fnb-stadium-map.svg
```

Important limitation:

- The file is an SVG wrapper around one embedded PNG image.
- It does not contain real SVG paths like `<path id="section-541">`.
- Because of that, the app cannot read or color individual stadium sections directly from the SVG.

Current approach:

- Display the SVG/PNG as the visual map background.
- Place clickable price tags on top using absolute coordinates.
- Each tag maps manually to a backend seat id.
- Hide tags/listings when the backend says that seat id is reserved.

Future improvement:

- Rebuild or trace the venue as true SVG paths.
- Give each block an id, for example `section-541`, `section-GA`, `section-FRONT`.
- Bind section fill color directly to backend seat availability.
- Click the actual section shape instead of only the overlay tag.

## Data Flow Summary

```mermaid
flowchart TD
  A[User clicks visible tag/listing] --> B[selectedSeatId in App.jsx]
  B --> C[Checkout label from seatLabelFromId]
  B --> D[Solana reserveStaticTicketOnChain selectedSeatId]
  D --> E[Solana signature + ticket PDA]
  B --> F[Backend reserveSeatInBackend selectedSeatId]
  E --> F
  F --> G[Backend ticket + reserved seat state]
  G --> H[listSeats refresh]
  H --> I[TicketsPage filters reserved seat ids]
  I --> J[Reserved tag/listing disappears]
```

## Local Runbook

Frontend:

```powershell
cd C:\Users\modja\OneDrive\Documents\reactprojects\web3-tickets
npm run dev -- --host 0.0.0.0 --port 5174
```

Backend:

```powershell
cd C:\Users\modja\OneDrive\Documents\reactprojects\web3-tickets\backend
cargo run
```

Open:

```text
http://127.0.0.1:5174
```

Verify backend:

```powershell
Invoke-RestMethod http://127.0.0.1:8090/health
Invoke-RestMethod http://127.0.0.1:8090/api/events
```

## What A Third Party Should Know

- The prototype now persists events, seats, tickets, holds, transfers, and scan state in PostgreSQL. Restarting the Rust backend no longer resets ticket state while the Postgres volume remains.
- The seat map image is not yet a real interactive vector map. Click targets are overlay tags.
- Google sign-in needs the configured OAuth client id and matching authorized JavaScript origins.
- Phantom must be installed and switched to Devnet for real wallet signing.
- The `Devnet test checkout` button is a demo fallback that reserves in the backend without Phantom.
- The backend currently trusts the frontend-provided Solana transaction result. A production version should verify the Solana transaction on the backend before creating the ticket.
- Production should move startup schema creation into migrations, consider Redis for high-volume holds, and add real NFT metadata/storage.
