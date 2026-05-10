import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import TicketsPage from './pages/TicketsPage';
import CheckoutPage from './pages/CheckoutPage';
import FinalCheckoutPage from './pages/FinalCheckoutPage';
import { ensureBackendEvent, reserveSeatInBackend, shortAddress } from './services/ticketApi';
import { reserveStaticTicketOnChain } from './services/solanaTickets';

function App() {
  const [page, setPage] = useState('home');
  const [status, setStatus] = useState('');
  const [isBuying, setIsBuying] = useState(false);
  const [backendEvent, setBackendEvent] = useState(null);
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    ensureBackendEvent().then(setBackendEvent).catch((error) => setStatus(error.message));
  }, []);

  async function buyOnDevnet({ email } = {}) {
    setIsBuying(true);
    setStatus('');
    try {
      const event = backendEvent || (await ensureBackendEvent());
      setBackendEvent(event);
      const result = await reserveStaticTicketOnChain();
      const reservation = await reserveSeatInBackend(event, result);
      setTicket(reservation.ticket);
      setStatus(
        `Reserved in backend and on Solana devnet for ${email}: ${shortAddress(result.signature)} - ticket ${shortAddress(reservation.ticket.id)}`,
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
    try {
      const event = backendEvent || (await ensureBackendEvent());
      setBackendEvent(event);
      const timestamp = Date.now();
      const result = {
        owner: 'DevnetTestWallet111111111111111111111111111111',
        signature: `devnet-test-payment-${timestamp}`,
        ticketPda: `devnet-test-ticket-${timestamp}`,
      };
      const reservation = await reserveSeatInBackend(event, result);
      setTicket(reservation.ticket);
      setStatus(
        `Devnet test checkout reserved ticket for ${email}: ${shortAddress(reservation.ticket.id)}`,
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
        <TicketsPage onHome={() => setPage('home')} onCheckout={() => setPage('checkout')} />
      )}
      {page === 'checkout' && (
        <CheckoutPage onTickets={() => setPage('tickets')} onFinal={() => setPage('final')} />
      )}
      {page === 'final' && (
        <FinalCheckoutPage
          isBuying={isBuying}
          onCheckout={() => setPage('checkout')}
          onBuy={buyOnDevnet}
          onTestBuy={buyWithDevnetTest}
          status={status}
          ticket={ticket}
        />
      )}
    </div>
  );
}

export default App;
