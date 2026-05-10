import {
  ChevronDown,
  Eye,
  Flame,
  Heart,
  Info,
  Search,
  Share2,
  SlidersHorizontal,
  Tag,
  Ticket,
  UserCircle,
} from 'lucide-react';
import { artistImage, mapSectionLabels, venueCapacity, venueSections } from '../data/ticketData';

const ticketListings = [
  {
    section: '538',
    row: 'G',
    price: 'R935',
    ticket: '1 ticket',
    capacity: 550,
    tags: ['Best price', 'Viewed'],
  },
  {
    section: '531',
    row: 'X',
    price: 'R959',
    ticket: '1 ticket',
    capacity: 550,
    tags: [],
  },
  {
    section: '545',
    row: 'ROW',
    price: 'R1,093',
    ticket: '1 ticket',
    capacity: 550,
    aisle: true,
    tags: ['Best deal', '2 tickets remaining in this listing', 'Last tickets'],
  },
  {
    section: '535',
    row: 'ROW',
    price: 'R1,093',
    ticket: '1 ticket',
    capacity: 550,
    aisle: true,
    tags: [],
  },
  {
    section: '536',
    row: 'ROW',
    price: 'R1,093',
    ticket: '1 ticket',
    capacity: 550,
    aisle: true,
    tags: [],
  },
  {
    section: 'GENERAL-ADMISSION',
    row: 'Standing',
    price: 'R1,250',
    ticket: '18,500 tickets',
    capacity: 18500,
    tags: ['Best deal'],
  },
  {
    section: 'FRONT-ZONE-NORTH',
    row: 'Standing',
    price: 'R3,674',
    ticket: '12,000 tickets',
    capacity: 12000,
    tags: ['Last tickets'],
  },
];

function TicketsPage({ onHome, onCheckout }) {
  return (
    <main className="h-screen overflow-hidden bg-[#f4f5f7] text-[#06152b]">
      <header className="h-[92px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8">
        <button className="flex items-center gap-4 text-left" onClick={onHome}>
          <span className="relative block w-[70px] h-[70px] rounded overflow-hidden bg-slate-200">
            <img alt="J. Cole" className="h-full w-full object-cover" src={artistImage} />
          </span>

          <span className="leading-tight">
            <span className="block text-[18px] font-extrabold">J. Cole</span>
            <span className="block text-[16px] mt-1">Sat - Dec 12 - 6:00 PM</span>
            <span className="block text-[16px] mt-1">
              FNB Stadium, Johannesburg, Gauteng, South Africa
            </span>
          </span>
        </button>

        <div className="flex items-center gap-5">
          <button className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center">
            <Heart size={18} />
          </button>
          <button className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center">
            <Share2 size={17} />
          </button>

          <div className="text-slate-500 font-semibold text-sm">
            ZAR <span className="mx-2 text-slate-300">|</span> EN
          </div>

          <div className="h-[54px] w-[365px] rounded-xl border border-slate-300 flex items-center px-4 gap-3">
            <Search size={23} />
            <span className="text-slate-500 text-[15px]">
              Search events, artists, teams and more
            </span>
          </div>

          <nav className="flex items-center gap-5 font-extrabold text-[16px]">
            <span>Sell</span>
            <span>My Tickets</span>
            <span>Sign In</span>
          </nav>

          <UserCircle size={39} className="text-[#4d871e]" />
        </div>
      </header>

      <div className="h-[28px] bg-[#fde8ef] border-b border-[#f8cbd8] flex items-center justify-center gap-1.5 text-[#e60046] text-[14px] font-semibold">
        <Flame size={15} fill="currentColor" />
        Selling fast
      </div>

      <section className="grid grid-cols-[1fr_660px] h-[calc(100vh-120px)]">
        <div className="relative bg-[#f5f6f8] overflow-hidden">
          <div className="absolute right-4 top-2 z-20 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <button className="w-11 h-10 flex items-center justify-center text-2xl font-semibold border-b">
              +
            </button>
            <button className="w-11 h-10 flex items-center justify-center text-2xl text-slate-400">
              -
            </button>
          </div>

          <div
            className="relative mx-auto"
            style={{
              width: 'min(760px, calc(100% - 48px), calc((100vh - 152px) * 1.0692))',
              aspectRatio: '1297 / 1213',
            }}
          >
            <img
              alt="FNB Stadium seating map"
              className="h-full w-full object-contain"
              src="/fnb-stadium-map.svg"
            />
            <div className="absolute inset-0">
              {mapSectionLabels.map(({ section, left, top, price, note }) => (
                <button
                  className="tag-box"
                  key={`${section}-${left}-${top}`}
                  onClick={onCheckout}
                  style={{ left, top }}
                  title={`Section ${section}`}
                >
                  <span className="text-[10px] font-extrabold text-[#1b6c15] leading-none">
                    {section}
                  </span>
                  <span className="text-[13px] font-bold text-gray-900 leading-none mt-1">
                    {price}
                  </span>
                  {note && (
                    <span className="text-[11px] text-[#d9147d] font-bold mt-1 mb-0.5 leading-none">
                      {note}
                    </span>
                  )}
                  <span className="tag-arrow" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="bg-white border-l border-slate-200 h-full overflow-y-auto">
          <div className="sticky top-0 bg-white z-10 border-b border-slate-200 h-[52px] px-5 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-[18px]">{venueSections.length} sections</h2>
              <p className="text-[12px] font-semibold text-slate-500">
                {venueCapacity.toLocaleString()} seat venue inventory
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center">
                <SlidersHorizontal size={19} />
              </button>

              <button className="h-10 rounded-lg border border-slate-300 px-4 flex items-center gap-2 font-bold text-[15px]">
                Recommended <ChevronDown size={17} />
              </button>
            </div>
          </div>

          {ticketListings.map((item, index) => (
            <button
              className="w-full text-left px-5 py-[20px] border-b border-slate-200 hover:bg-slate-50 transition-colors"
              key={`${item.section}-${index}`}
              onClick={onCheckout}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-[17px] font-extrabold">Section {item.section}</h3>
                  <p className="mt-2 text-[14px] font-extrabold">Row {item.row}</p>
                  <p className="mt-2 text-[15px]">{item.ticket}</p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    Section capacity {item.capacity.toLocaleString()}
                  </p>

                  {item.aisle && (
                    <div className="mt-1 flex items-center gap-2 text-[14px] text-slate-600">
                      <Ticket size={15} />
                      <span>Aisle seat</span>
                    </div>
                  )}

                  <div className="mt-1 flex items-center gap-2 text-[14px] text-slate-600">
                    <Eye size={16} />
                    <span>Clear view</span>
                  </div>
                </div>

                <div className="text-[21px] font-extrabold">{item.price}</div>
              </div>

              {item.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.tags.map((tag) => (
                    <ListingTag label={tag} key={tag} />
                  ))}
                </div>
              )}
            </button>
          ))}
        </aside>
      </section>
    </main>
  );
}

function ListingTag({ label }) {
  if (label === 'Best price' || label === 'Best deal') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#d8ffc9] text-[#1b6c15] text-[14px] font-bold px-2 py-1 rounded-md">
        <Tag size={15} />
        {label}
        <Info size={13} />
      </span>
    );
  }

  if (label === 'Viewed') {
    return (
      <span className="bg-slate-200 text-slate-800 text-[13px] font-bold px-2 py-1 rounded-md">
        Viewed
      </span>
    );
  }

  if (label === 'Last tickets') {
    return (
      <span className="bg-[#fde6ee] text-[#e60046] text-[14px] font-bold px-2 py-1 rounded-md inline-flex items-center gap-1">
        Last tickets <Info size={13} />
      </span>
    );
  }

  return <span className="text-[#e60046] text-[14px] font-bold">{label}</span>;
}

export default TicketsPage;
