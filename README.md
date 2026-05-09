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
- `src/App.jsx` is the intentionally empty app component.
- `src/style.css` contains the minimal base CSS reset.
- `backend/Cargo.toml` defines the Rust backend package and dependencies.
- `backend/Cargo.lock` locks the Rust dependency versions.
- `backend/.gitignore` keeps Rust build output out of Git.
- `backend/.cargo/config.toml` configures the Windows GNU Rust linker workaround used on this machine.
- `backend/.cargo/link-libs/libgcc.a` provides compiler runtime symbols for the local LLVM-MinGW linker.
- `backend/.cargo/link-libs/libgcc_eh.a` provides unwind symbols for the local LLVM-MinGW linker.
- `backend/src/main.rs` implements the Axum API for events, seat holds, reservations, transfers, and ticket verification.
- `backend/README.md` documents backend routes and integration points.
