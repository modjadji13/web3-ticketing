import { useEffect, useMemo, useState } from 'react';
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

const API_URL = 'http://127.0.0.1:8090';
const SOLANA_RPC_URL = clusterApiUrl('devnet');
const PROGRAM_ID = new PublicKey('35wzuQvuh6PkqoTe8sgZu8hx8cV4sG2G8h89zELaLmKD');
const INITIALIZE_EVENT_DISCRIMINATOR = Uint8Array.from([126, 249, 86, 221, 202, 171, 134, 20]);
const RESERVE_SEAT_DISCRIMINATOR = Uint8Array.from([42, 147, 222, 136, 162, 134, 183, 168]);
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

function App() {
  const [page, setPage] = useState('events');
  const [events, setEvents] = useState([]);
  const [seats, setSeats] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [wallet, setWallet] = useState('');
  const [walletProvider, setWalletProvider] = useState(null);
  const [solBalance, setSolBalance] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [onChainTicket, setOnChainTicket] = useState(null);
  const [verifyForm, setVerifyForm] = useState({
    eventId: '',
    seatId: '',
    walletAddress: '',
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEvents();
    detectWallet();
  }, []);

  const sortedSeats = useMemo(() => {
    return [...seats].sort((a, b) => a.row.localeCompare(b.row) || a.number - b.number);
  }, [seats]);

  async function request(path, options) {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  function detectWallet() {
    const provider = window.solana?.isPhantom ? window.solana : null;
    setWalletProvider(provider);
  }

  async function connectWallet() {
    setLoading(true);
    setMessage('');
    try {
      if (!walletProvider) {
        throw new Error('Install Phantom wallet and switch it to Devnet.');
      }
      const result = await walletProvider.connect();
      const address = result.publicKey.toString();
      setWallet(address);
      await loadSolBalance(address);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadSolBalance(address = wallet) {
    if (!address) return;
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    setSolBalance(balance / LAMPORTS_PER_SOL);
  }

  async function loadEvents() {
    setLoading(true);
    setMessage('');
    try {
      const data = await request('/api/events');
      setEvents(data);
    } catch (error) {
      setMessage(`Backend not reachable: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function openEvent(event) {
    setLoading(true);
    setMessage('');
    setSelectedEvent(event);
    setSelectedSeat(null);
    try {
      const data = await request(`/api/events/${event.id}/seats`);
      setSeats(data);
      setPage('event');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function holdSeat(seat) {
    if (!wallet) {
      setMessage('Connect Phantom before holding a seat.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const heldSeat = await request(`/api/events/${selectedEvent.id}/seats/${seat.id}/hold`, {
        method: 'POST',
        body: JSON.stringify({ wallet_address: wallet }),
      });
      setSelectedSeat(heldSeat);
      setSeats((current) => current.map((item) => (item.id === heldSeat.id ? heldSeat : item)));
      setPage('checkout');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function reserveSeat() {
    if (!wallet) {
      setMessage('Connect Phantom before reserving a ticket.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const onChainReservation = await reserveSeatOnChain();
      const result = await request(
        `/api/events/${selectedEvent.id}/seats/${selectedSeat.id}/reserve`,
        {
          method: 'POST',
          body: JSON.stringify({
            wallet_address: onChainReservation.owner,
            payment_signature: onChainReservation.signature,
            onchain_ticket_address: onChainReservation.ticketPda,
            metadata_uri: `ipfs://ticket-${selectedEvent.id}-${selectedSeat.id}`,
          }),
        },
      );
      setTicket(result.ticket);
      setOnChainTicket(onChainReservation);
      setVerifyForm({
        eventId: result.ticket.event_id,
        seatId: result.ticket.seat_id,
        walletAddress: result.ticket.owner_wallet,
      });
      setMessage(`Ticket reserved on devnet: ${shortAddress(onChainReservation.signature)}`);
      setPage('verify');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function reserveSeatOnChain() {
    if (!walletProvider?.publicKey) {
      throw new Error('Connect Phantom before sending a Solana transaction.');
    }

    const buyer = walletProvider.publicKey;
    const [eventPda] = PublicKey.findProgramAddressSync(
      [textBytes('event'), buyer.toBuffer(), textBytes(selectedEvent.name)],
      PROGRAM_ID,
    );
    const [ticketPda] = PublicKey.findProgramAddressSync(
      [textBytes('ticket'), eventPda.toBuffer(), textBytes(selectedSeat.id)],
      PROGRAM_ID,
    );

    const ticketAccount = await connection.getAccountInfo(ticketPda);
    if (ticketAccount) {
      throw new Error('This seat already has an on-chain ticket for your event account.');
    }

    const transaction = new Transaction();
    const eventAccount = await connection.getAccountInfo(eventPda);
    if (!eventAccount) {
      transaction.add(
        buildInitializeEventInstruction({
          organizer: buyer,
          eventPda,
          event: selectedEvent,
          totalSeats: seats.length,
        }),
      );
    }

    transaction.add(
      buildReserveSeatInstruction({
        buyer,
        organizer: buyer,
        eventPda,
        ticketPda,
        seatId: selectedSeat.id,
      }),
    );

    transaction.feePayer = buyer;
    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = latestBlockhash.blockhash;

    const result = await walletProvider.signAndSendTransaction(transaction);
    const signature = typeof result === 'string' ? result : result.signature;
    await connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      'confirmed',
    );

    return {
      eventPda: eventPda.toString(),
      ticketPda: ticketPda.toString(),
      signature,
      owner: buyer.toString(),
    };
  }

  async function verifyTicket(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const result = await request('/api/tickets/verify', {
        method: 'POST',
        body: JSON.stringify({
          event_id: verifyForm.eventId,
          seat_id: verifyForm.seatId,
          wallet_address: verifyForm.walletAddress,
          mark_used: false,
        }),
      });
      setMessage(result.valid ? 'Ticket is valid.' : `Invalid ticket: ${result.reason}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p>Web3 Ticketing</p>
          <h1>{titleFor(page)}</h1>
        </div>
        <nav>
          <button onClick={() => setPage('events')}>Events</button>
          <button onClick={() => setPage('verify')}>Verify</button>
        </nav>
      </header>

      <section className="wallet-panel">
        <div>
          <strong>{wallet ? shortAddress(wallet) : 'No wallet connected'}</strong>
          <small>
            Solana devnet {solBalance === null ? '' : `- ${solBalance.toFixed(4)} SOL`}
          </small>
        </div>
        <div className="wallet-actions">
          <button onClick={connectWallet}>{wallet ? 'Reconnect Phantom' : 'Connect Phantom'}</button>
          <button disabled={!wallet} onClick={() => loadSolBalance()}>
            Refresh SOL
          </button>
          <a href="https://faucet.solana.com/" target="_blank" rel="noreferrer">
            Devnet faucet
          </a>
        </div>
      </section>

      {message && <p className="message">{message}</p>}
      {loading && <p className="muted">Loading...</p>}

      {page === 'events' && (
        <section className="panel">
          <div className="panel-head">
            <h2>Events</h2>
            <button onClick={loadEvents}>Refresh</button>
          </div>
          <div className="list">
            {events.map((event) => (
              <button className="row" key={event.id} onClick={() => openEvent(event)}>
                <span>
                  <strong>{event.name}</strong>
                  <small>{event.venue}</small>
                </span>
                <span>{event.price_lamports.toLocaleString()} lamports</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {page === 'event' && selectedEvent && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{selectedEvent.name}</h2>
              <p className="muted">{selectedEvent.venue}</p>
            </div>
            <button onClick={() => setPage('events')}>Back</button>
          </div>
          <div className="seat-grid">
            {sortedSeats.map((seat) => (
              <button
                className={`seat ${seat.status}`}
                disabled={seat.status !== 'available'}
                key={seat.id}
                onClick={() => holdSeat(seat)}
              >
                {seat.id}
              </button>
            ))}
          </div>
        </section>
      )}

      {page === 'checkout' && selectedEvent && selectedSeat && (
        <section className="panel narrow">
          <h2>Checkout</h2>
          <dl>
            <dt>Event</dt>
            <dd>{selectedEvent.name}</dd>
            <dt>Seat</dt>
            <dd>{selectedSeat.id}</dd>
            <dt>Wallet</dt>
            <dd>
              <input value={wallet} readOnly />
            </dd>
            <dt>Network</dt>
            <dd>Solana devnet</dd>
          </dl>
          <button className="primary" onClick={reserveSeat}>
            Reserve ticket
          </button>
        </section>
      )}

      {page === 'verify' && (
        <section className="panel narrow">
          <h2>Verify Ticket</h2>
          {ticket && (
            <div className="muted">
              <p>Latest ticket: {ticket.seat_id} owned by {ticket.owner_wallet}</p>
              {onChainTicket && (
                <p>
                  On-chain ticket: {shortAddress(onChainTicket.ticketPda)} -{' '}
                  <a
                    href={`https://explorer.solana.com/tx/${onChainTicket.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View tx
                  </a>
                </p>
              )}
            </div>
          )}
          <form onSubmit={verifyTicket}>
            <label>
              Event ID
              <input
                value={verifyForm.eventId}
                onChange={(event) => setVerifyForm({ ...verifyForm, eventId: event.target.value })}
                required
              />
            </label>
            <label>
              Seat ID
              <input
                value={verifyForm.seatId}
                onChange={(event) => setVerifyForm({ ...verifyForm, seatId: event.target.value })}
                required
              />
            </label>
            <label>
              Wallet
              <input
                value={verifyForm.walletAddress}
                onChange={(event) =>
                  setVerifyForm({ ...verifyForm, walletAddress: event.target.value })
                }
                required
              />
            </label>
            <button className="primary" type="submit">
              Verify
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

function buildInitializeEventInstruction({ organizer, eventPda, event, totalSeats }) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: organizer, isSigner: true, isWritable: true },
      { pubkey: eventPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: concatBytes(
      INITIALIZE_EVENT_DISCRIMINATOR,
      encodeString(event.name),
      encodeString(event.venue),
      encodeU64(event.price_lamports),
      encodeU32(totalSeats),
      encodeU16(event.per_wallet_limit),
      encodeU16(event.resale_cap_bps),
      encodeU16(event.royalty_bps),
    ),
  });
}

function buildReserveSeatInstruction({ buyer, organizer, eventPda, ticketPda, seatId }) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: organizer, isSigner: false, isWritable: true },
      { pubkey: eventPda, isSigner: false, isWritable: true },
      { pubkey: ticketPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: concatBytes(RESERVE_SEAT_DISCRIMINATOR, encodeString(seatId)),
  });
}

function textBytes(value) {
  return new TextEncoder().encode(value);
}

function encodeString(value) {
  const bytes = textBytes(value);
  return concatBytes(encodeU32(bytes.length), bytes);
}

function encodeU16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function encodeU32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function encodeU64(value) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value), true);
  return bytes;
}

function concatBytes(...chunks) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

function shortAddress(address) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function titleFor(page) {
  return {
    events: 'Events',
    event: 'Seat Map',
    checkout: 'Checkout',
    verify: 'Verify Ticket',
  }[page];
}

export default App;
