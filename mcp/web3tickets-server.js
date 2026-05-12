import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

const API_URL = process.env.WEB3_TICKETS_API_URL || 'http://127.0.0.1:8090';

const server = new McpServer({
  name: 'web3-tickets',
  version: '0.1.0',
});

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === 'object' && data?.error ? data.error : response.statusText;
    throw new Error(`Backend request failed: ${message}`);
  }

  return data;
}

function textResult(data) {
  return {
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorResult(error) {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text:
          `${error.message}\n\n` +
          `Make sure the web3-tickets backend is running:\n` +
          `docker compose up -d postgres\n` +
          `cd backend\n` +
          `cargo run`,
      },
    ],
  };
}

server.registerTool(
  'health',
  {
    title: 'Check backend health',
    description: 'Check whether the web3-tickets backend is reachable.',
  },
  async () => {
    try {
      return textResult(await apiRequest('/health'));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  'list_events',
  {
    title: 'List events',
    description: 'List ticketed events from the web3-tickets backend.',
  },
  async () => {
    try {
      return textResult(await apiRequest('/api/events'));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  'list_seats',
  {
    title: 'List seats',
    description: 'List seats for a web3-tickets event.',
    inputSchema: {
      event_id: z.string().uuid().describe('Event UUID from list_events.'),
    },
  },
  async ({ event_id }) => {
    try {
      return textResult(await apiRequest(`/api/events/${event_id}/seats`));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  'get_ticket',
  {
    title: 'Get ticket',
    description: 'Fetch one ticket by ticket UUID.',
    inputSchema: {
      ticket_id: z.string().uuid().describe('Ticket UUID.'),
    },
  },
  async ({ ticket_id }) => {
    try {
      return textResult(await apiRequest(`/api/tickets/${ticket_id}`));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  'verify_ticket',
  {
    title: 'Verify ticket',
    description: 'Verify a ticket for venue entry using a ticket UUID and scanner id.',
    inputSchema: {
      ticket_id: z.string().uuid().describe('Ticket UUID.'),
      scanner_id: z.string().min(1).default('mcp-demo-scanner').describe('Scanner device or gate id.'),
    },
  },
  async ({ ticket_id, scanner_id }) => {
    try {
      return textResult(
        await apiRequest('/api/tickets/verify', {
          method: 'POST',
          body: JSON.stringify({ ticket_id, scanner_id }),
        }),
      );
    } catch (error) {
      return errorResult(error);
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`web3-tickets MCP server connected. Backend: ${API_URL}`);
}

main().catch((error) => {
  console.error('web3-tickets MCP server failed:', error);
  process.exit(1);
});
