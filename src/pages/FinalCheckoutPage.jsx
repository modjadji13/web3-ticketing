import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import { CheckoutHeader, ChevronIcon, FinalOrderCard, Footer, GoogleIcon, SellingFast } from '../components/TicketUi';
import { priceForSeatId, seatLabelFromId, ticketEvent } from '../data/ticketData';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const googleIdentityScript = 'https://accounts.google.com/gsi/client';

function FinalCheckoutPage({
  isBuying,
  onCheckout,
  onBuy,
  onGoogleToken,
  onTestBuy,
  status,
  ticket,
  selectedSeatId,
  voiceStatus,
  holdExpiresAt,
  onExpired,
}) {
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const [activePanel, setActivePanel] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(2 * 60);
  const seatLabel = seatLabelFromId(selectedSeatId);
  const price = priceForSeatId(selectedSeatId);
  const timer = formatCountdown(secondsLeft);
  const reservationExpired = secondsLeft <= 0 && !ticket;

  const emailIsValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);

  useEffect(() => {
    if (!googleClientId) {
      setAuthMessage(
        'Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to .env.local and restart Vite.',
      );
      return;
    }

    if (window.google?.accounts?.oauth2) {
      setGoogleReady(true);
      return;
    }

    const existingScript = document.querySelector(`script[src="${googleIdentityScript}"]`);
    const script = existingScript || document.createElement('script');

    script.src = googleIdentityScript;
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(Boolean(window.google?.accounts?.oauth2));
    script.onerror = () => setAuthMessage('Google sign-in could not load. Check your connection.');

    if (!existingScript) {
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const deadline = holdExpiresAt ? new Date(holdExpiresAt).getTime() : Date.now() + 2 * 60 * 1000;

    function tick() {
      setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [holdExpiresAt]);

  useEffect(() => {
    if (reservationExpired) {
      setPaymentModalOpen(false);
      onExpired?.();
    }
  }, [onExpired, reservationExpired]);

  function handleContinue() {
    setEmailTouched(true);
    if (!emailIsValid) {
      setAuthMessage('Enter a valid email before continuing.');
      return;
    }

    setConfirmedEmail(email);
    setAuthMessage(`Checkout email confirmed: ${email}`);
    setPaymentModalOpen(true);
  }

  async function handleSolanaPayment() {
    if (reservationExpired) {
      setAuthMessage('This 2-minute reservation expired. Pick the seat again to restart checkout.');
      return;
    }
    await handlePaymentAttempt({
      action: () => onBuy({ email: confirmedEmail || email }),
      pendingTitle: 'Confirming Solana payment',
    });
  }

  async function handleDevnetTestPayment() {
    if (reservationExpired) {
      setAuthMessage('This 2-minute reservation expired. Pick the seat again to restart checkout.');
      return;
    }
    await handlePaymentAttempt({
      action: () => onTestBuy({ email: confirmedEmail || email }),
      pendingTitle: 'Confirming test checkout',
    });
  }

  async function handlePaymentAttempt({ action, pendingTitle }) {
    setPaymentModalOpen(false);
    setPaymentResult({
      type: 'pending',
      title: pendingTitle,
      message: 'Please wait while the reservation is confirmed.',
    });

    try {
      const result = await action();
      if (result?.ok) {
        setPaymentResult({
          type: 'success',
          title: 'Payment successful',
          message: result.message || 'Your ticket was reserved successfully.',
          ticketId: result.ticket?.id,
        });
        return;
      }

      setPaymentResult({
        type: 'error',
        title: isDeniedPayment(result?.message) ? 'Payment denied' : 'Payment failed',
        message: result?.message || 'The reservation could not be completed.',
      });
    } catch (error) {
      setPaymentResult({
        type: 'error',
        title: isDeniedPayment(error.message) ? 'Payment denied' : 'Payment failed',
        message: error.message,
      });
    }
  }

  function handleGoogleSignIn() {
    if (!googleClientId) {
      setAuthMessage(
        'Google sign-in needs a Web OAuth client id. Add VITE_GOOGLE_CLIENT_ID to .env.local and restart Vite.',
      );
      return;
    }

    if (!googleReady || !window.google?.accounts?.oauth2) {
      setAuthMessage('Google sign-in is still loading. Try again in a moment.');
      return;
    }

    setGoogleLoading(true);
    setAuthMessage('');

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: 'openid email profile',
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          setGoogleLoading(false);
          setAuthMessage(tokenResponse.error_description || tokenResponse.error);
          return;
        }

        try {
          const user = await onGoogleToken(tokenResponse.access_token);
          if (!user.email) {
            throw new Error('Google did not return an email address.');
          }

          setEmail(user.email);
          setEmailTouched(true);
          setAuthMessage(`Signed in with Google as ${user.email}`);
        } catch (error) {
          setAuthMessage(error.message);
        } finally {
          setGoogleLoading(false);
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <CheckoutHeader
        onBack={onCheckout}
        onCurrency={() => setActivePanel('Currency is fixed to ZAR for this South Africa demo checkout.')}
        onLanguage={() => setActivePanel('Language is fixed to English for this demo checkout.')}
        timer={timer}
      />
      <SellingFast />
      <main className="flex-1 bg-[#fbfbfb]">
        <div className="max-w-[1200px] mx-auto px-6 py-10">
          <h1 className="text-[32px] font-bold text-gray-900 mb-8">Checkout</h1>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-16">
            <section className="max-w-[600px]">
              <h2 className="text-[20px] font-bold text-gray-900 mb-1">Enter email</h2>
              <p className="text-[15px] text-gray-600 mb-6">
                Not sure if you have an account? Enter your email and we'll check for you.
              </p>
              <input
                className={`w-full border rounded-lg px-4 py-3.5 text-[16px] mb-2 focus:ring-2 focus:ring-[#0a58ca] outline-none transition-shadow ${
                  emailTouched && !emailIsValid ? 'border-[#e11d48]' : 'border-gray-300'
                }`}
                onBlur={() => setEmailTouched(true)}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                type="email"
                value={email}
              />
              {emailTouched && !emailIsValid && (
                <p className="text-[13px] text-[#e11d48] mb-4">Enter a valid email address.</p>
              )}
              <button
                className={`w-full font-bold text-[16px] py-3.5 rounded-lg mb-6 transition-colors ${
                  emailIsValid
                    ? 'bg-[#417516] hover:bg-[#345c12] text-white'
                    : 'bg-[#e5e7eb] text-gray-400'
                }`}
                disabled={isBuying}
                onClick={handleContinue}
              >
                {isBuying ? 'Confirming on Solana...' : 'Continue'}
              </button>
              <div className="flex justify-center mb-4">
                <button
                  className="w-[280px] bg-white border border-gray-300 rounded-full py-2.5 px-4 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-medium text-[15px] text-gray-700 shadow-sm transition-colors"
                  disabled={googleLoading || isBuying}
                  onClick={handleGoogleSignIn}
                  type="button"
                >
                  <GoogleIcon />
                  {googleLoading ? 'Connecting...' : 'Continue with Google'}
                </button>
              </div>
              <div className="flex justify-center mb-10">
                <button
                  className="text-[#0a58ca] font-medium hover:underline flex items-center justify-center gap-1 text-[15px]"
                  onClick={() => setActivePanel('Use email or Google sign-in for this prototype. Wallet payment happens in the Solana payment modal after email confirmation.')}
                  type="button"
                >
                  Other login options
                  <ChevronIcon />
                </button>
              </div>
              <p className="text-[14px] font-semibold text-[#147a38] mb-3">
                Your selected seat is held for {timer}. Finish checkout before the timer expires.
              </p>
              {authMessage && <p className="text-[14px] text-[#0a58ca] mb-3">{authMessage}</p>}
              {status && <p className="text-[14px] text-[#0a58ca] mb-6">{status}</p>}
              {voiceStatus && <p className="text-[14px] text-[#147a38] mb-6">{voiceStatus}</p>}
              {ticket && (
                <p className="text-[13px] text-gray-500 mb-6">
                  Backend ticket: {ticket.id} / seat {ticket.seat_id}
                </p>
              )}
              <p className="text-[14px] text-gray-500 leading-relaxed max-w-[550px]">
                By signing in or creating an account, you agree to our{' '}
                <button
                  className="text-[#0a58ca] hover:underline"
                  onClick={() => setActivePanel('User Agreement: tickets are reserved after payment confirms, resale is capped, and every ticket can be verified at the door.')}
                  type="button"
                >
                  user agreement
                </button>{' '}
                and acknowledge our{' '}
                <button
                  className="text-[#0a58ca] hover:underline"
                  onClick={() => setActivePanel('Privacy Policy: this prototype stores checkout email, wallet address, reservation status, and ticket verification data for the demo flow.')}
                  type="button"
                >
                  privacy policy
                </button>
                .
              </p>
            </section>
            <FinalOrderCard onDetails={() => setActivePanel(`${seatLabel}: 1 ticket, total ${price} before taxes and handling fees.`)} price={price} seatLabel={seatLabel} />
          </div>
        </div>
      </main>
      {paymentModalOpen && (
        <SolanaPaymentModal
          email={confirmedEmail || email}
          isBuying={isBuying}
          onClose={() => setPaymentModalOpen(false)}
          onPay={handleSolanaPayment}
          onTestPay={handleDevnetTestPayment}
          status={status}
          ticket={ticket}
          seatLabel={seatLabel}
          price={price}
          voiceStatus={voiceStatus}
          reservationExpired={reservationExpired}
          timer={timer}
        />
      )}
      {paymentResult && (
        <PaymentResultModal
          result={paymentResult}
          seatLabel={seatLabel}
          price={price}
          onClose={() => setPaymentResult(null)}
          onRetry={() => {
            setPaymentResult(null);
            setPaymentModalOpen(true);
          }}
        />
      )}
      {activePanel && <InfoModal message={activePanel} onClose={() => setActivePanel(null)} />}
      <Footer onAction={(item) => setActivePanel(`${item}: demo information panel for the checkout prototype.`)} />
    </div>
  );
}

function SolanaPaymentModal({
  email,
  isBuying,
  onClose,
  onPay,
  onTestPay,
  status,
  ticket,
  seatLabel,
  price,
  voiceStatus,
  reservationExpired,
  timer,
}) {
  const [phantomInstalled, setPhantomInstalled] = useState(() => Boolean(window.solana?.isPhantom));

  function refreshWalletStatus() {
    setPhantomInstalled(Boolean(window.solana?.isPhantom));
  }

  function openPhantomInstall() {
    window.open('https://phantom.app/download', '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-[480px] rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-[22px] font-bold text-gray-900">Solana payment</h2>
            <p className="mt-1 text-[14px] text-gray-500">Pay on Solana Devnet to reserve your ticket.</p>
          </div>
          <button
            aria-label="Close payment modal"
            className="rounded-full px-2 text-[24px] leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            disabled={isBuying}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="rounded-xl border border-gray-200 bg-[#fbfbfb] p-4">
            <div className="flex justify-between gap-4 text-[15px]">
              <span className="text-gray-500">Event</span>
              <span className="font-bold text-gray-900">{ticketEvent.name}</span>
            </div>
            <div className="mt-3 flex justify-between gap-4 text-[15px]">
              <span className="text-gray-500">Seat</span>
              <span className="font-bold text-gray-900">{seatLabel}</span>
            </div>
            <div className="mt-3 flex justify-between gap-4 text-[15px]">
              <span className="text-gray-500">Network</span>
              <span className="font-bold text-[#147a38]">Solana Devnet</span>
            </div>
            <div className="mt-3 flex justify-between gap-4 text-[15px]">
              <span className="text-gray-500">Reserved for</span>
              <span className={`font-bold ${reservationExpired ? 'text-[#e11d48]' : 'text-[#147a38]'}`}>
                {reservationExpired ? 'Expired' : timer}
              </span>
            </div>
            <div className="mt-3 flex justify-between gap-4 text-[15px]">
              <span className="text-gray-500">Email</span>
              <span className="max-w-[260px] truncate font-medium text-gray-900">{email}</span>
            </div>
            <div className="mt-3 flex justify-between gap-4 border-t border-gray-200 pt-3 text-[16px]">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-gray-900">{price}</span>
            </div>
          </div>

          {ticket ? (
            <div className="mt-5 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-[14px] text-[#166534]">
              <div className="font-bold">Reservation complete</div>
              <p className="mt-1">
                Your ticket is reserved. You can close this window and view your ticket details.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-[#dbeafe] bg-[#eff6ff] p-4 text-[14px] text-[#1d4ed8]">
              <div className="font-bold">
                {phantomInstalled ? 'Phantom detected' : 'Phantom wallet required'}
              </div>
              <p className="mt-1">
                {phantomInstalled
                  ? 'Switch Phantom to Devnet before paying. The app signs the reservation transaction with your wallet and records the ticket in the backend.'
                  : 'Install Phantom, enable it in your browser, then return here and check again.'}
              </p>
              {!phantomInstalled && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded-md bg-[#1d4ed8] px-3 py-2 text-[13px] font-bold text-white hover:bg-[#1e40af]"
                    onClick={openPhantomInstall}
                    type="button"
                  >
                    Install Phantom
                  </button>
                  <button
                    className="rounded-md border border-[#93c5fd] bg-white px-3 py-2 text-[13px] font-bold text-[#1d4ed8] hover:bg-[#dbeafe]"
                    onClick={refreshWalletStatus}
                    type="button"
                  >
                    I installed it
                  </button>
                </div>
              )}
            </div>
          )}

          {status && <p className="mt-4 text-[14px] text-[#0a58ca]">{status}</p>}
          {reservationExpired && (
            <p className="mt-4 rounded-lg bg-[#fef1f2] px-3 py-2 text-[13px] font-semibold text-[#e11d48]">
              This 2-minute reservation expired. Close this modal and pick the seat again.
            </p>
          )}
          {voiceStatus && <p className="mt-3 text-[14px] font-medium text-[#147a38]">{voiceStatus}</p>}
          {ticket && (
            <p className="mt-3 rounded-lg bg-[#e7f5e8] px-3 py-2 text-[13px] font-semibold text-[#147a38]">
              Ticket reserved: {ticket.id} / seat {ticket.seat_id}
            </p>
          )}

          <button
            className="mt-5 w-full rounded-lg bg-[#417516] py-3.5 text-[16px] font-bold text-white transition-colors hover:bg-[#345c12] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBuying || Boolean(ticket) || !phantomInstalled || reservationExpired}
            onClick={onPay}
            type="button"
          >
            {isBuying
              ? 'Opening Phantom...'
              : ticket
                ? 'Payment complete'
                : phantomInstalled
                  ? 'Pay with Phantom'
                  : 'Install Phantom first'}
          </button>
          <button
            className="mt-3 w-full rounded-lg bg-[#111827] py-3 text-[15px] font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBuying || Boolean(ticket) || reservationExpired}
            onClick={onTestPay}
            type="button"
          >
            {isBuying ? 'Reserving test ticket...' : ticket ? 'Test checkout complete' : 'Devnet test checkout'}
          </button>
          <button
            className="mt-3 w-full rounded-lg border border-gray-300 py-3 text-[15px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            disabled={isBuying}
            onClick={onClose}
            type="button"
          >
            {ticket ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-[440px] rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="text-[20px] font-bold text-gray-900">Details</h2>
        <p className="mt-3 text-[14px] leading-relaxed text-gray-600">{message}</p>
        <button
          className="mt-5 w-full rounded-lg bg-[#417516] py-3 text-[15px] font-bold text-white hover:bg-[#345c12]"
          onClick={onClose}
          type="button"
        >
          OK
        </button>
      </div>
    </div>
  );
}

function PaymentResultModal({ onClose, onRetry, price, result, seatLabel }) {
  const isPending = result.type === 'pending';
  const isSuccess = result.type === 'success';
  const Icon = isPending ? LoaderCircle : isSuccess ? CheckCircle2 : result.type === 'warning' ? AlertCircle : XCircle;
  const iconClass = isPending
    ? 'text-[#0a58ca] animate-spin'
    : isSuccess
      ? 'text-[#147a38]'
      : 'text-[#e11d48]';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
            <Icon className={`h-9 w-9 ${iconClass}`} strokeWidth={2.4} />
          </div>
          <h2 className="mt-4 text-[24px] font-bold text-gray-900">{result.title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{result.message}</p>
        </div>

        <div className="mt-5 rounded-xl border border-gray-200 bg-[#fbfbfb] p-4 text-[14px]">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Event</span>
            <span className="font-bold text-gray-900">{ticketEvent.name}</span>
          </div>
          <div className="mt-3 flex justify-between gap-4">
            <span className="text-gray-500">Seat</span>
            <span className="font-bold text-gray-900">{seatLabel}</span>
          </div>
          {result.ticketId && (
            <div className="mt-3 flex justify-between gap-4">
              <span className="text-gray-500">Ticket</span>
              <span className="max-w-[260px] truncate font-mono text-[12px] text-gray-900">{result.ticketId}</span>
            </div>
          )}
          <div className="mt-3 flex justify-between gap-4">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-gray-900">{price}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {!isPending && !isSuccess && (
            <button
              className="w-full rounded-lg bg-[#111827] py-3 text-[15px] font-bold text-white hover:bg-black"
              onClick={onRetry}
              type="button"
            >
              Try again
            </button>
          )}
          <button
            className={`w-full rounded-lg py-3 text-[15px] font-bold ${
              isPending
                ? 'border border-gray-300 text-gray-400'
                : 'bg-[#417516] text-white hover:bg-[#345c12]'
            }`}
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            {isSuccess ? 'Done' : isPending ? 'Processing...' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

function isDeniedPayment(message = '') {
  return /reject|denied|cancel|declined|wallet purchase limit/i.test(message);
}

function formatCountdown(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

export default FinalCheckoutPage;
