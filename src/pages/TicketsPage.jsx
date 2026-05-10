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
import {
  artistImage,
  stadiumSections,
  totalVenueRemaining,
  venueCapacity,
  venueSections,
} from '../data/ticketData';

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

          <div className="relative mx-auto w-[min(900px,calc(100%-48px),calc((100vh-152px)*1.08))] aspect-[960/890]">
            <SvgStadiumMap sections={stadiumSections} onCheckout={onCheckout} />
          </div>
        </div>

        <aside className="bg-white border-l border-slate-200 h-full overflow-y-auto">
          <div className="sticky top-0 bg-white z-10 border-b border-slate-200 h-[52px] px-5 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-[18px]">{venueSections.length} sections</h2>
              <p className="text-[12px] font-semibold text-slate-500">
                {venueCapacity.toLocaleString()} capacity / {totalVenueRemaining.toLocaleString()} left
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

function SvgStadiumMap({ sections, onCheckout }) {
  const byId = Object.fromEntries(sections.map((section) => [section.id, section]));
  const svgSections = buildSvgSections(byId);

  return (
    <>
      <svg className="h-full w-full" viewBox="0 0 960 890">
        <path
          d="M70 80 C180 10 420 5 760 20 C850 45 910 150 930 310 C955 520 910 760 820 850 C500 890 200 870 80 700 C30 520 25 210 70 80Z"
          fill="#f2f2f2"
          stroke="#d5d5d5"
          strokeWidth="3"
        />
        <path
          d="M155 115 C260 55 535 50 735 78 L740 178 C565 155 310 160 165 215Z"
          fill="#e5e5e5"
          stroke="white"
          strokeWidth="3"
        />
        <path
          d="M80 230 C140 180 250 150 380 150 L382 740 C245 740 135 700 82 615 C50 505 50 335 80 230Z"
          fill="#e5e5e5"
          stroke="white"
          strokeWidth="3"
        />
        <path
          d="M380 740 C530 775 735 735 820 630 L825 745 C730 850 500 870 300 835Z"
          fill="#e5e5e5"
          stroke="white"
          strokeWidth="3"
        />
        <path
          d="M745 205 C830 275 855 590 790 680 L640 620 C690 535 695 355 640 260Z"
          fill="#d8d8d8"
          stroke="white"
          strokeWidth="3"
        />

        {svgSections.map(({ section, shape }) => (
          <g
            id={`section-${section.id.toLowerCase()}`}
            key={section.id}
            onClick={onCheckout}
            className="cursor-pointer"
          >
            {shape.type === 'path' ? (
              <path
                d={shape.d}
                fill={section.available > 0 ? '#b8df8a' : '#e5e5e5'}
                stroke="white"
                strokeWidth="2"
              />
            ) : (
              <rect
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                rx="4"
                fill={section.available > 0 ? '#b8df8a' : '#e5e5e5'}
                stroke="white"
                strokeWidth="2"
              />
            )}
            {shape.label && (
              <text
                x={shape.label.x}
                y={shape.label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="18"
                fontWeight="700"
                fill="#315315"
              >
                {shape.label.text}
              </text>
            )}
          </g>
        ))}

        <rect x="420" y="310" width="180" height="290" rx="32" fill="#b8df8a" stroke="white" strokeWidth="3" />
        <rect x="600" y="300" width="225" height="120" rx="8" fill="#b8df8a" stroke="white" strokeWidth="3" />
        <rect x="600" y="455" width="225" height="145" rx="8" fill="#b8df8a" stroke="white" strokeWidth="3" />
        <rect x="475" y="430" width="70" height="70" rx="10" fill="#b8df8a" stroke="white" strokeWidth="3" />
        <text x="510" y="455" textAnchor="middle" fontSize="14" fontWeight="700" fill="#315315">
          VIP
        </text>
        <text x="510" y="470" textAnchor="middle" fontSize="12" fontWeight="700" fill="#315315">
          1K
        </text>
        <text x="505" y="462" textAnchor="middle" fontSize="14" fontWeight="700" fill="#315315" transform="rotate(-90 505 462)">
          GENERAL ADMISSION
        </text>
        <text x="708" y="360" textAnchor="middle" fontSize="16" fontWeight="700" fill="#315315">
          FRONT ZONE
        </text>
        <text x="708" y="380" textAnchor="middle" fontSize="16" fontWeight="700" fill="#315315">
          STANDING
        </text>
        <text x="708" y="520" textAnchor="middle" fontSize="16" fontWeight="700" fill="#315315">
          FRONT ZONE
        </text>
        <text x="708" y="540" textAnchor="middle" fontSize="16" fontWeight="700" fill="#315315">
          STANDING
        </text>
        <rect x="840" y="350" width="60" height="220" fill="#999999" />
        <text x="875" y="465" textAnchor="middle" fontSize="26" fontWeight="800" fill="white" transform="rotate(90 875 465)">
          STAGE
        </text>
      </svg>

      {badgeSections(sections).map((section) => (
        <button
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-white px-3 py-1 text-center text-sm font-bold shadow-md"
          key={section.id}
          onClick={onCheckout}
          style={{ left: section.badgeX, top: section.badgeY }}
        >
          <div className="text-[10px] font-extrabold text-[#1b6c15]">{section.shortName}</div>
          <div>{formatPrice(section.price)}</div>
          <div className="text-xs font-bold text-pink-500">{formatLeft(section.available)}</div>
        </button>
      ))}
    </>
  );
}

function buildSvgSections(byId) {
  const sections = [];
  const addRect = (id, x, y, width, height, labelText = id) => {
    if (byId[id]) {
      sections.push({
        section: byId[id],
        shape: { type: 'rect', x, y, width, height, label: { x: x + width / 2, y: y + height / 2, text: labelText } },
      });
    }
  };

  [542, 543, 544, 545, 500, 501, 502, 503].forEach((id, index) =>
    addRect(String(id), 240 + index * 62, 55 + (index > 5 ? 8 : 0), 62, 82),
  );
  [540, 539, 538, 537, 536, 535, 534, 533, 532].forEach((id, index) =>
    addRect(String(id), 90 + Math.max(index - 3, 0) * 10, 165 + index * 62, 78, 58),
  );
  [531, 530, 529, 528, 527, 526, 525, 524, 523, 522, 521, 520].forEach((id, index) =>
    addRect(String(id), 245 + index * 52, 760 - Math.abs(index - 4) * 5, 54, 60),
  );
  [233, 234, 232, 231, 230, 229, 228, 227, 226, 225, 224].forEach((id, index) =>
    addRect(String(id), 255 - Math.min(index, 6) * 10 + Math.max(index - 6, 0) * 45, 155 + index * 46, 48, 42),
  );
  [222, 221, 220, 219, 218, 217, 216].forEach((id, index) =>
    addRect(String(id), 395 + index * 67, 700 - index * 3, 56, 38),
  );
  [143, 142, 141, 140, 139, 138, 137, 134].forEach((id, index) =>
    addRect(String(id), 310 + Math.max(index - 5, 0) * 42, 255 + index * 51, 54, 45),
  );
  [133, 132, 131, 130, 129, 128, 127, 126, 125, 124, 123, 122].forEach((id, index) =>
    addRect(String(id), 435 + index * 43, 630 - Math.min(index, 5) * 3, 42, 44),
  );
  [146, 147, 148, 149, 101, 102, 103, 104, 105].forEach((id, index) =>
    addRect(String(id), 405 + index * 52, 210 + Math.max(index - 5, 0) * 8, 48, 48),
  );

  sections.push(
    { section: byId['GENERAL-ADMISSION'], shape: { type: 'path', d: 'M335 315 L420 310 L420 600 L340 590 C315 510 310 395 335 315Z' } },
    { section: byId['FRONT-ZONE-NORTH'], shape: { type: 'path', d: 'M545 300 L600 300 L600 420 L545 420Z' } },
    { section: byId['FRONT-ZONE-SOUTH'], shape: { type: 'path', d: 'M545 455 L600 455 L600 600 L545 600Z' } },
    { section: byId.VIP, shape: { type: 'path', d: 'M475 430 L545 430 L545 500 L475 500Z' } },
  );

  return sections.filter(({ section }) => section);
}

function badgeSections(sections) {
  const badgePositions = {
    '542': ['28%', '9%'],
    '545': ['52%', '8%'],
    '503': ['84%', '12%'],
    '538': ['9%', '42%'],
    '537': ['9%', '53%'],
    '531': ['31%', '95%'],
    '520': ['96%', '73%'],
    '143': ['30%', '36%'],
    '146': ['45%', '31%'],
    '101': ['69%', '31%'],
    '105': ['92%', '39%'],
    'GENERAL-ADMISSION': ['41%', '56%'],
    'VIP': ['52%', '55%'],
    'FRONT-ZONE-NORTH': ['72%', '43%'],
  };

  return sections
    .filter((section) => section.available > 0 && badgePositions[section.id])
    .map((section) => ({
      ...section,
      shortName:
        section.id === 'GENERAL-ADMISSION'
          ? 'GA'
          : section.id === 'FRONT-ZONE-NORTH'
            ? 'FRONT'
            : section.id,
      badgeX: badgePositions[section.id][0],
      badgeY: badgePositions[section.id][1],
    }));
}

function formatPrice(price) {
  return `R${price.toLocaleString('en-ZA')}`;
}

function formatLeft(available) {
  if (available >= 1000) return `${Math.round(available / 100) / 10}K left`;
  return `${available} left`;
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
