# Web3 Ticketing

React frontend scaffold with a Rust backend for the Web3 ticketing architecture.

## Run Frontend

```powershell
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173
```

## Web3 Setup

- Install Phantom and switch it to Solana Devnet.
- Get test SOL from `https://faucet.solana.com/`.
- The frontend connects to `https://api.devnet.solana.com` through `@solana/web3.js`.
- Seat holds and local ticket records still go through the Rust backend.
- Checkout signs a wallet message now; the next step is replacing the local reservation placeholder with an Anchor `reserve_seat` instruction.

## On-Chain Program

The Anchor program lives in `programs/web3_tickets`.

It defines the core on-chain instructions:

- `initialize_event`
- `reserve_seat`
- `transfer_ticket`
- `verify_ticket`

Install the Solana and Anchor CLIs before building:

```powershell
solana config set --url devnet
anchor build
anchor deploy
anchor keys sync
```

## Partner Tracks

Recommended first submissions:

- ElevenLabs: voice confirmation after a ticket is reserved.
- LI.FI: cross-chain checkout route before Solana reservation.

Stretch tracks:

- Ledger: hardware-wallet signing for checkout.
- Solana Mobile: mobile wallet flow.
- Virtuals: AI ticketing agent.

## Run Backend

```powershell
cd backend
cargo run
```

Backend:

```text
http://127.0.0.1:8090
```

## File Guide

- `.gitignore` keeps generated folders, logs, and local bootstrap files out of Git.
- `index.html` is the Vite HTML entry point.
- `package.json` defines the empty React/Vite project scripts and dependencies.
- `package-lock.json` locks the frontend dependency versions.
- `vite.config.js` enables React support in Vite.
- `src/main.jsx` mounts the React app.
- `src/App.jsx` contains the minimal four-page ticket flow and Solana Devnet wallet connection.
- `src/style.css` contains the minimal responsive UI styling.
- `Anchor.toml` configures the Anchor workspace for Solana Devnet.
- `programs/web3_tickets/Cargo.toml` defines the on-chain ticketing program package.
- `programs/web3_tickets/Cargo.lock` locks the Anchor program dependency versions.
- `programs/web3_tickets/src/lib.rs` implements event creation, seat reservation, ticket transfer, and ticket verification on-chain.
- `backend/Cargo.toml` defines the Rust backend package and dependencies.
- `backend/Cargo.lock` locks the Rust dependency versions.
- `backend/.gitignore` keeps Rust build output out of Git.
- `backend/.cargo/config.toml` configures the Windows GNU Rust linker workaround used on this machine.
- `backend/.cargo/link-libs/libgcc.a` provides compiler runtime symbols for the local LLVM-MinGW linker.
- `backend/.cargo/link-libs/libgcc_eh.a` provides unwind symbols for the local LLVM-MinGW linker.
- `backend/src/main.rs` implements the Axum API for events, seat holds, reservations, transfers, and ticket verification.
- `backend/README.md` documents backend routes and integration points.
