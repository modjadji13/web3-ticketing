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
import { useMemo, useState } from 'react';
import {
  artistImage,
  seatIdForSection,
  seatLabelFromId,
  venueCapacity,
  venueSections,
} from '../data/ticketData';

const mapPriceTags = [
  { section: '541', left: '29%', top: '8%', price: 'R1,093', note: '11 left' },
  { section: '543', left: '43%', top: '5%', price: 'R1,093', note: '8 left' },
  { section: '500', left: '62%', top: '4%', price: 'R1,093', note: '10 left' },
  { section: '539', left: '17%', top: '17%', price: 'R1,093' },
  { section: '538', left: '14%', top: '24%', price: 'R896' },
  { section: '537', left: '12%', top: '32%', price: 'R772', hot: true },
  { section: '536', left: '12%', top: '39%', price: 'R675', hot: true },
  { section: '535', left: '13%', top: '45%', price: 'R690', note: 'Amazing' },
  { section: '534', left: '12%', top: '52%', price: 'R675', hot: true },
  { section: '533', left: '13%', top: '59%', price: 'R675', deal: true },
  { section: '532', left: '13%', top: '66%', price: 'R657', value: true },
  { section: '531', left: '17%', top: '74%', price: 'R959' },
  { section: '530', left: '20%', top: '80%', price: 'R1,093', note: '12 left' },
  { section: '528', left: '32%', top: '91%', price: 'R1,093' },
  { section: '526', left: '45%', top: '92%', price: 'R1,093', note: '4 left' },
  { section: '524', left: '58%', top: '91%', price: 'R675' },
  { section: '231', left: '31%', top: '20%', price: 'R2,519', note: '5 left' },
  { section: '147', left: '50%', top: '24%', price: 'R2,221' },
  { section: '225', left: '29%', top: '66%', price: 'R4,882', note: '8 left' },
  { section: '222', left: '38%', top: '79%', price: 'R2,519', note: '4 left' },
  { section: '125', left: '65%', top: '75%', price: 'R3,663', note: '2 left' },
  { section: '217', left: '73%', top: '81%', price: 'R3,350', note: '2 left' },
  { section: 'VIP', left: '54%', top: '14%', price: 'R8,993', note: '2 left' },
  { section: 'GA', left: '48%', top: '49%', price: 'R2,321', note: '3 left' },
  { section: 'FRONT', left: '63%', top: '49%', price: 'R5,466', note: '2 left' },
];

const ticketListings = [
  {
    section: '538',
    row: 'G',
    price: 'R935',
    ticket: '1 ticket',
    capacity: 550,
    seatId: '538-G',
    tags: ['Best price', 'Viewed'],
  },
  {
    section: '531',
    row: 'X',
    price: 'R959',
    ticket: '1 ticket',
    capacity: 550,
    seatId: '531-X',
    tags: [],
  },
  {
    section: '545',
    row: 'ROW',
    price: 'R1,093',
    ticket: '1 ticket',
    capacity: 550,
    seatId: '545-ROW',
    aisle: true,
    tags: ['Best deal', '2 tickets remaining in this listing', 'Last tickets'],
  },
  {
    section: '535',
    row: 'ROW',
    price: 'R1,093',
    ticket: '1 ticket',
    capacity: 550,
    seatId: '535-ROW',
    aisle: true,
    tags: [],
  },
  {
    section: '536',
    row: 'ROW',
    price: 'R1,093',
    ticket: '1 ticket',
    capacity: 550,
    seatId: '536-ROW',
    aisle: true,
    tags: [],
  },
  {
    section: 'GENERAL-ADMISSION',
    row: 'Standing',
    price: 'R1,250',
    ticket: '18,500 tickets',
    capacity: 18500,
    seatId: 'GENERAL-ADMISSION-1',
    tags: ['Best deal'],
  },
  {
    section: 'FRONT-ZONE-NORTH',
    row: 'Standing',
    price: 'R3,674',
    ticket: '12,000 tickets',
    capacity: 12000,
    seatId: 'FRONT-ZONE-NORTH-1',
    tags: ['Last tickets'],
  },
];

function TicketsPage({ onHome, onCheckout, seats = [] }) {
  const [favorite, setFavorite] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState('recommended');
  const [mapZoom, setMapZoom] = useState(1);
  const unavailableSeatIds = new Set(
    seats.filter((seat) => seat.status === 'reserved' || seat.status === 'held').map((seat) => seat.id),
  );
  const visibleMapPriceTags = mapPriceTags
    .map((tag) => ({ ...tag, seatId: seatIdForSection(tag.section) }))
    .filter((tag) => !unavailableSeatIds.has(tag.seatId));
  const visibleTicketListings = useMemo(() => {
    const filteredListings = ticketListings.filter((listing) => {
      const text = `${listing.section} ${listing.row} ${listing.price}`.toLowerCase();
      return !unavailableSeatIds.has(listing.seatId) && text.includes(searchTerm.toLowerCase());
    });

    if (sortMode === 'lowest') {
      return [...filteredListings].sort((a, b) => priceNumber(a.price) - priceNumber(b.price));
    }

    return filteredListings;
  }, [unavailableSeatIds, searchTerm, sortMode]);
  const unavailableVisibleSeats = seats
    .filter((seat) => seat.status === 'reserved' || seat.status === 'held')
    .slice(0, 3);

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
          <button
            className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center"
            onClick={() => {
              setFavorite((value) => !value);
              setMessage(favorite ? 'Removed from favourites.' : 'Added to favourites.');
            }}
            type="button"
          >
            <Heart
              fill={favorite ? 'currentColor' : 'none'}
              size={18}
            />
          </button>
          <button
            className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center"
            onClick={async () => {
              const shareData = { title: 'J. Cole Tickets', url: window.location.href };
              if (navigator.share) {
                await navigator.share(shareData).catch(() => undefined);
              } else {
                await navigator.clipboard?.writeText(window.location.href);
                setMessage('Ticket page link copied.');
              }
            }}
            type="button"
          >
            <Share2 size={17} />
          </button>

          <button
            className="text-slate-500 font-semibold text-sm hover:text-slate-900"
            onClick={() => setMessage('Currency is fixed to ZAR and language is fixed to English for this demo.')}
            type="button"
          >
            ZAR <span className="mx-2 text-slate-300">|</span> EN
          </button>

          <label className="h-[54px] w-[365px] rounded-xl border border-slate-300 flex items-center px-4 gap-3">
            <Search size={23} />
            <input
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-slate-500"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search sections, rows, prices"
              value={searchTerm}
            />
          </label>

          <nav className="flex items-center gap-5 font-extrabold text-[16px]">
            {['Sell', 'My Tickets', 'Sign In'].map((item) => (
              <button key={item} onClick={() => setMessage(`${item}: demo action opened.`)} type="button">
                {item}
              </button>
            ))}
          </nav>

          <button onClick={() => setMessage('Account menu opened for the demo user.')} type="button">
            <UserCircle size={39} className="text-[#4d871e]" />
          </button>
        </div>
      </header>

      <div className="h-[28px] bg-[#fde8ef] border-b border-[#f8cbd8] flex items-center justify-center gap-1.5 text-[#e60046] text-[14px] font-semibold">
        <Flame size={15} fill="currentColor" />
        Selling fast
      </div>

      <section className="grid grid-cols-[1fr_660px] h-[calc(100vh-120px)]">
        <div className="relative bg-[#f5f6f8] overflow-hidden">
          <div className="absolute right-4 top-2 z-20 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <button
              className="w-11 h-10 flex items-center justify-center text-2xl font-semibold border-b"
              onClick={() => setMapZoom((zoom) => Math.min(1.25, Number((zoom + 0.1).toFixed(2))))}
              type="button"
            >
              +
            </button>
            <button
              className="w-11 h-10 flex items-center justify-center text-2xl text-slate-400"
              onClick={() => setMapZoom((zoom) => Math.max(0.85, Number((zoom - 0.1).toFixed(2))))}
              type="button"
            >
              -
            </button>
          </div>

          <div
            className="relative mx-auto"
            style={{
              width: 'min(820px, calc(100% - 48px), calc((100vh - 152px) * 1.07))',
              aspectRatio: '1297 / 1213',
              transform: `scale(${mapZoom})`,
              transformOrigin: 'center',
            }}
          >
            <StadiumAvailabilityMap />
            <div className="absolute inset-0">
              {visibleMapPriceTags.map(({ section, seatId, left, top, price, note, hot, deal, value }) => (
                <button
                  className="tag-box"
                  key={`${section}-${left}-${top}`}
                  onClick={() => onCheckout(seatId)}
                  style={{ left, top }}
                  title={`${section} maps to backend seat ${seatId}`}
                >
                  <span className="flex items-center gap-1 text-[13px] font-bold text-gray-900 leading-none">
                    {hot && <Flame size={14} fill="currentColor" className="text-[#e60046]" />}
                    {deal && <Tag size={14} fill="currentColor" className="text-[#7c3aed]" />}
                    {value && <span className="text-[#147a38]">$</span>}
                    {price}
                  </span>
                  {note && (
                    <span
                      className={`text-[11px] font-extrabold mt-1 mb-0.5 leading-none ${
                        note === 'Amazing' ? 'text-[#147a38]' : 'text-[#d9147d]'
                      }`}
                    >
                      {note}
                    </span>
                  )}
                  <span className="tag-arrow" />
                </button>
              ))}
            </div>
          </div>
          {unavailableVisibleSeats.length > 0 && (
            <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#147a38] shadow-md">
              Unavailable seats hidden: {unavailableVisibleSeats.map((seat) => seatLabelFromId(seat.id)).join(', ')}
            </div>
          )}
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
              <button
                className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center"
                onClick={() => setMessage('Filters are set to one ticket, clear view, available only.')}
                type="button"
              >
                <SlidersHorizontal size={19} />
              </button>

              <button
                className="h-10 rounded-lg border border-slate-300 px-4 flex items-center gap-2 font-bold text-[15px]"
                onClick={() => setSortMode((mode) => (mode === 'recommended' ? 'lowest' : 'recommended'))}
                type="button"
              >
                {sortMode === 'recommended' ? 'Recommended' : 'Lowest price'} <ChevronDown size={17} />
              </button>
            </div>
          </div>
          {message && <div className="px-5 py-3 text-[13px] font-semibold text-[#0a58ca]">{message}</div>}

          {visibleTicketListings.map((item, index) => (
            <button
              className="w-full text-left px-5 py-[20px] border-b border-slate-200 hover:bg-slate-50 transition-colors"
              key={`${item.section}-${index}`}
              onClick={() => onCheckout(item.seatId)}
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
          {unavailableVisibleSeats.length > 0 && (
            <div className="px-5 py-5 text-[14px] font-semibold text-[#147a38]">
              Held and bought seats are removed from available listings after the backend marks them unavailable.
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function priceNumber(price) {
  return Number(price.replace(/[^\d]/g, '')) || 0;
}

function StadiumAvailabilityMap() {
  return (
    <div className="absolute inset-0">
      <img
        alt="FNB Stadium map"
        className="h-full w-full select-none object-contain pointer-events-none"
        src="/maps/fnb-stadium-map.svg"
      />
    </div>
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
