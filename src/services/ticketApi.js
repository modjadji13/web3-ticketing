import { DEFAULT_SEAT_ID, ticketEvent } from '../data/ticketData';

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

async function reserveSeatInBackend(event, chainResult, seatId = DEFAULT_SEAT_ID) {
  return apiRequest(`/api/events/${event.id}/seats/${seatId}/reserve`, {
    method: 'POST',
    body: JSON.stringify({
      wallet_address: chainResult.owner,
      hold_wallet_address: chainResult.holdWalletAddress,
      payment_signature: chainResult.signature,
      onchain_ticket_address: chainResult.ticketPda,
      metadata_uri: `ipfs://j-cole-${seatId}`,
    }),
  });
}

async function holdSeatInBackend(event, seatId = DEFAULT_SEAT_ID, holdWalletAddress) {
  return apiRequest(`/api/events/${event.id}/seats/${seatId}/hold`, {
    method: 'POST',
    body: JSON.stringify({
      wallet_address: holdWalletAddress,
    }),
  });
}

async function listSeats(event) {
  return apiRequest(`/api/events/${event.id}/seats`);
}

async function playVoiceConfirmation({ eventName, seatLabel, email, ticket }) {
  const response = await fetch(`${API_URL}/api/voice/confirmation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: eventName,
      seat_label: seatLabel,
      email,
      ticket_id: ticket?.id,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Voice confirmation failed');
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);

  audio.addEventListener('ended', () => URL.revokeObjectURL(audioUrl), { once: true });
  audio.addEventListener('error', () => URL.revokeObjectURL(audioUrl), { once: true });

  try {
    await audio.play();
    return 'Voice confirmation played.';
  } catch (error) {
    URL.revokeObjectURL(audioUrl);
    return `Voice confirmation generated, but the browser blocked autoplay: ${error.message}`;
  }
}

function shortAddress(address) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export {
  ensureBackendEvent,
  holdSeatInBackend,
  listSeats,
  playVoiceConfirmation,
  reserveSeatInBackend,
  shortAddress,
};
