import { artistImage, listings } from '../data/ticketData';

function Header() {
  return (
    <header className="border-b border-gray-200 sticky top-0 bg-white z-50">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6 flex-1">
          <a href="#" className="text-[28px] font-bold tracking-tighter text-gray-800 leading-none pb-1">
            viagogo
          </a>
          <div className="relative w-full max-w-[400px] hidden md:block">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              className="w-full bg-[#f1f3f4] border-none rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder-gray-500 font-medium"
              placeholder="Search events, artists, teams and more"
              type="text"
            />
          </div>
        </div>

        <nav className="flex items-center gap-6 text-[15px] font-semibold text-gray-900">
          {['Explore', 'Sell', 'Favourites', 'My Tickets', 'Sign In'].map((item) => (
            <a className="hidden lg:block hover:text-gray-600" href="#" key={item}>
              {item}
            </a>
          ))}
          <div className="flex items-center gap-4 border-l border-gray-200 pl-4">
            <button className="text-gray-600 hover:text-black">
              <UserOutlineIcon />
            </button>
            <button className="text-gray-600 hover:text-black">
              <BellIcon />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

function EventCard({ event, onTickets, largeGap = false }) {
  return (
    <div
      className={`border border-gray-200 rounded-[14px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        largeGap ? 'mb-8' : 'mb-3'
      } hover:shadow-md transition-shadow cursor-pointer`}
    >
      <div className="flex gap-4 items-center">
        <div className="flex flex-col items-center justify-center w-14 text-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">
            {event.month}
          </span>
          <span className="text-[26px] font-bold text-[#147a38] leading-none mb-0.5">
            {event.day}
          </span>
          <span className="text-xs text-gray-500 font-medium">{event.dow}</span>
        </div>
        <div className="border-l border-gray-200 pl-4 py-1">
          <h4 className="font-bold text-[17px] text-gray-900 mb-0.5">{event.title}</h4>
          <p className="text-[14px] text-gray-500 flex items-center gap-1.5 mb-1.5">
            {event.details}
          </p>
          {event.badge && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${event.badgeClass}`}
            >
              <CheckIcon />
              {event.badge}
            </span>
          )}
        </div>
      </div>
      <button
        className="border border-gray-300 rounded-[8px] px-5 py-2 text-[15px] font-semibold text-gray-700 hover:bg-gray-50 whitespace-nowrap self-start sm:self-auto"
        onClick={onTickets}
      >
        See tickets
      </button>
    </div>
  );
}

function ArtistSidebar() {
  return (
    <aside className="hidden lg:block relative">
      <div className="rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white overflow-hidden sticky top-24">
        <div className="w-full h-[220px] bg-gray-200 relative">
          <img
            alt="Artist Performing"
            className="w-full h-full object-cover object-top opacity-90 mix-blend-multiply"
            src={artistImage}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent mix-blend-overlay" />
        </div>
        <div className="p-5">
          <div className="flex gap-2 mb-4">
            <span className="bg-[#ebf8ee] text-[#147a38] text-[13px] px-2.5 py-0.5 rounded font-medium">
              Rap
            </span>
            <span className="bg-[#ebf8ee] text-[#147a38] text-[13px] px-2.5 py-0.5 rounded font-medium">
              North Carolina Hip Hop
            </span>
          </div>
          <p className="text-[14px] text-gray-500 leading-relaxed mb-5">
            Jermaine Lamarr Cole, better known as J. Cole, is a rapper and producer raised in
            Fayetteville, North Carolina. He gained a passion for rap at a young age{' '}
            <a className="font-bold text-[#147a38] hover:underline" href="#">
              See more
            </a>
          </p>
          <div className="bg-[#181818] rounded-[10px] p-3 flex items-center gap-3 text-white mb-6 relative group cursor-pointer hover:bg-[#282828] transition-colors">
            <div className="w-12 h-12 bg-gray-700 rounded shadow-md overflow-hidden">
              <img
                alt=""
                className="w-full h-full object-cover"
                src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop"
              />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold leading-tight">No Role Modelz</div>
              <div className="text-[12px] text-gray-400 mt-0.5">J. Cole</div>
            </div>
            <button className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform">
              <PlayIcon />
            </button>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {['S', 'X', 'I', 'F', 'Y'].map((item) => (
              <a
                className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white hover:opacity-80 transition-opacity text-xs font-bold"
                href="#"
                key={item}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function EventFlowHeader({ onBack }) {
  return (
    <header className="border-b border-gray-200 bg-white z-50 flex-shrink-0">
      <div className="px-6 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            alt="J. Cole"
            className="w-12 h-12 rounded object-cover cursor-pointer shadow-sm hover:opacity-80 transition-opacity"
            onClick={onBack}
            src={artistImage}
          />
          <div className="flex flex-col">
            <h2 className="font-bold text-[16px] leading-tight text-gray-900">J. Cole</h2>
            <div className="text-[13.5px] text-gray-600 flex items-center gap-1.5 mt-0.5">
              <span>Sat - Dec 12 - 6:00 PM</span>
              <span className="text-gray-300">-</span>
              <span className="truncate max-w-[200px] md:max-w-none">
                FNB Stadium, Johannesburg, Gauteng, South Africa
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5 font-bold text-gray-800 pl-2 text-[14px]">
          <span className="hidden md:block">Sell</span>
          <span className="hidden md:block whitespace-nowrap">My Tickets</span>
          <span className="hidden sm:block whitespace-nowrap">Sign In</span>
          <button className="w-8 h-8 bg-[#4b7b2b] rounded-full text-white flex items-center justify-center hover:bg-[#3d6323] transition-colors">
            <UserIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function SellingFast({ centered = false }) {
  return (
    <div
      className={`bg-[#fef1f2] text-[#e11d48] text-[13px] font-semibold py-1.5 flex items-center gap-1.5 flex-shrink-0 w-full border-b border-[#fecdd3] ${
        centered ? 'justify-center' : 'px-6'
      }`}
    >
      <FlameIcon />
      Selling fast
    </div>
  );
}

function StadiumMap({ mini = false }) {
  return (
    <img
      alt={mini ? 'Selected section on FNB Stadium map' : 'FNB Stadium seating map'}
      className="absolute inset-0 h-full w-full object-contain select-none pointer-events-none"
      src="/maps/fnb-stadium-map.svg"
    />
  );
}

function ListingsSidebar({ onCheckout }) {
  return (
    <aside className="w-full md:w-[420px] bg-white border-l border-gray-200 flex flex-col z-30 shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)] flex-shrink-0 relative">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white z-10">
        <h3 className="font-bold text-[15px] text-gray-900">52 listings</h3>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            <SlidersIcon />
          </button>
          <button className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 text-[14px] font-semibold text-gray-800 hover:bg-gray-50 transition-colors">
            Recommended
            <ChevronIcon />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {listings.map((listing) => (
          <button
            className="w-full text-left p-5 border-b border-gray-100 hover:bg-gray-50 cursor-pointer flex flex-col group transition-colors"
            key={`${listing.section}-${listing.row}`}
            onClick={onCheckout}
          >
            <div className="flex justify-between w-full">
              <div className="font-bold text-[15px] text-gray-900">{listing.section}</div>
              <div className="font-bold text-[17px] text-gray-900 group-hover:underline">
                {listing.price}
              </div>
            </div>
            <div className="text-[14px] font-bold text-gray-800 mt-0.5">{listing.row}</div>
            <div className="text-[13px] text-gray-600 mt-1.5">1 ticket</div>
            <div className="flex items-center gap-1.5 text-[13px] text-gray-600 mt-0.5">
              <EyeIcon />
              Clear view
            </div>
            {listing.badge && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1 bg-[#e7f5e8] text-[#147a38] text-[13px] font-bold px-2 py-0.5 rounded">
                  {listing.badge}
                </span>
                {listing.last && (
                  <span className="text-[#e11d48] text-[13px] font-semibold">
                    2 tickets remaining in this listing
                  </span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}

function CheckoutHeader({ onBack, timer, onCurrency, onLanguage }) {
  return (
    <header className="border-b border-gray-200 bg-white z-50 flex-shrink-0 sticky top-0">
      <div className="px-6 h-[72px] flex items-center justify-between max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-4">
          <img
            alt="J. Cole"
            className="w-12 h-12 rounded object-cover cursor-pointer shadow-sm hover:opacity-80 transition-opacity"
            onClick={onBack}
            src={artistImage}
          />
          <div className="flex flex-col">
            <h2 className="font-bold text-[16px] leading-tight text-[#0f5424] hover:underline cursor-pointer" onClick={onBack}>
              J. Cole
            </h2>
            <div className="text-[13.5px] text-gray-900 font-medium mt-0.5">Sat - 12 Dec - 18:00</div>
            <div className="text-[13px] text-[#0f5424] hover:underline cursor-pointer mt-0.5">
              FNB Stadium, Johannesburg, Gauteng, South Africa
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5 text-[14px]">
          <div className="hidden sm:flex items-center gap-2 font-bold text-gray-800 border-l border-gray-200 pl-5">
            <ClockIcon />
            <span className="text-[15px]">{timer}</span>
          </div>
          <div className="hidden md:flex items-center gap-3 border-l border-gray-200 pl-5 h-8">
            <button className="font-bold text-gray-600 hover:text-gray-900" onClick={onCurrency} type="button">
              ZAR
            </button>
            <button
              className="font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1"
              onClick={onLanguage}
              type="button"
            >
              EN <ChevronIcon />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function OrderSummary({ onFinal, seatLabel = 'Section 538 - Row G' }) {
  return (
    <aside>
      <div className="bg-white rounded-[14px] border border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="bg-[#fef8f9] border-b border-[#fce7ea] px-5 py-3 flex items-center gap-2">
          <TicketIcon />
          <span className="text-[14px] text-gray-900 font-medium">
            Last tickets remaining for {seatLabel}
          </span>
        </div>
        <div className="p-6">
          <h2 className="text-[20px] font-bold text-gray-900 mb-5">Order summary</h2>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[15px] text-gray-800">Ticket price</span>
            <span className="text-[15px] font-medium text-gray-900">1 x R935</span>
          </div>
          <p className="text-[13px] text-gray-500 mb-6">
            Tax, handling fee, and booking fee not included
          </p>
          <div className="grid grid-cols-[80px_1fr] gap-4">
            <select className="w-full appearance-none border border-gray-300 rounded-lg px-4 py-3.5 text-[16px] font-medium text-gray-900 bg-white focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 cursor-pointer">
              <option>1</option>
            </select>
            <button
              className="w-full bg-[#417516] hover:bg-[#345c12] text-white rounded-lg py-3.5 font-bold text-[16px] transition-colors flex justify-center items-center"
              onClick={onFinal}
            >
              Confirm Quantity
            </button>
          </div>
        </div>
      </div>
      <Guarantees />
    </aside>
  );
}

function FinalOrderCard({ onDetails, seatLabel = 'Section 538 - Row G' }) {
  return (
    <aside>
      <div className="bg-white rounded-[14px] border border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="bg-[#fef8f9] border-b border-[#fce7ea] px-5 py-3 flex items-center gap-2">
          <TicketIcon />
          <span className="text-[14px] text-gray-900 font-medium">
            Last tickets remaining for {seatLabel}
          </span>
        </div>
        <div className="p-6">
          <Badge tone="danger">High demand</Badge>
          <div className="flex justify-between items-start gap-4 mt-4">
            <div>
              <h3 className="font-bold text-[16px] text-gray-900 mb-0.5">J. Cole</h3>
              <p className="text-[14px] text-gray-600 mb-0.5">Sat 12 Dec - 18:00</p>
              <p className="text-[14px] text-gray-600 leading-snug">
                FNB Stadium - Johannesburg, Gauteng, South Africa
              </p>
            </div>
            <img alt="J. Cole" className="w-[60px] h-[60px] rounded-lg object-cover shadow-sm shrink-0" src={artistImage} />
          </div>
          <div className="my-5 border-t border-gray-100" />
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-[16px] text-gray-900 mb-0.5">{seatLabel}</h3>
              <p className="text-[14px] text-gray-600">1 ticket</p>
            </div>
            <button
              className="border border-gray-300 rounded-md px-4 py-1.5 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={onDetails}
              type="button"
            >
              Details
            </button>
          </div>
          <div className="my-5 border-t border-gray-100" />
          <div className="flex justify-between items-center mb-1">
            <span className="text-[14px] text-gray-800">Ticket price</span>
            <span className="text-[14px] font-medium text-gray-900">1 x R935</span>
          </div>
          <p className="text-[12px] text-gray-500">Tax, handling fee, and booking fee not included</p>
        </div>
      </div>
      <Guarantees />
    </aside>
  );
}

function Badge({ children, tone }) {
  const colors =
    tone === 'warning'
      ? 'bg-[#fff8e6] text-[#b4690e] border-[#ffe4a0]'
      : 'bg-[#fef1f2] text-[#e11d48] border-[#fecdd3]';
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-md border ${colors}`}>
      {children}
    </span>
  );
}

function Feature({ title, text }) {
  return (
    <div className="flex gap-4">
      <EyeIcon className="w-6 h-6 text-gray-700 mt-0.5" />
      <div>
        <h3 className="font-bold text-[16px] text-gray-900">{title}</h3>
        {text && <p className="text-[14px] text-gray-500 mt-0.5">{text}</p>}
      </div>
    </div>
  );
}

function Guarantees() {
  return (
    <div className="mt-8 flex flex-col gap-6 px-2">
      <Feature title="100% Order Guarantee" text="We back every order so you can buy and sell tickets with 100% confidence." />
      <Feature title="Resell Anytime" text="Not sure if you can make it to this event? You can resell your tickets at any time." />
    </div>
  );
}

function Footer({ onAction }) {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto flex-shrink-0">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex flex-col md:flex-row items-center justify-between text-[13px] text-gray-500 font-medium">
        <div className="flex items-center gap-4">
          {['User Agreement', 'Privacy Notice', 'Cookie Notice', 'Share'].map((item) => (
            <button
              className="hover:underline hover:text-gray-800"
              key={item}
              onClick={() => onAction?.(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-2 md:mt-0">
          <ShieldIcon />
          Every order is 100% guaranteed
        </div>
      </div>
    </footer>
  );
}

function Icon({ children, className = 'w-4 h-4 text-gray-500', fill = 'none' }) {
  return (
    <svg className={className} fill={fill} stroke="currentColor" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function HeartIcon() {
  return <Icon><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon>;
}

function SearchIcon({ className }) {
  return <Icon className={className}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon>;
}

function UserIcon({ className = 'w-4 h-4' }) {
  return <Icon className={className} fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" stroke="none" /></Icon>;
}

function UserOutlineIcon() {
  return <Icon className="w-5 h-5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon>;
}

function BellIcon() {
  return <Icon className="w-5 h-5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon>;
}

function LocationIcon() {
  return <Icon className="w-4 h-4 text-white"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /></Icon>;
}

function ChevronIcon() {
  return <Icon className="w-4 h-4 text-gray-500"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon>;
}

function CheckIcon() {
  return <Icon className="w-3 h-3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon>;
}

function PlayIcon() {
  return <svg className="w-4 h-4 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>;
}

function FlameIcon() {
  return <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path clipRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a2.64 2.64 0 01-.945-1.067A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03z" fillRule="evenodd" /></svg>;
}

function SlidersIcon() {
  return <Icon className="w-5 h-5 text-gray-700"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon>;
}

function EyeIcon({ className = 'w-4 h-4' }) {
  return <Icon className={className}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon>;
}

function ClockIcon() {
  return <Icon className="w-4 h-4"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon>;
}

function TicketIcon() {
  return <svg className="w-4 h-4 text-[#d9147d]" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H9v-2h6v2zm0-4H9v-2h6v2zm3-4H6V8h12v2z" /></svg>;
}

function ShieldIcon() {
  return <Icon className="w-4 h-4"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon>;
}

function GoogleIcon() {
  return <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>;
}

export {
  Header, EventCard, ArtistSidebar, EventFlowHeader, SellingFast, StadiumMap, ListingsSidebar,
  CheckoutHeader, OrderSummary, FinalOrderCard, Badge, Feature, Footer, HeartIcon, UserIcon,
  LocationIcon, ChevronIcon, GoogleIcon,
};
