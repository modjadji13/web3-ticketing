import { CheckoutHeader, ChevronIcon, FinalOrderCard, Footer, GoogleIcon, SellingFast } from '../components/TicketUi';

function FinalCheckoutPage({ isBuying, onCheckout, onBuy, status, ticket }) {
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
                className="w-full border border-gray-300 rounded-lg px-4 py-3.5 text-[16px] mb-4 focus:ring-2 focus:ring-[#0a58ca] outline-none transition-shadow"
                placeholder="Email"
                type="email"
              />
              <button
                className="w-full bg-[#e5e7eb] text-gray-400 font-bold text-[16px] py-3.5 rounded-lg mb-6 transition-colors"
                onClick={onBuy}
              >
                {isBuying ? 'Confirming on Solana...' : 'Continue'}
              </button>
              <div className="flex justify-center mb-4">
                <button className="w-[280px] bg-white border border-gray-300 rounded-full py-2.5 px-4 hover:bg-gray-50 flex items-center justify-center gap-3 font-medium text-[15px] text-gray-700 shadow-sm transition-colors">
                  <GoogleIcon />
                  Continue with Google
                </button>
              </div>
              <div className="flex justify-center mb-10">
                <button className="text-[#0a58ca] font-medium hover:underline flex items-center justify-center gap-1 text-[15px]">
                  Other login options
                  <ChevronIcon />
                </button>
              </div>
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
