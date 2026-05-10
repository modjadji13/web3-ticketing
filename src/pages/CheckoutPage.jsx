import { Badge, CheckoutHeader, Feature, Footer, OrderSummary, SellingFast, StadiumMap } from '../components/TicketUi';

function CheckoutPage({ onTickets, onFinal }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <CheckoutHeader onBack={onTickets} timer="09:54" />
      <SellingFast />
      <main className="flex-1 bg-[#fbfbfb]">
        <div className="max-w-[1200px] mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
          <section>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-[340px] flex items-center justify-center relative shadow-sm">
              <div className="relative w-full h-full max-w-[600px]">
                <StadiumMap mini />
              </div>
            </div>
            <div className="mt-8">
              <h1 className="text-[22px] font-bold text-gray-900 leading-tight">Section 538 - Row G</h1>
              <p className="text-[15px] text-gray-500 mt-1">1 ticket</p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge tone="danger">High demand</Badge>
                <Badge tone="warning">Award winning artist</Badge>
              </div>
              <div className="mt-8 flex flex-col gap-6">
                <Feature title="Popular Pick" text="5 people viewed this event" />
                <Feature title="Clear view" />
              </div>
            </div>
          </section>
          <OrderSummary onFinal={onFinal} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default CheckoutPage;
