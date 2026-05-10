import { EventFlowHeader, ListingsSidebar, SellingFast, StadiumMap } from '../components/TicketUi';
import { priceTags } from '../data/ticketData';

function TicketsPage({ onHome, onCheckout }) {
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <EventFlowHeader onBack={onHome} />
      <SellingFast centered />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 bg-[#f4f5f7] relative overflow-hidden flex items-center justify-center">
          <div className="absolute top-4 right-4 bg-white rounded-md shadow-sm flex flex-col border border-gray-200 z-20">
            <button className="w-9 h-9 flex items-center justify-center border-b border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xl">
              +
            </button>
            <button className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 text-gray-700 font-bold text-xl">
              -
            </button>
          </div>
          <div className="relative w-full max-w-[800px] aspect-square flex items-center justify-center scale-[0.80] md:scale-[0.90] xl:scale-100 origin-center transition-transform">
            <StadiumMap />
            {priceTags.map(([left, top, price, leftText]) => (
              <button
                className="tag-box"
                key={`${left}-${top}-${price}`}
                onClick={onCheckout}
                style={{ left, top }}
              >
                <span className="text-[13px] font-bold text-gray-900 leading-none mt-1">
                  {price}
                </span>
                {leftText && (
                  <span className="text-[11px] text-[#d9147d] font-bold mt-1 mb-0.5 leading-none">
                    {leftText}
                  </span>
                )}
                <span className="tag-arrow arrow-d" />
              </button>
            ))}
          </div>
        </div>
        <ListingsSidebar onCheckout={onCheckout} />
      </div>
    </div>
  );
}

export default TicketsPage;
