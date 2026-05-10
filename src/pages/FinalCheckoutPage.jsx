import { useEffect, useMemo, useState } from 'react';
import { CheckoutHeader, ChevronIcon, FinalOrderCard, Footer, GoogleIcon, SellingFast } from '../components/TicketUi';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const googleIdentityScript = 'https://accounts.google.com/gsi/client';

function FinalCheckoutPage({ isBuying, onCheckout, onBuy, status, ticket }) {
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

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

    setAuthMessage(`Checkout email confirmed: ${email}`);
    onBuy({ email });
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
            <FinalOrderCard />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default FinalCheckoutPage;
