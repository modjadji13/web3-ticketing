# web3-tickets MCP

This is a small MCP server for the local web3-tickets backend.

It gives an MCP client tools for:

- `health`
- `list_events`
- `list_seats`
- `get_ticket`
- `verify_ticket`

## Run the backend first

```powershell
docker compose up -d postgres
cd backend
cargo run
```

The MCP server uses this backend URL by default:

```text
http://127.0.0.1:8090
```

Override it with:

```powershell
$env:WEB3_TICKETS_API_URL="http://127.0.0.1:8090"
```

## Run the MCP server

From the repo root:

```powershell
npm run mcp
```

## Example client config

Use the absolute path to this repo on your machine:

```json
{
  "mcpServers": {
    "web3-tickets": {
      "command": "node",
      "args": ["mcp/web3tickets-server.js"],
      "cwd": "C:\\Users\\modja\\OneDrive\\Documents\\reactprojects\\web3-tickets",
      "env": {
        "WEB3_TICKETS_API_URL": "http://127.0.0.1:8090"
      }
    }
  }
}
```

After connecting it to an MCP client, you can ask things like:

```text
Use the web3-tickets MCP to check backend health.
Use the web3-tickets MCP to list events.
Use the web3-tickets MCP to list seats for this event id: ...
Use the web3-tickets MCP to verify ticket id ... at scanner gate-a.
```
