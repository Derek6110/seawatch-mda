const pptx = require('pptxgenjs');
const p = new pptx();
p.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
p.layout = 'WIDE';
p.author = 'SeaWatch';
p.title = 'SeaWatch — Ghana Navy MDA Capabilities Brief';

const W = 13.333, H = 7.5;
// Palette — naval midnight with Ghana national accents
const NAVY = '0A1A2E';      // deep midnight (dark slides)
const NAVY2 = '102A47';     // panel navy
const STEEL = '17324F';     // card on dark
const INK = '13263B';       // dark text on light
const MUTED = '5C6E82';     // muted body
const FAINT = 'E7EDF4';     // hairline / light fill
const PANEL = 'F3F7FB';     // light card fill
const GOLD = 'F2C200';      // Ghana gold accent
const GREEN = '0B7A3B';     // Ghana green
const RED = 'C8102E';       // Ghana red / high severity
const ORANGE = 'E08A00';    // medium severity
const BLUE = '2E6FB0';      // info / live
const TEAL = '1B9E8A';
const HEAD = 'Cambria';
const BODY = 'Calibri';

const sh = (opacity = 0.16, blur = 9, offset = 3, angle = 90) => ({ type: 'outer', color: '0A1626', blur, offset, angle, opacity });

function footer(s, n) {
  s.addText([{ text: 'SeaWatch', options: { bold: true, color: INK } }, { text: '  ·  Ghana Navy Maritime Domain Awareness', options: { color: MUTED } }],
    { x: 0.6, y: H - 0.42, w: 8, h: 0.3, fontSize: 9, fontFace: BODY, margin: 0 });
  s.addText(String(n), { x: W - 1.0, y: H - 0.42, w: 0.5, h: 0.3, fontSize: 9, color: MUTED, align: 'right', fontFace: BODY });
}
function kicker(s, text, color, y) {
  s.addText(text.toUpperCase(), { x: 0.6, y: y || 0.5, w: 11, h: 0.3, fontSize: 12.5, bold: true, color: color || GOLD, charSpacing: 2, fontFace: BODY, margin: 0 });
}
function title(s, text, color) {
  s.addText(text, { x: 0.6, y: 0.82, w: 12.1, h: 0.85, fontSize: 31, bold: true, color: color || INK, fontFace: HEAD, margin: 0 });
}
function card(s, x, y, w, h, fill) {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill || PANEL }, line: { type: 'none' }, rectRadius: 0.09, shadow: sh(0.10, 8, 3, 90) });
}
function dot(s, x, y, color, d = 0.18) {
  s.addShape(p.shapes.OVAL, { x, y, w: d, h: d, fill: { color }, line: { type: 'none' } });
}
function numCircle(s, x, y, n, fill, txtColor) {
  s.addShape(p.shapes.OVAL, { x, y, w: 0.5, h: 0.5, fill: { color: fill }, line: { type: 'none' }, shadow: sh(0.18, 6, 2, 90) });
  s.addText(String(n), { x, y, w: 0.5, h: 0.5, align: 'center', valign: 'middle', fontSize: 18, bold: true, color: txtColor || 'FFFFFF', fontFace: HEAD, margin: 0 });
}

// =====================================================================
// 1 — TITLE
// =====================================================================
let s = p.addSlide(); s.background = { color: NAVY };
// soft glow panel
s.addShape(p.shapes.OVAL, { x: 8.4, y: -2.6, w: 8, h: 8, fill: { color: '102338' }, line: { type: 'none' } });
s.addImage({ path: 'crest.png', x: 0.95, y: 1.55, w: 1.95, h: 1.87 });
s.addText('SeaWatch', { x: 3.15, y: 1.65, w: 9, h: 1.2, fontSize: 60, bold: true, color: 'FFFFFF', fontFace: HEAD, margin: 0 });
s.addText('GHANA NAVY  ·  MARITIME DOMAIN AWARENESS SYSTEM', { x: 3.2, y: 2.92, w: 9.4, h: 0.4, fontSize: 15, bold: true, color: GOLD, charSpacing: 2, fontFace: BODY, margin: 0 });
s.addShape(p.shapes.LINE, { x: 3.22, y: 3.55, w: 7.2, h: 0, line: { color: '24496E', width: 1 } });
s.addText('Capabilities Brief', { x: 3.18, y: 3.72, w: 9, h: 0.6, fontSize: 24, color: 'E8EEF5', fontFace: HEAD, italic: true, margin: 0 });
s.addText('Prepared for Higher Command', { x: 3.2, y: 4.35, w: 9, h: 0.4, fontSize: 14, color: 'AEC2D6', fontFace: BODY, margin: 0 });
// bottom motto chips
const chips = ['Loyalty', 'Devotion', 'Excellence'];
chips.forEach((c, i) => {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.95 + i * 1.75, y: 6.3, w: 1.6, h: 0.5, fill: { color: STEEL }, line: { type: 'none' }, rectRadius: 0.25 });
  s.addText(c, { x: 0.95 + i * 1.75, y: 6.3, w: 1.6, h: 0.5, align: 'center', valign: 'middle', fontSize: 12, bold: true, color: 'CFE0F0', fontFace: BODY, margin: 0 });
});
s.addText('A maritime domain awareness platform for vessel tracking, dark-vessel detection,\ninter-agency collaboration and threat alerting across Ghana’s waters and the Gulf of Guinea.',
  { x: 6.55, y: 6.25, w: 6.2, h: 0.9, fontSize: 11.5, color: 'AEC2D6', fontFace: BODY, align: 'right', margin: 0 });

// =====================================================================
// 2 — THE MARITIME CHALLENGE
// =====================================================================
s = p.addSlide(); s.background = { color: 'FFFFFF' };
kicker(s, 'The Operating Environment', RED);
title(s, 'The Gulf of Guinea is a contested maritime domain');
// three stat callouts
const stats = [
  ['~6,000', 'vessels transit the\nGulf of Guinea region', BLUE],
  ['200 NM', 'Exclusive Economic Zone\nto monitor & protect', GREEN],
  ['3', 'offshore oil fields —\nJubilee · TEN · Sankofa', GOLD],
];
stats.forEach((st, i) => {
  const x = 0.6 + i * 2.55;
  card(s, x, 1.95, 2.35, 1.65, PANEL);
  s.addText(st[0], { x, y: 2.12, w: 2.35, h: 0.7, align: 'center', fontSize: 34, bold: true, color: st[2] === GOLD ? 'B58A00' : st[2], fontFace: HEAD, margin: 0 });
  s.addText(st[1], { x: x + 0.15, y: 2.82, w: 2.05, h: 0.7, align: 'center', fontSize: 11, color: MUTED, fontFace: BODY, margin: 0 });
});
// threat list (right)
card(s, 8.4, 1.95, 4.33, 4.5, NAVY);
s.addText('PERSISTENT THREATS', { x: 8.7, y: 2.15, w: 3.8, h: 0.35, fontSize: 12.5, bold: true, color: GOLD, charSpacing: 1.5, fontFace: BODY, margin: 0 });
const threats = [
  ['Piracy & armed robbery', 'kidnap-for-ransom, hijack at sea'],
  ['IUU fishing', 'illegal, unreported & unregulated catch'],
  ['Smuggling & trafficking', 'narcotics, arms, fuel, persons'],
  ['Dark vessels', 'AIS switched off to evade detection'],
  ['Oil-infrastructure risk', 'incursions near FPSOs & platforms'],
];
threats.forEach((t, i) => {
  const y = 2.7 + i * 0.74;
  dot(s, 8.72, y + 0.06, GOLD, 0.14);
  s.addText(t[0], { x: 9.0, y: y - 0.05, w: 3.6, h: 0.3, fontSize: 13, bold: true, color: 'FFFFFF', fontFace: BODY, margin: 0 });
  s.addText(t[1], { x: 9.0, y: y + 0.22, w: 3.6, h: 0.28, fontSize: 10.5, color: 'A9BFD6', fontFace: BODY, margin: 0 });
});
s.addText('Sea blindness — gaps in the maritime picture — lets these threats operate undetected. SeaWatch closes that gap.',
  { x: 0.6, y: 4.05, w: 7.55, h: 1.2, fontSize: 15, color: INK, italic: true, fontFace: HEAD, valign: 'top', margin: 0 });
footer(s, 2);

// =====================================================================
// 3 — AT A GLANCE
// =====================================================================
s = p.addSlide(); s.background = { color: 'FFFFFF' };
kicker(s, 'What SeaWatch Delivers', GREEN);
title(s, 'One screen. The whole maritime picture.');
s.addText('A live, web-based common operating picture that fuses vessel tracking, automated threat detection and inter-agency collaboration — accessible from any Maritime Operations Centre.',
  { x: 0.6, y: 1.72, w: 12.1, h: 0.7, fontSize: 14, color: MUTED, fontFace: BODY, margin: 0 });
const pillars = [
  ['See', 'Live common operating picture of every cooperative contact across the EEZ and Gulf of Guinea.', BLUE],
  ['Detect', 'Automated dark-vessel detection and threat alerts — AIS gaps, spoofing, loitering, STS, zone breaches.', RED],
  ['Collaborate', 'Maritime Operations Centres and partner agencies share tracks, incidents and tasking in real time.', GOLD],
  ['Act', 'Task assets, run track replay, and issue printable situation reports for command decisions.', GREEN],
];
pillars.forEach((pl, i) => {
  const x = 0.6 + i * 3.05;
  card(s, x, 2.7, 2.85, 3.5, PANEL);
  s.addShape(p.shapes.OVAL, { x: x + 0.3, y: 2.98, w: 0.62, h: 0.62, fill: { color: pl[2] === GOLD ? 'B58A00' : pl[2] }, line: { type: 'none' } });
  s.addText(String(i + 1), { x: x + 0.3, y: 2.98, w: 0.62, h: 0.62, align: 'center', valign: 'middle', fontSize: 22, bold: true, color: 'FFFFFF', fontFace: HEAD, margin: 0 });
  s.addText(pl[0], { x: x + 0.3, y: 3.78, w: 2.3, h: 0.5, fontSize: 21, bold: true, color: INK, fontFace: HEAD, margin: 0 });
  s.addText(pl[1], { x: x + 0.3, y: 4.35, w: 2.28, h: 1.7, fontSize: 12, color: MUTED, fontFace: BODY, valign: 'top', margin: 0 });
});
footer(s, 3);

// =====================================================================
// 4 — HOW IT WORKS (architecture / data fusion)
// =====================================================================
s = p.addSlide(); s.background = { color: 'FFFFFF' };
kicker(s, 'How It Works', BLUE);
title(s, 'Sensor fusion into a single operating picture');
// three source cards -> fusion -> COP
const sources = [
  ['AIS', 'Terrestrial & satellite\nautomatic identification'],
  ['Radar', 'Coastal radar &\nnon-cooperative contacts'],
  ['Satellite', 'Optical / SAR imagery\nfor dark contacts'],
];
sources.forEach((sc, i) => {
  const y = 2.05 + i * 1.18;
  card(s, 0.6, y, 3.0, 1.0, PANEL);
  s.addText(sc[0], { x: 0.8, y: y + 0.16, w: 2.7, h: 0.4, fontSize: 17, bold: true, color: BLUE, fontFace: HEAD, margin: 0 });
  s.addText(sc[1], { x: 0.8, y: y + 0.52, w: 2.7, h: 0.42, fontSize: 10.5, color: MUTED, fontFace: BODY, margin: 0 });
});
// fusion hub
card(s, 4.55, 2.5, 2.5, 2.4, NAVY);
s.addText('SeaWatch', { x: 4.55, y: 3.1, w: 2.5, h: 0.5, align: 'center', fontSize: 19, bold: true, color: 'FFFFFF', fontFace: HEAD, margin: 0 });
s.addText('Fusion &\nDetection Engine', { x: 4.55, y: 3.6, w: 2.5, h: 0.7, align: 'center', fontSize: 12, color: GOLD, fontFace: BODY, margin: 0 });
// arrows in (horizontal, into the hub)
sources.forEach((sc, i) => {
  const y = 2.55 + i * 1.18; // source card vertical centre
  s.addShape(p.shapes.LINE, { x: 3.6, y: y, w: 0.95, h: 0, line: { color: 'C3D2E0', width: 1.5, endArrowType: 'triangle' } });
});
// arrow out
s.addShape(p.shapes.LINE, { x: 7.05, y: 3.7, w: 1.0, h: 0, line: { color: 'C3D2E0', width: 1.5, endArrowType: 'triangle' } });
// outputs
card(s, 8.1, 2.05, 4.63, 4.05, PANEL);
s.addText('COMMON OPERATING PICTURE', { x: 8.35, y: 2.25, w: 4.2, h: 0.35, fontSize: 12.5, bold: true, color: INK, charSpacing: 1, fontFace: BODY, margin: 0 });
const outs = ['Live vessel tracks, classification & search', 'Automated threat & anomaly alerts', 'Vessel risk scoring (0–100)', 'Shared incidents & inter-agency tasking', 'Track replay & situation reports'];
outs.forEach((o, i) => {
  const y = 2.78 + i * 0.6;
  dot(s, 8.4, y + 0.04, GREEN, 0.14);
  s.addText(o, { x: 8.68, y: y - 0.06, w: 3.9, h: 0.4, fontSize: 12.5, color: INK, fontFace: BODY, valign: 'middle', margin: 0 });
});
s.addText('Runs on live feeds where available, with a high-fidelity simulation mode for training and demonstration — switchable in one click.',
  { x: 0.6, y: 6.35, w: 7.2, h: 0.7, fontSize: 11, italic: true, color: MUTED, fontFace: BODY, margin: 0 });
footer(s, 4);

// =====================================================================
// 5 — LIVE COMMON OPERATING PICTURE
// =====================================================================
s = p.addSlide(); s.background = { color: 'FFFFFF' };
kicker(s, 'Capability 1 — Situational Awareness', BLUE);
title(s, 'Live common operating picture');
const cop = [
  ['Real-time vessel tracking', 'Every cooperative contact plotted live on the Gulf of Guinea, updating continuously with course, speed and heading.'],
  ['Classification at a glance', 'Own / allied naval units, known commercial traffic, unidentified and flagged contacts — colour-coded on the map.'],
  ['Search & filter', 'Find any vessel by name or MMSI; filter by type, flag or classification; isolate flagged contacts instantly.'],
  ['Multiple basemaps', 'Dark tactical, satellite imagery and nautical ocean charts — switch to match the task.'],
];
cop.forEach((c, i) => {
  const x = 0.6 + (i % 2) * 6.15;
  const y = 2.0 + Math.floor(i / 2) * 2.15;
  card(s, x, y, 5.9, 1.9, PANEL);
  s.addText(c[0], { x: x + 0.35, y: y + 0.25, w: 5.3, h: 0.45, fontSize: 17, bold: true, color: INK, fontFace: HEAD, margin: 0 });
  s.addText(c[1], { x: x + 0.35, y: y + 0.78, w: 5.3, h: 1.0, fontSize: 12.5, color: MUTED, fontFace: BODY, valign: 'top', margin: 0 });
});
footer(s, 5);

// =====================================================================
// 6 — DARK-VESSEL DETECTION (dark headline)
// =====================================================================
s = p.addSlide(); s.background = { color: NAVY };
kicker(s, 'Capability 2 — The Headline', GOLD);
s.addText('Dark-vessel detection', { x: 0.6, y: 0.82, w: 12, h: 0.85, fontSize: 31, bold: true, color: 'FFFFFF', fontFace: HEAD, margin: 0 });
s.addText('Vessels that go “dark” — switching off AIS to evade detection — are the hardest and most important to catch. SeaWatch flags them automatically using five behavioural detectors.',
  { x: 0.6, y: 1.7, w: 12.1, h: 0.7, fontSize: 14, color: 'B8CCE0', fontFace: BODY, margin: 0 });
const det = [
  ['AIS Gap', 'Transponder switched off at sea'],
  ['Spoofing', 'Falsified or impossible GPS position'],
  ['Loitering', 'Slow drift inside a sensitive zone'],
  ['Ship-to-Ship', 'Covert offshore rendezvous'],
  ['Zone Breach', 'Incursion into a restricted area'],
];
det.forEach((d, i) => {
  const x = 0.6 + i * 2.45;
  card(s, x, 2.7, 2.25, 2.5, STEEL);
  s.addShape(p.shapes.OVAL, { x: x + 0.85, y: 2.95, w: 0.55, h: 0.55, fill: { color: RED }, line: { type: 'none' } });
  s.addText(String(i + 1), { x: x + 0.85, y: 2.95, w: 0.55, h: 0.55, align: 'center', valign: 'middle', fontSize: 18, bold: true, color: 'FFFFFF', fontFace: HEAD, margin: 0 });
  s.addText(d[0], { x: x + 0.12, y: 3.62, w: 2.0, h: 0.4, align: 'center', fontSize: 15, bold: true, color: GOLD, fontFace: HEAD, margin: 0 });
  s.addText(d[1], { x: x + 0.18, y: 4.05, w: 1.9, h: 1.0, align: 'center', fontSize: 11, color: 'C8D8E8', fontFace: BODY, valign: 'top', margin: 0 });
});
s.addText('Each detection raises a graded alert and feeds the vessel’s risk score — turning raw tracks into prioritised, actionable intelligence.',
  { x: 0.6, y: 5.5, w: 12.1, h: 0.7, fontSize: 13, italic: true, color: 'B8CCE0', fontFace: BODY, margin: 0 });
footer(s, 6);

// =====================================================================
// 7 — THREAT & ANOMALY ALERTS — PARAMETERS (table)
// =====================================================================
s = p.addSlide(); s.background = { color: 'FFFFFF' };
kicker(s, 'Capability 2 — Detail', RED);
title(s, 'Threat & anomaly alerts — trigger parameters');
const hdr = (t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: NAVY }, fontFace: BODY, fontSize: 12.5, valign: 'middle', align: 'left' } });
const rows = [
  [hdr('Alert'), hdr('Triggered when…'), hdr('Severity')],
  ['AIS Gap (going dark)', 'No AIS transmission for more than 6 hours while at sea', 'Medium → High (>12h)'],
  ['Position Spoofing', 'Implausible position jumps / >45 kn implied speed — falsified GPS', 'High'],
  ['Loitering', 'Speed below 1.2 kn for over 25 min inside a sensitive zone', 'Medium → High (oil field)'],
  ['Restricted-Zone Incursion', 'Trawler/large vessel in artisanal zone; any non-support vessel in an oil-field safety zone', 'Medium → High'],
  ['Ship-to-Ship (STS)', 'Two slow (<3 kn) vessels within 0.6 NM offshore, outside a designated anchorage', 'High'],
  ['Non-Cooperative Contact', 'Radar / satellite contact with no matching AIS (sensor-fusion gap)', 'High'],
];
const sevColor = (txt) => txt.includes('High') && !txt.includes('→') ? RED : txt.includes('→') ? ORANGE : MUTED;
const tableRows = rows.map((r, ri) => {
  if (ri === 0) return r;
  return r.map((cell, ci) => ({
    text: cell,
    options: {
      fontFace: BODY, fontSize: ci === 0 ? 12.5 : 11.5, valign: 'middle',
      bold: ci === 0, color: ci === 0 ? INK : (ci === 2 ? sevColor(cell) : MUTED),
      fill: { color: ri % 2 ? 'FFFFFF' : F_alt() },
    },
  }));
});
function F_alt() { return 'F3F7FB'; }
s.addTable(tableRows, {
  x: 0.6, y: 1.95, w: 12.13, colW: [3.0, 6.63, 2.5],
  rowH: [0.42, 0.62, 0.62, 0.62, 0.78, 0.62, 0.62],
  border: { type: 'solid', pt: 0.5, color: 'DCE6F0' }, align: 'left', valign: 'middle',
  margin: [3, 6, 3, 6],
});
s.addText('All thresholds are configurable to Ghana Navy doctrine. Detections also drive the vessel risk score on the next slide.',
  { x: 0.6, y: 6.55, w: 12, h: 0.4, fontSize: 11, italic: true, color: MUTED, fontFace: BODY, margin: 0 });
footer(s, 7);

// =====================================================================
// 8 — VESSEL RISK SCORING
// =====================================================================
s = p.addSlide(); s.background = { color: 'FFFFFF' };
kicker(s, 'Capability 2 — Prioritisation', GOLD);
title(s, 'Every contact gets a risk score (0–100)');
s.addText('Behavioural detections combine into a single, sortable risk score so the watch focuses on the contacts that matter most.',
  { x: 0.6, y: 1.72, w: 12.1, h: 0.5, fontSize: 14, color: MUTED, fontFace: BODY, margin: 0 });
// contributors (left)
card(s, 0.6, 2.45, 6.1, 3.8, PANEL);
s.addText('WHAT RAISES A SCORE', { x: 0.9, y: 2.65, w: 5.5, h: 0.35, fontSize: 12.5, bold: true, color: INK, charSpacing: 1, fontFace: BODY, margin: 0 });
const contrib = [['Position spoofing', '+40'], ['Ship-to-ship rendezvous', '+35'], ['AIS gap (going dark)', '+30'], ['Restricted-zone breach', '+25'], ['Loitering in sensitive zone', '+20'], ['Unknown / flag-of-convenience', '+8']];
contrib.forEach((c, i) => {
  const y = 3.12 + i * 0.49;
  s.addText(c[0], { x: 0.95, y, w: 4.5, h: 0.4, fontSize: 12.5, color: INK, fontFace: BODY, valign: 'middle', margin: 0 });
  s.addText(c[1], { x: 5.5, y, w: 0.95, h: 0.4, fontSize: 13, bold: true, color: RED, align: 'right', fontFace: HEAD, valign: 'middle', margin: 0 });
});
// bands (right)
const bands = [['Critical', '70 – 100', RED], ['High', '45 – 69', ORANGE], ['Medium', '20 – 44', GOLD], ['Low', '0 – 19', GREEN]];
s.addText('RISK BANDS', { x: 7.1, y: 2.65, w: 5, h: 0.35, fontSize: 12.5, bold: true, color: INK, charSpacing: 1, fontFace: BODY, margin: 0 });
bands.forEach((b, i) => {
  const y = 3.12 + i * 0.74;
  card(s, 7.1, y, 5.63, 0.62, b[2] === GOLD ? 'FFF6D6' : (b[2] === GREEN ? 'E7F3EC' : (b[2] === ORANGE ? 'FCEFD9' : 'FBE4E8')));
  s.addShape(p.shapes.OVAL, { x: 7.35, y: y + 0.16, w: 0.3, h: 0.3, fill: { color: b[2] === GOLD ? 'B58A00' : b[2] }, line: { type: 'none' } });
  s.addText(b[0], { x: 7.8, y, w: 3, h: 0.62, fontSize: 15, bold: true, color: INK, fontFace: HEAD, valign: 'middle', margin: 0 });
  s.addText(b[1], { x: 10.0, y, w: 2.5, h: 0.62, fontSize: 14, bold: true, color: b[2] === GOLD ? 'B58A00' : b[2], align: 'right', fontFace: HEAD, valign: 'middle', margin: 0 });
});
footer(s, 8);

// =====================================================================
// 9 — MOC COLLABORATION
// =====================================================================
s = p.addSlide(); s.background = { color: 'FFFFFF' };
kicker(s, 'Capability 3 — Inter-Agency', GREEN);
title(s, 'Maritime Operations Centres, working as one');
s.addText('SeaWatch connects Ghana Navy commands with partner agencies on a shared picture — every centre sees, shares and acts together in real time.',
  { x: 0.6, y: 1.72, w: 12.1, h: 0.55, fontSize: 14, color: MUTED, fontFace: BODY, margin: 0 });
s.addText('NINE COMMANDS & PARTNER AGENCIES ON ONE SHARED PICTURE', { x: 0.6, y: 2.3, w: 12, h: 0.3, fontSize: 11.5, bold: true, color: MUTED, charSpacing: 1, fontFace: BODY, margin: 0 });
const nodes = ['NHQ MOC', 'Western Naval Cmd', 'Eastern Naval Cmd', 'FOB Keta', 'FOB Ezinlibo', 'MMCC Zone F', 'VTMIS (GMA)', 'MRCC', 'Fisheries MCC'];
nodes.forEach((nm, i) => {
  const x = 0.6 + (i % 3) * 4.1;
  const y = 2.72 + Math.floor(i / 3) * 0.74;
  card(s, x, y, 3.85, 0.62, i < 6 ? 'EAF1F8' : 'F0F7F1');
  dot(s, x + 0.28, y + 0.23, i < 6 ? BLUE : GREEN, 0.18);
  s.addText(nm, { x: x + 0.62, y, w: 3.1, h: 0.62, fontSize: 13, bold: true, color: INK, fontFace: BODY, valign: 'middle', margin: 0 });
});
// feature cards below the grid
const feats = [['Shared incidents', 'Report once; the institutions you choose are notified instantly.'], ['Live discussion threads', 'Comment & react on each incident in a continuous chat — a shared ops room.'], ['Tasking', 'Assign assets to investigate a contact and track status to completion.']];
feats.forEach((f, i) => {
  const x = 0.6 + i * 4.1;
  card(s, x, 5.18, 3.85, 1.35, 'FFF6D6');
  s.addText(f[0], { x: x + 0.3, y: 5.34, w: 3.3, h: 0.4, fontSize: 14.5, bold: true, color: INK, fontFace: HEAD, margin: 0 });
  s.addText(f[1], { x: x + 0.3, y: 5.76, w: 3.3, h: 0.7, fontSize: 11.5, color: MUTED, fontFace: BODY, valign: 'top', margin: 0 });
});
footer(s, 9);

// =====================================================================
// 10 — ZONES & AOIs
// =====================================================================
s = p.addSlide(); s.background = { color: 'FFFFFF' };
kicker(s, 'Capability 4 — Geofencing', TEAL);
title(s, 'Maritime zones & areas of interest');
const zcards = [
  ['Ghana EEZ & Territorial Sea', '200 NM economic zone and 12 NM sovereign waters delineated and monitored.', GOLD],
  ['Offshore oil fields', 'Jubilee, TEN and Sankofa safety zones with incursion alerting around FPSOs.', ORANGE],
  ['Fishing grounds', 'Inshore artisanal zone protected from trawler incursion (IUU detection).', GREEN],
  ['Areas of Interest', 'Piracy / armed-robbery watch boxes and IUU hotspots, fully configurable.', RED],
];
zcards.forEach((z, i) => {
  const x = 0.6 + (i % 2) * 6.15;
  const y = 2.0 + Math.floor(i / 2) * 2.15;
  card(s, x, y, 5.9, 1.9, PANEL);
  s.addShape(p.shapes.OVAL, { x: x + 0.32, y: y + 0.32, w: 0.34, h: 0.34, fill: { color: z[2] === GOLD ? 'B58A00' : z[2] }, line: { type: 'none' } });
  s.addText(z[0], { x: x + 0.85, y: y + 0.24, w: 4.8, h: 0.5, fontSize: 16.5, bold: true, color: INK, fontFace: HEAD, valign: 'middle', margin: 0 });
  s.addText(z[1], { x: x + 0.35, y: y + 0.85, w: 5.3, h: 0.9, fontSize: 12.5, color: MUTED, fontFace: BODY, valign: 'top', margin: 0 });
});
s.addText('On-screen tools measure distance & bearing, drop range rings, and draw search areas — directly on the live picture.',
  { x: 0.6, y: 6.35, w: 12, h: 0.5, fontSize: 11.5, italic: true, color: MUTED, fontFace: BODY, margin: 0 });
footer(s, 10);

// =====================================================================
// 11 — COMMAND ACCESS & ACCOUNTABILITY
// =====================================================================
s = p.addSlide(); s.background = { color: 'FFFFFF' };
kicker(s, 'Capability 5 — Governance', BLUE);
title(s, 'Command structure, access & accountability');
// role ladder
s.addText('ROLE-BASED ACCESS', { x: 0.6, y: 1.85, w: 6, h: 0.35, fontSize: 12.5, bold: true, color: INK, charSpacing: 1, fontFace: BODY, margin: 0 });
const roles = [['Director', 'Full command & administration'], ['Deputy Director', 'Oversight & audit'], ['Officer in Charge', 'Watch command & audit'], ['Supervisor', 'Resolve alerts, task assets'], ['Watchkeeper', 'Monitor, acknowledge, report']];
roles.forEach((r, i) => {
  const y = 2.32 + i * 0.78;
  card(s, 0.6, y, 6.0, 0.66, i === 0 ? 'FFF6D6' : PANEL);
  s.addText(r[0], { x: 0.9, y, w: 2.6, h: 0.66, fontSize: 14, bold: true, color: INK, fontFace: HEAD, valign: 'middle', margin: 0 });
  s.addText(r[1], { x: 3.4, y, w: 3.0, h: 0.66, fontSize: 11.5, color: MUTED, fontFace: BODY, valign: 'middle', margin: 0 });
});
// right: controls
const gov = [['Vetted onboarding', 'New accounts are held pending administrator approval before any access is granted.'], ['Administrator dashboard', 'Approve, modify, disable or remove accounts and assign roles & commands.'], ['Full audit trail', 'Every sign-in, alert action, incident and tasking is logged and attributable.'], ['Persistent & secure', 'Accounts and records stored in a managed database; access is encrypted end-to-end.']];
gov.forEach((g, i) => {
  const y = 1.95 + i * 1.12;
  card(s, 7.0, y, 5.73, 0.96, 'F0F7F1');
  s.addText(g[0], { x: 7.3, y: y + 0.13, w: 5.1, h: 0.35, fontSize: 14.5, bold: true, color: GREEN, fontFace: HEAD, margin: 0 });
  s.addText(g[1], { x: 7.3, y: y + 0.47, w: 5.2, h: 0.45, fontSize: 11.5, color: MUTED, fontFace: BODY, valign: 'top', margin: 0 });
});
footer(s, 11);

// =====================================================================
// 12 — REPLAY, REPORTING & TOOLS
// =====================================================================
s = p.addSlide(); s.background = { color: 'FFFFFF' };
kicker(s, 'Capability 6 — Decision Support', GOLD);
title(s, 'Replay, reporting & command tools');
const tools = [
  ['Track replay', 'Scrub or play back the last hours of the picture to reconstruct an event or brief command.'],
  ['Printable SITREPs', 'One-click Maritime Situation Report — current picture, dark contacts, alerts and incidents.'],
  ['Live ⇄ Simulation', 'Switch between live feeds and a realistic training simulation in a single click.'],
  ['Map analysis tools', 'Distance & bearing, range rings, and area drawing for planning and search.'],
];
tools.forEach((t, i) => {
  const x = 0.6 + (i % 2) * 6.15;
  const y = 2.0 + Math.floor(i / 2) * 2.1;
  card(s, x, y, 5.9, 1.85, PANEL);
  numCircle(s, x + 0.32, y + 0.32, i + 1, NAVY);
  s.addText(t[0], { x: x + 1.05, y: y + 0.3, w: 4.6, h: 0.5, fontSize: 17, bold: true, color: INK, fontFace: HEAD, valign: 'middle', margin: 0 });
  s.addText(t[1], { x: x + 0.35, y: y + 0.92, w: 5.3, h: 0.85, fontSize: 12.5, color: MUTED, fontFace: BODY, valign: 'top', margin: 0 });
});
footer(s, 12);

// =====================================================================
// 13 — DEPLOYMENT & ACCESS
// =====================================================================
s = p.addSlide(); s.background = { color: 'FFFFFF' };
kicker(s, 'Deployment', BLUE);
title(s, 'Secure, always-on, accessible anywhere');
const dep = [
  ['Web-based', 'No installation. Runs in any modern browser on the workstation, laptop or tablet.'],
  ['Always on', 'Cloud-hosted and persistent — operating around the clock, independent of any single machine.'],
  ['Secure access', 'Encrypted (HTTPS), role-gated, with vetted onboarding and full audit logging.'],
  ['Sovereign-ready', 'Can be deployed on Ghana Navy infrastructure or a national sovereign cloud.'],
];
dep.forEach((d, i) => {
  const y = 2.0 + i * 1.08;
  card(s, 0.6, y, 12.13, 0.92, i % 2 ? PANEL : 'EAF1F8');
  s.addText(d[0], { x: 0.95, y, w: 3.0, h: 0.92, fontSize: 16, bold: true, color: BLUE, fontFace: HEAD, valign: 'middle', margin: 0 });
  s.addText(d[1], { x: 4.0, y, w: 8.5, h: 0.92, fontSize: 13, color: MUTED, fontFace: BODY, valign: 'middle', margin: 0 });
});
s.addText('Live for stakeholder testing today — accounts are approved by the administrator before access.',
  { x: 0.6, y: 6.5, w: 12, h: 0.4, fontSize: 11.5, italic: true, color: MUTED, fontFace: BODY, margin: 0 });
footer(s, 13);

// =====================================================================
// 14 — TAILORED FOR GHANA (dark)
// =====================================================================
s = p.addSlide(); s.background = { color: NAVY };
kicker(s, 'Built for Ghana', GOLD);
s.addText('Tailored to the Ghana Navy & the Yaoundé Architecture', { x: 0.6, y: 0.82, w: 12.1, h: 1.3, fontSize: 30, bold: true, color: 'FFFFFF', fontFace: HEAD, valign: 'top', margin: 0 });
const tail = [
  ['Ghana Navy command structure', 'NHQ MOC, Western & Eastern Naval Commands and Forward Operating Bases built in.'],
  ['Yaoundé Architecture', 'Models MMCC Zone F (Accra) and regional information-sharing for Gulf of Guinea security.'],
  ['National maritime geography', 'Ghana EEZ, territorial sea, Jubilee / TEN / Sankofa oil fields and fishing grounds.'],
  ['Inter-agency by design', 'Ghana Maritime Authority VTMIS, MRCC and Fisheries Commission as collaborators.'],
];
tail.forEach((t, i) => {
  const x = 0.6 + (i % 2) * 6.15;
  const y = 2.55 + Math.floor(i / 2) * 1.85;
  card(s, x, y, 5.9, 1.6, STEEL);
  s.addText(t[0], { x: x + 0.35, y: y + 0.22, w: 5.2, h: 0.55, fontSize: 16, bold: true, color: GOLD, fontFace: HEAD, valign: 'top', margin: 0 });
  s.addText(t[1], { x: x + 0.35, y: y + 0.78, w: 5.25, h: 0.7, fontSize: 12, color: 'C8D8E8', fontFace: BODY, valign: 'top', margin: 0 });
});
footer(s, 14);

// =====================================================================
// 15 — ROADMAP
// =====================================================================
s = p.addSlide(); s.background = { color: 'FFFFFF' };
kicker(s, 'The Path Forward', GREEN);
title(s, 'Roadmap to an operational system');
const road = [
  ['Now', 'Operating picture, dark-vessel detection, collaboration, roles & audit — live and demonstrable.', GREEN],
  ['Near term', 'Integrate live regional AIS (terrestrial + satellite), coastal radar and VMS feeds.', BLUE],
  ['Mid term', 'Satellite tasking to image dark contacts; pattern-of-life analytics & ML risk scoring.', GOLD],
  ['Operational', 'Hardened sovereign deployment, military authentication, and Yaoundé data-sharing links.', RED],
];
road.forEach((r, i) => {
  const x = 0.6 + i * 3.05;
  card(s, x, 2.15, 2.85, 3.7, PANEL);
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: x + 0.3, y: 2.42, w: 2.25, h: 0.55, fill: { color: r[2] === GOLD ? 'B58A00' : r[2] }, line: { type: 'none' }, rectRadius: 0.1 });
  s.addText(r[0], { x: x + 0.3, y: 2.42, w: 2.25, h: 0.55, align: 'center', valign: 'middle', fontSize: 15, bold: true, color: 'FFFFFF', fontFace: HEAD, margin: 0 });
  s.addText(r[1], { x: x + 0.32, y: 3.2, w: 2.25, h: 2.4, fontSize: 12.5, color: MUTED, fontFace: BODY, valign: 'top', margin: 0 });
  if (i < 3) s.addShape(p.shapes.LINE, { x: x + 2.85, y: 2.7, w: 0.2, h: 0, line: { color: 'B7C6D6', width: 1.5, endArrowType: 'triangle' } });
});
footer(s, 15);

// =====================================================================
// 16 — CLOSING (dark)
// =====================================================================
s = p.addSlide(); s.background = { color: NAVY };
s.addImage({ path: 'crest.png', x: 5.97, y: 1.2, w: 1.4, h: 1.34 });
s.addText('SeaWatch', { x: 1, y: 2.75, w: 11.33, h: 1.0, align: 'center', fontSize: 50, bold: true, color: 'FFFFFF', fontFace: HEAD, margin: 0 });
s.addText('Maritime Domain Awareness for the Ghana Navy', { x: 1, y: 3.85, w: 11.33, h: 0.5, align: 'center', fontSize: 17, color: GOLD, fontFace: BODY, margin: 0 });
s.addShape(p.shapes.LINE, { x: 4.67, y: 4.55, w: 4.0, h: 0, line: { color: '2A4A6B', width: 1 } });
s.addText('See  ·  Detect  ·  Collaborate  ·  Act', { x: 1, y: 4.7, w: 11.33, h: 0.5, align: 'center', fontSize: 16, italic: true, color: 'CFE0F0', fontFace: HEAD, margin: 0 });
s.addText('“Loyalty, Devotion and Excellence”', { x: 1, y: 5.7, w: 11.33, h: 0.5, align: 'center', fontSize: 13, color: '8FA8C2', fontFace: BODY, margin: 0 });

p.writeFile({ fileName: 'SeaWatch-Capabilities-Brief.pptx' }).then((f) => console.log('WROTE ' + f)).catch((e) => { console.error(e); process.exit(1); });
