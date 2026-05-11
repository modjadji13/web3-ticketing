import { SELECTED_SEAT_ID, ticketEvent } from '../data/ticketData';

const API_URL = 'http://127.0.0.1:8090';

async function apiRequest(path, options) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Backend request failed');
  }
  return data;
}

async function ensureBackendEvent() {
  const events = await apiRequest('/api/events');
  const existing = events.find(
    (event) => event.name === ticketEvent.name && event.venue === ticketEvent.venue,
  );
  if (existing) {
    return existing;
  }

  return apiRequest('/api/events', {
    method: 'POST',
    body: JSON.stringify({
      name: ticketEvent.name,
      venue: ticketEvent.venue,
      chain: 'solana-devnet',
      price_lamports: ticketEvent.price_lamports,
      per_wallet_limit: ticketEvent.per_wallet_limit,
      resale_cap_bps: ticketEvent.resale_cap_bps,
      royalty_bps: ticketEvent.royalty_bps,
      rows: 1,
      seats_per_row: 1,
    }),
  });
}

async function reserveSeatInBackend(event, chainResult) {
  return apiRequest(`/api/events/${event.id}/seats/${SELECTED_SEAT_ID}/reserve`, {
    method: 'POST',
    body: JSON.stringify({
      wallet_address: chainResult.owner,
      payment_signature: chainResult.signature,
      onchain_ticket_address: chainResult.ticketPda,
      metadata_uri: `ipfs://j-cole-${SELECTED_SEAT_ID}`,
    }),
  });
}

async function listSeats(event) {
  return apiRequest(`/api/events/${event.id}/seats`);
}

function shortAddress(address) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export { ensureBackendEvent, listSeats, reserveSeatInBackend, shortAddress };
