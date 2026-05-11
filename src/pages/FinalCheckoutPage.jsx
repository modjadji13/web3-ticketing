import { useEffect, useMemo, useState } from 'react';
import { CheckoutHeader, ChevronIcon, FinalOrderCard, Footer, GoogleIcon, SellingFast } from '../components/TicketUi';
import { seatLabelFromId } from '../data/ticketData';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const googleIdentityScript = 'https://accounts.google.com/gsi/client';

function FinalCheckoutPage({ isBuying, onCheckout, onBuy, onTestBuy, status, ticket, selectedSeatId }) {
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const seatLabel = seatLabelFromId(selectedSeatId);

  const emailIsValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);

  useEffect(() => {
    if (!googleClientId) {
      setAuthMessage('Add VITE_GOOGLE_CLIENT_ID to enable Google sign-in.');
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

  function handleSolanaPayment() {
    onBuy({ email: confirmedEmail || email });
  }

  function handleDevnetTestPayment() {
    onTestBuy({ email: confirmedEmail || email });
  }

  function handleGoogleSignIn() {
    if (!googleClientId) {
      setAuthMessage('Google sign-in needs VITE_GOOGLE_CLIENT_ID in your environment.');
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
          const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          });
          const profile = await response.json();

          if (!response.ok || !profile.email) {
            throw new Error(profile.error_description || 'Google did not return an email address.');
          }

          setEmail(profile.email);
          setEmailTouched(true);
          setAuthMessage(`Signed in with Google as ${profile.email}`);
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
      <CheckoutHeader onBack={onCheckout} timer="05:45" />
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
                <button className="text-[#0a58ca] font-medium hover:underline flex items-center justify-center gap-1 text-[15px]">
                  Other login options
                  <ChevronIcon />
                </button>
              </div>
              {authMessage && <p className="text-[14px] text-[#0a58ca] mb-3">{authMessage}</p>}
              {status && <p className="text-[14px] text-[#0a58ca] mb-6">{status}</p>}
              {ticket && (
                <p className="text-[13px] text-gray-500 mb-6">
                  Backend ticket: {ticket.id} / seat {ticket.seat_id}
                </p>
              )}
              <p className="text-[14px] text-gray-500 leading-relaxed max-w-[550px]">
                By signing in or creating an account, you agree to our{' '}
                <a className="text-[#0a58ca] hover:underline" href="#">
                  user agreement
                </a>{' '}
                and acknowledge our{' '}
                <a className="text-[#0a58ca] hover:underline" href="#">
                  privacy policy
                </a>
                .
              </p>
            </section>
            <FinalOrderCard seatLabel={seatLabel} />
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
        />
      )}
      <Footer />
    </div>
  );
}

function SolanaPaymentModal({ email, isBuying, onClose, onPay, onTestPay, status, ticket, seatLabel }) {
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
              <span className="font-bold text-gray-900">J. Cole</span>
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
              <span className="text-gray-500">Email</span>
              <span className="max-w-[260px] truncate font-medium text-gray-900">{email}</span>
            </div>
            <div className="mt-3 flex justify-between gap-4 border-t border-gray-200 pt-3 text-[16px]">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-gray-900">R935</span>
            </div>
          </div>

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

          {status && <p className="mt-4 text-[14px] text-[#0a58ca]">{status}</p>}
          {ticket && (
            <p className="mt-3 rounded-lg bg-[#e7f5e8] px-3 py-2 text-[13px] font-semibold text-[#147a38]">
              Ticket reserved: {ticket.id} / seat {ticket.seat_id}
            </p>
          )}

          <button
            className="mt-5 w-full rounded-lg bg-[#417516] py-3.5 text-[16px] font-bold text-white transition-colors hover:bg-[#345c12] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBuying || Boolean(ticket) || !phantomInstalled}
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
            disabled={isBuying || Boolean(ticket)}
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

export default FinalCheckoutPage;
