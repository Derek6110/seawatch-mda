// Colour and label maps shared across the map and panels.

export const CLASS_COLORS = {
  friendly: '#3aa6ff', // own / allied naval units
  neutral: '#7f8fa6', // known commercial traffic
  unknown: '#fcd116', // unidentified
  suspect: '#ff3b3b', // flagged by detection
};

export const TYPE_LABELS = {
  cargo: 'Cargo',
  tanker: 'Tanker',
  fishing: 'Fishing',
  naval: 'Naval',
  passenger: 'Passenger',
  supply: 'Offshore Supply',
  tug: 'Tug',
};

export const SEVERITY_COLORS = {
  high: '#ff3b3b',
  medium: '#ffa726',
  low: '#ffd54f',
};

export const ALERT_LABELS = {
  'going-dark': 'Going Dark (2–3h)',
  'gone-dark': 'Gone Dark (>3h)',
  spoofing: 'Position Spoofing',
  loitering: 'Loitering',
  'zone-violation': 'Zone Violation',
  sts: 'Ship-to-Ship',
};

export const RISK_COLORS = {
  low: '#2ecc71',
  medium: '#ffd54f',
  high: '#ffa726',
  critical: '#ff3b3b',
};

export const ZONE_STYLE = {
  eez: { color: '#fcd116', weight: 1.5, dash: '6 6', fill: 0.04 },
  territorial: { color: '#ce1126', weight: 1.5, dash: '4 4', fill: 0.05 },
  fishing: { color: '#2ecc71', weight: 1, dash: null, fill: 0.08 },
  oil: { color: '#ff9f1c', weight: 1, dash: null, fill: 0.18 },
  anchorage: { color: '#5dade2', weight: 1, dash: '2 4', fill: 0.1 },
  aoi: { color: '#e74c3c', weight: 1.2, dash: '8 4', fill: 0.08 },
};

export function vesselColor(v) {
  if (v.flags && v.flags.length) return CLASS_COLORS.suspect;
  return CLASS_COLORS[v.classification] || CLASS_COLORS.neutral;
}
