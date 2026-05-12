export const SELECTED_SEAT_ID = '538-G';

export const DEFAULT_SEAT_ID = SELECTED_SEAT_ID;

const sectionSeatAliases = {
  '531': '531-X',
  '535': '535-ROW',
  '536': '536-ROW',
  '538': '538-G',
  '545': '545-ROW',
  GA: 'GENERAL-ADMISSION-1',
  'GENERAL-ADMISSION': 'GENERAL-ADMISSION-1',
  FRONT: 'FRONT-ZONE-NORTH-1',
  'FRONT-ZONE-NORTH': 'FRONT-ZONE-NORTH-1',
  VIP: 'VIP-1',
};

export function seatIdForSection(section) {
  return sectionSeatAliases[section] || `${section}-1`;
}

export function seatLabelFromId(seatId = DEFAULT_SEAT_ID) {
  if (seatId.startsWith('GENERAL-ADMISSION')) return 'General Admission';
  if (seatId.startsWith('FRONT-ZONE')) return 'Front Zone Standing';
  if (seatId.startsWith('VIP')) return 'VIP';

  const [section, row] = seatId.split('-');
  if (!row || /^\d+$/.test(row)) {
    return `Section ${section}`;
  }

  return `Section ${section} - Row ${row}`;
}

export const ticketEvent = {
  name: 'J. Cole',
  venue: 'FNB Stadium, Johannesburg, Gauteng, South Africa',
  price_lamports: 935_000_000,
  per_wallet_limit: 2,
  resale_cap_bps: 1_200,
  royalty_bps: 500,
};

export const artistImage =
  'https://images.unsplash.com/photo-1493225457124-a1a2a5f5f92e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

export const eventCards = [
  {
    month: 'Dec',
    day: '12',
    dow: 'Sat',
    title: 'J. Cole',
    details: '6:00 PM - Johannesburg, Gauteng, South Africa - FNB Stadium',
    badge: 'Hottest event',
    badgeClass: 'bg-[#e7f5e8] text-[#147a38]',
  },
  {
    month: 'Jul',
    day: '10',
    dow: 'Fri',
    title: 'J. Cole',
    details: '8:00 PM - Charlotte, NC, US - Spectrum Center',
  },
  {
    month: 'Jul',
    day: '11',
    dow: 'Sat',
    title: 'J. Cole',
    details: '8:00 PM - Charlotte, NC, US - Spectrum Center',
    badge: 'Selling fast',
    badgeClass: 'bg-[#fef1f2] text-[#e11d48]',
  },
  {
    month: 'Jul',
    day: '14',
    dow: 'Tue',
    title: 'J. Cole',
    details: '8:00 PM - Miami, FL, US - Kaseya Center',
    badge: 'Best value',
    badgeClass: 'bg-[#e7f5e8] text-[#147a38]',
  },
];

export const listings = [
  { section: 'Section 538', row: 'Row G', price: 'R935', badge: 'Best price' },
  { section: 'Section 531', row: 'Row X', price: 'R959' },
  { section: 'Section 545', row: 'Row ROW', price: 'R1,093', badge: 'Best deal', last: true },
  { section: 'Section 535', row: 'Row ROW', price: 'R1,093' },
  { section: 'Section 536', row: 'Row ROW', price: 'R1,093' },
];

export const venueCapacity = 90000;

export const AVAILABLE_GREEN = '#b8df8a';
export const UNAVAILABLE_GREY = '#e5e5e5';
export const fillEverything = true;
export const showTagsForEverything = false;

export const venueSections = [
  { id: 'GENERAL-ADMISSION', name: 'General Admission', tier: 'standing', capacity: 18500 },
  { id: 'FRONT-ZONE-NORTH', name: 'Front Zone Standing', tier: 'standing', capacity: 12000 },
  { id: 'FRONT-ZONE-SOUTH', name: 'Front Zone Standing', tier: 'standing', capacity: 12000 },
  { id: 'VIP', name: 'VIP', tier: 'vip', capacity: 1000 },
  ...[101, 102, 103, 104, 105, ...Array.from({ length: 28 }, (_, index) => 122 + index)].map(
    (id) => ({ id: String(id), name: `Section ${id}`, tier: 'lower', capacity: 650 }),
  ),
  ...Array.from({ length: 19 }, (_, index) => 216 + index).map((id) => ({
    id: String(id),
    name: `Section ${id}`,
    tier: 'club',
    capacity: 450,
  })),
  ...[500, 501, 502, 503, ...Array.from({ length: 26 }, (_, index) => 520 + index)].map(
    (id) => ({ id: String(id), name: `Section ${id}`, tier: 'upper', capacity: 550 }),
  ),
];

export const mapSectionLabels = [
  { section: '541', left: '20%', top: '13%', price: 'R1,093' },
  { section: '542', left: '28%', top: '10%', price: 'R1,093' },
  { section: '543', left: '36%', top: '9%', price: 'R1,093' },
  { section: '544', left: '44%', top: '9%', price: 'R1,093' },
  { section: '545', left: '52%', top: '9%', price: 'R1,093', note: '2 left', featured: true },
  { section: '546', left: '60%', top: '9%', price: 'R1,093' },
  { section: '500', left: '59%', top: '9%', price: 'R1,093' },
  { section: '501', left: '67%', top: '9%', price: 'R1,093' },
  { section: '502', left: '75%', top: '10%', price: 'R1,093' },
  { section: '503', left: '84%', top: '13%', price: 'R1,093' },
  { section: '540', left: '15%', top: '22%', price: 'R1,093' },
  { section: '539', left: '11%', top: '32%', price: 'R1,093' },
  { section: '538', left: '9%', top: '43%', price: 'R935', note: 'Best', featured: true },
  { section: '537', left: '9%', top: '54%', price: 'R1,093' },
  { section: '536', left: '9%', top: '65%', price: 'R1,093' },
  { section: '535', left: '10%', top: '75%', price: 'R1,093' },
  { section: '534', left: '13%', top: '85%', price: 'R1,093' },
  { section: '533', left: '18%', top: '91%', price: 'R1,093' },
  { section: '532', left: '24%', top: '94%', price: 'R1,093' },
  { section: '531', left: '31%', top: '95%', price: 'R959', featured: true },
  { section: '530', left: '39%', top: '94%', price: 'R1,093' },
  { section: '529', left: '47%', top: '93%', price: 'R1,093' },
  { section: '528', left: '55%', top: '92%', price: 'R1,093' },
  { section: '527', left: '63%', top: '91%', price: 'R1,093' },
  { section: '526', left: '71%', top: '90%', price: 'R1,093' },
  { section: '525', left: '78%', top: '88%', price: 'R1,093' },
  { section: '524', left: '84%', top: '86%', price: 'R1,093' },
  { section: '523', left: '89%', top: '83%', price: 'R1,093' },
  { section: '522', left: '93%', top: '79%', price: 'R1,093' },
  { section: '521', left: '96%', top: '74%', price: 'R1,093' },
  { section: '520', left: '97%', top: '67%', price: 'R1,093' },
  { section: '233', left: '31%', top: '22%', price: 'R2,030' },
  { section: '234', left: '39%', top: '21%', price: 'R2,030' },
  { section: '203', left: '88%', top: '25%', price: 'R2,030' },
  { section: '232', left: '25%', top: '27%', price: 'R2,030' },
  { section: '231', left: '21%', top: '32%', price: 'R2,030' },
  { section: '230', left: '20%', top: '42%', price: 'R2,030' },
  { section: '229', left: '20%', top: '53%', price: 'R2,030' },
  { section: '228', left: '21%', top: '64%', price: 'R2,030' },
  { section: '227', left: '23%', top: '74%', price: 'R2,030' },
  { section: '226', left: '26%', top: '82%', price: 'R2,030' },
  { section: '225', left: '31%', top: '88%', price: 'R2,030' },
  { section: '224', left: '37%', top: '89%', price: 'R2,030' },
  { section: '222', left: '43%', top: '86%', price: 'R2,030' },
  { section: '221', left: '50%', top: '84%', price: 'R2,030' },
  { section: '220', left: '58%', top: '84%', price: 'R2,030' },
  { section: '219', left: '66%', top: '83%', price: 'R2,030' },
  { section: '218', left: '74%', top: '82%', price: 'R2,030' },
  { section: '217', left: '82%', top: '80%', price: 'R2,030' },
  { section: '216', left: '90%', top: '77%', price: 'R2,030' },
  { section: '145', left: '42%', top: '36%', price: 'R2,261' },
  { section: '144', left: '37%', top: '38%', price: 'R2,261' },
  { section: '143', left: '30%', top: '37%', price: 'R2,261' },
  { section: '142', left: '30%', top: '49%', price: 'R2,261' },
  { section: '141', left: '31%', top: '59%', price: 'R2,261' },
  { section: '140', left: '33%', top: '68%', price: 'R2,261' },
  { section: '139', left: '35%', top: '76%', price: 'R2,261' },
  { section: '138', left: '37%', top: '82%', price: 'R2,261' },
  { section: '137', left: '39%', top: '88%', price: 'R2,261' },
  { section: '134', left: '42%', top: '75%', price: 'R2,261' },
  { section: '133', left: '49%', top: '73%', price: 'R2,261' },
  { section: '132', left: '56%', top: '72%', price: 'R2,261' },
  { section: '131', left: '62%', top: '72%', price: 'R2,261' },
  { section: '130', left: '69%', top: '72%', price: 'R2,261' },
  { section: '129', left: '75%', top: '72%', price: 'R2,261' },
  { section: '128', left: '81%', top: '72%', price: 'R2,261' },
  { section: '127', left: '87%', top: '71%', price: 'R2,261' },
  { section: '126', left: '92%', top: '70%', price: 'R2,261' },
  { section: '146', left: '45%', top: '32%', price: 'R3,904' },
  { section: '147', left: '51%', top: '32%', price: 'R3,904' },
  { section: '148', left: '57%', top: '32%', price: 'R3,904' },
  { section: '149', left: '63%', top: '32%', price: 'R3,904' },
  { section: '150', left: '66%', top: '30%', price: 'R3,904' },
  { section: '101', left: '69%', top: '32%', price: 'R3,904' },
  { section: '102', left: '75%', top: '33%', price: 'R3,904' },
  { section: '103', left: '81%', top: '35%', price: 'R3,904' },
  { section: '104', left: '87%', top: '37%', price: 'R3,904' },
  { section: '105', left: '92%', top: '40%', price: 'R3,904' },
  { section: '106', left: '96%', top: '43%', price: 'R3,904' },
  { section: '121', left: '88%', top: '70%', price: 'R2,261' },
  { section: 'GA', left: '41%', top: '57%', price: 'R1,250', note: '18.5K', featured: true },
  { section: 'VIP', left: '50%', top: '56%', price: 'R8,993', note: '1K', featured: true },
  { section: 'FRONT', left: '71%', top: '54%', price: 'R3,674', note: '24K', featured: true },
];

export const priceTags = [
  ['60%', '10%', 'R1,093'],
  ['45%', '5%', 'R1,093', '8 left'],
  ['30%', '9%', 'R1,093', '11 left'],
  ['53%', '17%', 'R8,993', '2 left'],
  ['67%', '23%', 'R3,904', '1 left'],
  ['44%', '24%', 'R2,261', '3 left'],
  ['30%', '25%', 'R2,030'],
  ['19%', '18%', 'R1,093'],
  ['16%', '25%', 'R935'],
  ['13%', '32%', 'R1,093'],
  ['12%', '39%', 'R1,093'],
  ['11%', '46%', 'R1,093'],
  ['12%', '53%', 'R1,093'],
  ['13%', '59%', 'R1,093'],
  ['15%', '66%', 'R1,093'],
  ['17%', '73%', 'R959'],
  ['21%', '78%', 'R1,093', '12 left'],
  ['26%', '84%', 'R1,093'],
  ['37%', '88%', 'R1,093', '12 left'],
  ['50%', '90%', 'R1,093', '9 left'],
  ['27%', '64%', 'R4,882', '8 left'],
  ['36%', '76%', 'R2,519', '4 left'],
  ['45%', '70%', 'R2,258', '1 left'],
  ['40%', '48%', 'R2,321', '3 left'],
  ['56%', '48%', 'R3,674', '1 left'],
];

