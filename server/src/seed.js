// Seed data tailored to the Ghana Navy and the Gulf of Guinea / Yaoundé
// maritime security architecture. Geometry is approximate and intended for
// demonstration — replace zone polygons with authoritative survey data before
// operational use.

import { store } from './store.js';

// --- Maritime Operations Centres (MOCs) & commands -------------------------
// Ghana Navy operational structure plus the regional Yaoundé Architecture node
// that Ghana hosts (MMCC Zone F, Accra).
export const MOCS = [
  {
    id: 'moc-nhq',
    code: 'NHQ-MOC',
    name: 'Naval HQ Maritime Operations Centre',
    location: 'Naval Headquarters, Accra',
    lat: 5.5462,
    lon: -0.1968,
    role: 'national-command',
    color: '#f4c542',
    channels: ['ops-national', 'intel', 'sar'],
  },
  {
    id: 'moc-wnc',
    code: 'WNC',
    name: 'Western Naval Command',
    location: 'Sekondi Naval Base',
    lat: 4.9344,
    lon: -1.7033,
    role: 'fleet-command',
    color: '#3aa6ff',
    channels: ['ops-national', 'wnc-ops', 'intel'],
  },
  {
    id: 'moc-enc',
    code: 'ENC',
    name: 'Eastern Naval Command',
    location: 'Tema Naval Base',
    lat: 5.6326,
    lon: 0.0089,
    role: 'fleet-command',
    color: '#2ecc71',
    channels: ['ops-national', 'enc-ops', 'intel'],
  },
  {
    id: 'moc-mmcc-f',
    code: 'MMCC-F',
    name: 'Multinational Maritime Coordination Centre — Zone F',
    location: 'Accra (Yaoundé Architecture)',
    lat: 5.6037,
    lon: -0.187,
    role: 'regional-coordination',
    color: '#bb6bd9',
    channels: ['ops-national', 'zone-f-regional', 'intel'],
  },
  {
    id: 'moc-fob-ezinlibo',
    code: 'FOB-EZ',
    name: 'Forward Operating Base Ezinlibo',
    location: 'Ezinlibo (Western Region)',
    lat: 4.9,
    lon: -2.95,
    role: 'forward-base',
    color: '#e67e22',
    channels: ['wnc-ops'],
  },
  {
    id: 'moc-fob-keta',
    code: 'FOB-KT',
    name: 'Forward Operating Base Keta',
    location: 'Keta (Volta Region)',
    lat: 5.92,
    lon: 0.99,
    role: 'forward-base',
    color: '#e67e22',
    channels: ['enc-ops'],
  },
  {
    id: 'moc-vtmis',
    code: 'VTMIS',
    name: 'VTMIS — Ghana Maritime Authority',
    location: 'Vessel Traffic Management Information System, Accra',
    lat: 5.62,
    lon: -0.02,
    role: 'inter-agency',
    color: '#1abc9c',
    channels: ['ops-national', 'vtmis', 'intel'],
  },
  {
    id: 'moc-mrcc',
    code: 'MRCC',
    name: 'Maritime Rescue Coordination Centre',
    location: 'MRCC, Accra',
    lat: 5.57,
    lon: -0.21,
    role: 'search-and-rescue',
    color: '#e84393',
    channels: ['ops-national', 'sar', 'vtmis'],
  },
  {
    id: 'moc-fisheries',
    code: 'FCMC',
    name: 'Fisheries Commission Monitoring Centre',
    location: 'Fisheries MCS Centre, Tema',
    lat: 5.66,
    lon: 0.01,
    role: 'inter-agency',
    color: '#27ae60',
    channels: ['ops-national', 'vtmis', 'intel'],
  },
];

// --- Operators (users) ------------------------------------------------------
export const OPERATORS = [
  { id: 'op-1', name: 'Cdr. K. Mensah', rank: 'Commander', mocId: 'moc-nhq', role: 'watch-commander' },
  { id: 'op-2', name: 'Lt. Cdr. A. Boateng', rank: 'Lieutenant Commander', mocId: 'moc-nhq', role: 'intel-officer' },
  { id: 'op-3', name: 'Lt. E. Owusu', rank: 'Lieutenant', mocId: 'moc-wnc', role: 'watch-officer' },
  { id: 'op-4', name: 'Lt. Cdr. P. Annan', rank: 'Lieutenant Commander', mocId: 'moc-enc', role: 'watch-commander' },
  { id: 'op-5', name: 'Capt. R. Sowah', rank: 'Captain', mocId: 'moc-mmcc-f', role: 'regional-coordinator' },
];

// --- Zones ------------------------------------------------------------------
// EEZ / territorial sea polygons are simplified for the demo. Oil fields and
// AOIs are drawn as boxes so they are clearly visible at national scale.
function box(lon, lat, dLon, dLat) {
  return [
    [lon - dLon, lat - dLat],
    [lon + dLon, lat - dLat],
    [lon + dLon, lat + dLat],
    [lon - dLon, lat + dLat],
  ];
}

export const ZONES = [
  {
    id: 'zone-eez',
    name: 'Ghana Exclusive Economic Zone',
    kind: 'eez',
    color: '#f4c542',
    description: 'Approx. 200 NM EEZ — national jurisdiction over resources.',
    polygon: [
      [-3.12, 5.13],
      [-1.76, 4.93],
      [-0.2, 5.55],
      [0.6, 6.0],
      [1.19, 6.1],
      [1.95, 4.2],
      [2.05, 2.0],
      [-0.4, 1.7],
      [-3.45, 2.3],
      [-3.25, 4.2],
    ],
  },
  {
    id: 'zone-territorial',
    name: 'Territorial Sea (12 NM)',
    kind: 'territorial',
    color: '#ff5b5b',
    description: 'Sovereign waters out to 12 nautical miles from baseline.',
    polygon: [
      [-3.11, 5.05],
      [-1.76, 4.78],
      [-0.2, 5.4],
      [0.6, 5.85],
      [1.19, 5.95],
      [1.19, 5.6],
      [0.5, 5.45],
      [-0.25, 5.1],
      [-1.78, 4.55],
      [-3.12, 4.82],
    ],
  },
  {
    id: 'zone-iez',
    name: 'Inshore Exclusive Zone (Artisanal)',
    kind: 'fishing',
    color: '#2ecc71',
    description: 'Reserved for artisanal canoes — trawlers prohibited.',
    polygon: [
      [-2.6, 4.78],
      [-1.0, 4.7],
      [0.2, 5.25],
      [1.0, 5.65],
      [1.0, 5.78],
      [0.1, 5.4],
      [-1.05, 4.85],
      [-2.6, 4.92],
    ],
  },
  {
    id: 'zone-jubilee',
    name: 'Jubilee Oil Field (Safety Zone)',
    kind: 'oil',
    color: '#ff9f1c',
    description: 'FPSO Kwame Nkrumah — 500 m statutory exclusion + watch area.',
    polygon: box(-2.9, 4.62, 0.12, 0.1),
  },
  {
    id: 'zone-ten',
    name: 'TEN Oil Field (Safety Zone)',
    kind: 'oil',
    color: '#ff9f1c',
    description: 'FPSO Prof. John Evans Atta Mills — exclusion + watch area.',
    polygon: box(-3.02, 4.55, 0.1, 0.09),
  },
  {
    id: 'zone-sankofa',
    name: 'Sankofa / OCTP Field (Safety Zone)',
    kind: 'oil',
    color: '#ff9f1c',
    description: 'FPSO John Agyekum Kufuor — exclusion + watch area.',
    polygon: box(-1.55, 4.05, 0.12, 0.1),
  },
  {
    id: 'zone-tema-anch',
    name: 'Tema Anchorage',
    kind: 'anchorage',
    color: '#5dade2',
    description: 'Designated waiting anchorage off Tema Port.',
    polygon: box(0.05, 5.55, 0.13, 0.1),
  },
  {
    id: 'zone-takoradi-anch',
    name: 'Takoradi Anchorage',
    kind: 'anchorage',
    color: '#5dade2',
    description: 'Designated waiting anchorage off Takoradi Port.',
    polygon: box(-1.72, 4.84, 0.12, 0.09),
  },
  {
    id: 'zone-aoi-piracy',
    name: 'AOI — Piracy / Robbery Watch',
    kind: 'aoi',
    color: '#e74c3c',
    description: 'Elevated risk of armed robbery / kidnap-for-ransom at sea.',
    polygon: box(0.9, 4.5, 0.9, 0.7),
  },
  {
    id: 'zone-aoi-iuu',
    name: 'AOI — IUU Fishing Hotspot',
    kind: 'aoi',
    color: '#16a085',
    description: 'Recurrent illegal, unreported & unregulated fishing activity.',
    polygon: box(-2.2, 4.3, 0.7, 0.5),
  },
];

// --- Vessel name / flag pools for the simulator -----------------------------
export const FLAGS = [
  'Ghana', 'Nigeria', 'Togo', 'Benin', 'Liberia', 'Panama',
  'Marshall Islands', 'China', 'Côte d’Ivoire', 'Netherlands', 'Greece',
];

export const VESSEL_TYPES = [
  { type: 'cargo', weight: 26 },
  { type: 'tanker', weight: 20 },
  { type: 'fishing', weight: 30 },
  { type: 'naval', weight: 6 },
  { type: 'passenger', weight: 4 },
  { type: 'supply', weight: 8 }, // offshore supply / oilfield support
  { type: 'tug', weight: 6 },
];

export const SHIP_NAMES = [
  'Adwoa Star', 'Sea Falcon', 'Gulf Trader', 'Akosombo', 'Cape Coast Pride',
  'Volta Spirit', 'Atlantic Dawn', 'Lady Aba', 'Tema Pioneer', 'Takoradi Maru',
  'Ocean Harvest', 'Saltpond Venture', 'Elmina Castle', 'Black Star Express',
  'Gye Nyame', 'Sankofa Voyager', 'Bia Reefer', 'Densu Carrier', 'Pra Navigator',
  'Ankobra Tide', 'Keta Lagoon', 'Ada Foah', 'Axim Bay', 'Half Assini',
  'Western Reefer', 'Eastern Star', 'Guinea Trader', 'Bonny Express',
  'Lagos Mariner', 'Lomé Carrier', 'Cotonou Spirit', 'Abidjan Star',
];

// Ghana Navy assets (own-force units shown as friendly).
export const NAVY_UNITS = [
  { name: 'GNS Yaa Asantewaa', pennant: 'P30', homePort: 'Sekondi' },
  { name: 'GNS Ehwor', pennant: 'P33', homePort: 'Tema' },
  { name: 'GNS Chemle', pennant: 'P34', homePort: 'Sekondi' },
  { name: 'GNS Naa Gbewaa', pennant: 'P36', homePort: 'Tema' },
  { name: 'GNS Garinga', pennant: 'P27', homePort: 'Sekondi' },
  { name: 'GNS Bonsu', pennant: 'P38', homePort: 'Tema' },
];

export function seedStaticData() {
  store.mocs = MOCS;
  store.operators = OPERATORS;
  store.zones = ZONES;

  // A few seeded collaboration messages so the demo opens with context.
  const now = Date.now();
  store.messages = [
    {
      id: 'm1', channelId: 'ops-national', mocId: 'moc-nhq',
      author: 'Cdr. K. Mensah', text: 'Morning watch handover complete. Two contacts of interest flagged in the western sector.',
      ts: now - 1000 * 60 * 42,
    },
    {
      id: 'm2', channelId: 'ops-national', mocId: 'moc-wnc',
      author: 'Lt. E. Owusu', text: 'WNC copies. GNS Yaa Asantewaa on patrol vicinity Jubilee field, available to investigate.',
      ts: now - 1000 * 60 * 39,
    },
    {
      id: 'm3', channelId: 'zone-f-regional', mocId: 'moc-mmcc-f',
      author: 'Capt. R. Sowah', text: 'Zone F advisory: suspicious fishing vessel cluster reported drifting toward Ghana–Côte d’Ivoire boundary. Sharing tracks.',
      ts: now - 1000 * 60 * 25,
    },
  ];
}
