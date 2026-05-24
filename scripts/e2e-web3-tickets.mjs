import * as ed from '@noble/ed25519';
import bs58 from 'bs58';

const API_URL = process.env.API_URL || 'http://127.0.0.1:8090';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5174';
const TEST_PRIVATE_KEY = Uint8Array.from([
  11, 22, 33, 44, 55, 66, 77, 88, 99, 111, 122, 133, 144, 155, 166, 177,
  188, 199, 210, 221, 232, 243, 254, 10, 20, 30, 40, 50, 60, 70, 80, 90,
]);
const OTHER_PRIVATE_KEY = Uint8Array.from([
  90, 80, 70, 60, 50, 40, 30, 20, 10, 254, 243, 232, 221, 210, 199, 188,
  177, 166, 155, 144, 133, 122, 111, 99, 88, 77, 66, 55, 44, 33, 22, 11,
]);

const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const eventName = `E2E Web3 Tickets ${runId}`;
const venue = `Test Venue ${runId}`;
const priceLamports = 1_000_000;

function log(step, detail = '') {
  console.log(`${step.padEnd(34)} OK${detail ? ` - ${detail}` : ''}`);
}

function fail(message, context) {
  const error = new Error(message);
  if (context !== undefined) {
    error.context = context;
  }
  throw error;
}

function assert(condition, message, context) {
  if (!condition) {
    fail(message, context);
  }
}

async function request(path, options = {}, token) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(body?.error || `Request failed: ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function expectHttpError(label, path, options, expectedStatus, expectedMessagePart, token) {
  try {
    await request(path, options, token);
  } catch (error) {
    assert(
      error.status === expectedStatus,
      `${label} returned ${error.status}, expected ${expectedStatus}`,
      error.body,
    );
    if (expectedMessagePart) {
      assert(
        error.body?.error?.includes(expectedMessagePart),
        `${label} error did not include "${expectedMessagePart}"`,
        error.body,
      );
    }
    log(label, `${error.status} ${error.body?.error}`);
    return;
  }
  fail(`${label} unexpectedly succeeded`);
}

async function authenticate(privateKey = TEST_PRIVATE_KEY) {
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  const walletAddress = bs58.encode(publicKey);
  const nonce = await request('/auth/wallet/nonce', {
    method: 'POST',
    body: JSON.stringify({ wallet_address: walletAddress }),
  });
  const signature = await ed.signAsync(new TextEncoder().encode(nonce.message), privateKey);
  const auth = await request('/auth/wallet/verify', {
    method: 'POST',
    body: JSON.stringify({
      wallet_address: walletAddress,
      nonce_id: nonce.nonce_id,
      message: nonce.message,
      signature: bs58.encode(signature),
    }),
  });
  assert(auth.token, 'wallet auth did not return a token', auth);
  assert(auth.user?.wallet_address === walletAddress, 'wallet auth returned the wrong user', auth);
  return { token: auth.token, walletAddress, user: auth.user };
}

async function expectWalletMismatchRejected() {
  const claimedPublicKey = await ed.getPublicKeyAsync(OTHER_PRIVATE_KEY);
  const claimedWallet = bs58.encode(claimedPublicKey);
  const nonce = await request('/auth/wallet/nonce', {
    method: 'POST',
    body: JSON.stringify({ wallet_address: claimedWallet }),
  });
  const signature = await ed.signAsync(new TextEncoder().encode(nonce.message), TEST_PRIVATE_KEY);
  await expectHttpError(
    'wallet mismatch rejected',
    '/auth/wallet/verify',
    {
      method: 'POST',
      body: JSON.stringify({
        wallet_address: claimedWallet,
        nonce_id: nonce.nonce_id,
        message: nonce.message,
        signature: bs58.encode(signature),
      }),
    },
    401,
    'signature',
  );
}

async function main() {
  const frontendResponse = await fetch(FRONTEND_URL);
  assert(frontendResponse.ok, `frontend did not respond at ${FRONTEND_URL}`);
  const frontendHtml = await frontendResponse.text();
  assert(
    frontendHtml.includes('J. Cole Tickets - Web3 Tickets'),
    'frontend is not serving the Web3 Tickets app',
  );
  log('frontend', FRONTEND_URL);

  const health = await request('/health');
  assert(health.status === 'ok', 'backend health is not ok', health);
  log('backend health', API_URL);

  const auth = await authenticate();
  log('wallet auth', auth.walletAddress);
  await expectWalletMismatchRejected();

  const event = await request('/api/events', {
    method: 'POST',
    body: JSON.stringify({
      name: eventName,
      venue,
      chain: 'solana-devnet',
      price_lamports: priceLamports,
      per_wallet_limit: 2,
      resale_cap_bps: 12_000,
      royalty_bps: 500,
      rows: 1,
      seats_per_row: 3,
    }),
  });
  assert(event.id, 'created event is missing id', event);
  log('create event', event.id);

  const events = await request('/api/events');
  assert(
    events.some((candidate) => candidate.id === event.id),
    'created event was not returned by event listing',
    events,
  );
  log('list events', `${events.length} events`);

  const initialSeats = await request(`/api/events/${event.id}/seats`);
  assert(initialSeats.length === 3, 'event should have exactly three seats', initialSeats);
  const seat = initialSeats.find((candidate) => candidate.status === 'available');
  assert(seat, 'no available seat found', initialSeats);
  log('list seats', `${initialSeats.length} seats, selected ${seat.id}`);

  await expectHttpError(
    'reserve without jwt',
    `/api/events/${event.id}/seats/${seat.id}/reserve`,
    {
      method: 'POST',
      body: JSON.stringify({
        payment_signature: `sig-no-hold-${runId}`,
        onchain_ticket_address: `ticket-no-hold-${runId}`,
      }),
    },
    401,
    'token',
  );

  await expectHttpError(
    'reserve without hold',
    `/api/events/${event.id}/seats/${seat.id}/reserve`,
    {
      method: 'POST',
      body: JSON.stringify({
        payment_signature: `sig-no-hold-${runId}`,
        onchain_ticket_address: `ticket-no-hold-${runId}`,
      }),
    },
    409,
    'hold',
    auth.token,
  );

  const holdWallet = auth.walletAddress;
  const heldSeat = await request(`/api/events/${event.id}/seats/${seat.id}/hold`, {
    method: 'POST',
    body: JSON.stringify({ wallet_address: holdWallet }),
  }, auth.token);
  assert(heldSeat.status === 'held', 'seat hold did not mark seat held', heldSeat);
  assert(heldSeat.hold?.expires_at, 'seat hold did not include an expiry', heldSeat);
  log('hold seat', heldSeat.hold.expires_at);

  const heldSeats = await request(`/api/events/${event.id}/seats`);
  const listedHeldSeat = heldSeats.find((candidate) => candidate.id === seat.id);
  assert(listedHeldSeat?.status === 'held', 'held seat was not reflected in seat listing', heldSeats);
  log('held appears in listing', seat.id);

  const buyerWallet = auth.walletAddress;
  const paymentSignature = `devnet-test-payment-${runId}`;
  const onchainTicketAddress = `devnet-test-ticket-${runId}`;
  const reservation = await request(`/api/events/${event.id}/seats/${seat.id}/reserve`, {
    method: 'POST',
    body: JSON.stringify({
      hold_wallet_address: holdWallet,
      payment_signature: paymentSignature,
      onchain_ticket_address: onchainTicketAddress,
      metadata_uri: `ipfs://e2e-${runId}`,
    }),
  }, auth.token);
  assert(reservation.ticket?.id, 'reservation did not return a ticket', reservation);
  assert(reservation.ticket.owner_wallet === buyerWallet, 'ticket owner does not match buyer', reservation);
  assert(reservation.payment_signature === paymentSignature, 'payment signature was not echoed', reservation);
  log('reserve seat', reservation.ticket.id);

  const retryReservation = await request(`/api/events/${event.id}/seats/${seat.id}/reserve`, {
    method: 'POST',
    body: JSON.stringify({
      wallet_address: buyerWallet,
      hold_wallet_address: holdWallet,
      payment_signature: paymentSignature,
      onchain_ticket_address: onchainTicketAddress,
      metadata_uri: `ipfs://e2e-${runId}`,
    }),
  }, auth.token);
  assert(
    retryReservation.ticket.id === reservation.ticket.id,
    'idempotent reservation retry returned a different ticket',
    retryReservation,
  );
  log('idempotent reservation retry', retryReservation.ticket.id);

  const fetchedTicket = await request(`/api/tickets/${reservation.ticket.id}`);
  assert(fetchedTicket.id === reservation.ticket.id, 'ticket fetch returned wrong ticket', fetchedTicket);
  log('fetch ticket', fetchedTicket.id);

  const reservedSeats = await request(`/api/events/${event.id}/seats`);
  const listedReservedSeat = reservedSeats.find((candidate) => candidate.id === seat.id);
  assert(
    listedReservedSeat?.status === 'reserved',
    'reserved seat was not reflected in seat listing',
    reservedSeats,
  );
  log('reserved appears in listing', seat.id);

  const buyerWallet2 = bs58.encode(await ed.getPublicKeyAsync(OTHER_PRIVATE_KEY));
  const transferredTicket = await request(`/api/tickets/${reservation.ticket.id}/transfer`, {
    method: 'POST',
    body: JSON.stringify({
      buyer_wallet: buyerWallet2,
      resale_price_lamports: priceLamports,
    }),
  }, auth.token);
  assert(transferredTicket.owner_wallet === buyerWallet2, 'transfer did not update owner', transferredTicket);
  assert(transferredTicket.transfers.length === 1, 'transfer history was not recorded', transferredTicket);
  log('transfer ticket', `${buyerWallet} -> ${buyerWallet2}`);

  const wrongOwnerScan = await request('/api/tickets/verify', {
    method: 'POST',
    body: JSON.stringify({
      event_id: event.id,
      seat_id: seat.id,
      mark_used: false,
    }),
  }, auth.token);
  assert(wrongOwnerScan.valid === false, 'old owner should not verify after transfer', wrongOwnerScan);
  log('verify old owner rejected', wrongOwnerScan.reason);

  const previewScan = await request('/api/tickets/verify', {
    method: 'POST',
    body: JSON.stringify({
      event_id: event.id,
      seat_id: seat.id,
      mark_used: false,
    }),
  }, auth.token);
  assert(previewScan.valid === false, 'old authenticated owner should not verify after transfer', previewScan);
  log('verify old auth rejected', previewScan.reason);

  const buyer2Auth = await authenticate(OTHER_PRIVATE_KEY);
  const buyer2PreviewScan = await request('/api/tickets/verify', {
    method: 'POST',
    body: JSON.stringify({
      event_id: event.id,
      seat_id: seat.id,
      mark_used: false,
    }),
  }, buyer2Auth.token);
  assert(buyer2PreviewScan.valid === true, 'new owner preview verification failed', buyer2PreviewScan);
  assert(!buyer2PreviewScan.ticket.used_at, 'preview verification should not mark used', buyer2PreviewScan);
  log('verify new owner preview', buyer2PreviewScan.reason);

  const doorScan = await request('/api/tickets/verify', {
    method: 'POST',
    body: JSON.stringify({
      event_id: event.id,
      seat_id: seat.id,
      mark_used: true,
    }),
  }, buyer2Auth.token);
  assert(doorScan.valid === true, 'door scan failed', doorScan);
  assert(doorScan.ticket.used_at, 'door scan did not mark ticket used', doorScan);
  log('door scan marks used', doorScan.ticket.used_at);

  const duplicateDoorScan = await request('/api/tickets/verify', {
    method: 'POST',
    body: JSON.stringify({
      event_id: event.id,
      seat_id: seat.id,
      mark_used: true,
    }),
  }, buyer2Auth.token);
  assert(duplicateDoorScan.valid === false, 'duplicate door scan should be rejected', duplicateDoorScan);
  log('duplicate scan rejected', duplicateDoorScan.reason);

  console.log('\nA-to-Z Web3 Tickets smoke test passed.');
}

main().catch((error) => {
  console.error('\nA-to-Z Web3 Tickets smoke test failed.');
  console.error(error.message);
  if (error.context) {
    console.error(JSON.stringify(error.context, null, 2));
  }
  if (error.body) {
    console.error(JSON.stringify(error.body, null, 2));
  }
  process.exit(1);
});
