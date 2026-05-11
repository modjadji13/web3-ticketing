import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import TicketsPage from './pages/TicketsPage';
import CheckoutPage from './pages/CheckoutPage';
import FinalCheckoutPage from './pages/FinalCheckoutPage';
import {
  ensureBackendEvent,
  listSeats,
  playVoiceConfirmation,
  reserveSeatInBackend,
  shortAddress,
} from './services/ticketApi';
import { reserveStaticTicketOnChain } from './services/solanaTickets';
import { DEFAULT_SEAT_ID, seatLabelFromId, ticketEvent } from './data/ticketData';

function App() {
  const [page, setPage] = useState('home');
  const [status, setStatus] = useState('');
  const [isBuying, setIsBuying] = useState(false);
  const [backendEvent, setBackendEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [selectedSeatId, setSelectedSeatId] = useState(DEFAULT_SEAT_ID);
  const [voiceStatus, setVoiceStatus] = useState('');

  useEffect(() => {
    ensureBackendEvent()
      .then(async (event) => {
        setBackendEvent(event);
        setSeats(await listSeats(event));
      })
      .catch((error) => setStatus(error.message));
  }, []);

  async function refreshSeats(event = backendEvent) {
    if (!event) return;
    setSeats(await listSeats(event));
  }

  async function confirmReservationByVoice({ email, reservedTicket, seatId }) {
    try {
      const message = await playVoiceConfirmation({
        eventName: ticketEvent.name,
        seatLabel: seatLabelFromId(seatId),
        email,
        ticket: reservedTicket,
      });
      setVoiceStatus(message);
    } catch (error) {
      setVoiceStatus(`Voice confirmation skipped: ${error.message}`);
    }
  }

  async function buyOnDevnet({ email } = {}) {
    setIsBuying(true);
    setStatus('');
    setVoiceStatus('');
    try {
      const event = backendEvent || (await ensureBackendEvent());
      setBackendEvent(event);
      const result = await reserveStaticTicketOnChain(selectedSeatId);
      const reservation = await reserveSeatInBackend(event, result, selectedSeatId);
      setTicket(reservation.ticket);
      await confirmReservationByVoice({ email, reservedTicket: reservation.ticket, seatId: selectedSeatId });
      await refreshSeats(event);
      setStatus(
        `Reserved ${seatLabelFromId(selectedSeatId)} in backend and on Solana devnet for ${email}: ${shortAddress(result.signature)} - ticket ${shortAddress(reservation.ticket.id)}`,
      );
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsBuying(false);
    }
  }

  async function buyWithDevnetTest({ email } = {}) {
    setIsBuying(true);
    setStatus('');
    setVoiceStatus('');
    try {
      const event = backendEvent || (await ensureBackendEvent());
      setBackendEvent(event);
      const timestamp = Date.now();
      const result = {
        owner: 'DevnetTestWallet111111111111111111111111111111',
        signature: `devnet-test-payment-${timestamp}`,
        ticketPda: `devnet-test-ticket-${timestamp}`,
      };
      const reservation = await reserveSeatInBackend(event, result, selectedSeatId);
      setTicket(reservation.ticket);
      await confirmReservationByVoice({ email, reservedTicket: reservation.ticket, seatId: selectedSeatId });
      await refreshSeats(event);
      setStatus(
        `Devnet test checkout reserved ${seatLabelFromId(selectedSeatId)} for ${email}: ${shortAddress(reservation.ticket.id)}`,
      );
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsBuying(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      {page === 'home' && <HomePage onTickets={() => setPage('tickets')} />}
      {page === 'tickets' && (
        <TicketsPage
          onHome={() => setPage('home')}
          onCheckout={(seatId) => {
            setSelectedSeatId(seatId || DEFAULT_SEAT_ID);
            setTicket(null);
            setStatus('');
            setVoiceStatus('');
            setPage('checkout');
          }}
          seats={seats}
        />
      )}
      {page === 'checkout' && (
        <CheckoutPage
          onTickets={() => setPage('tickets')}
          onFinal={() => setPage('final')}
          selectedSeatId={selectedSeatId}
        />
      )}
      {page === 'final' && (
        <FinalCheckoutPage
          isBuying={isBuying}
          onCheckout={() => setPage('checkout')}
          onBuy={buyOnDevnet}
          onTestBuy={buyWithDevnetTest}
          status={status}
          ticket={ticket}
          selectedSeatId={selectedSeatId}
          voiceStatus={voiceStatus}
        />
      )}
    </div>
  );
}

export default App;
