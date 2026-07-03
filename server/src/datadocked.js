// Live AIS provider — Data Docked (https://datadocked.com).
//
// Polling REST API. The "vessels by area" endpoint returns AIS positions within
// a circle (centre lat/lon + radius km, max 50km). To cover a region we poll one
// or more centre points on an interval and upsert into the shared vessel store
// (source='ais-live', provider='datadocked').
//
// NOTE: Data Docked charges credits per call. Each area query returns ~100
// vessels and costs credits, so keep the point count low and the interval long
// unless the account has ample credits. Configure via DATADOCKED_* env vars.

import { config } from './config.js';
import { store } from './store.js';

const BASE = 'https://datadocked.com/api/vessels_operations/get-vessels-by-area';
const TRACK_LEN = 30;
let timer = null;
let connected = false;
let lastError = null;
let lastCount = 0;
let outOfCredits = false;

export function isDdConnected() { return connected; }
export function ddStatus() { return { connected, lastError, lastCount, outOfCredits }; }

function typeFromDd(ts) {
  const s = (ts || '').toLowerCase();
  if (s.includes('fish')) return 'fishing';
  if (s.includes('tanker')) return 'tanker';
  if (s.includes('cargo') || s.includes('carrier') || s.includes('container') || s.includes('bulk')) return 'cargo';
  if (s.includes('passenger') || s.includes('cruise') || s.includes('ferry')) return 'passenger';
  if (s.includes('tug') || s.includes('pilot')) return 'tug';
  if (s.includes('supply') || s.includes('offshore') || s.includes('platform')) return 'supply';
  if (s.includes('navy') || s.includes('military') || s.includes('war')) return 'naval';
  return 'cargo';
}

// MMSI beginning 99 = Aid to Navigation (buoys, beacons, sea-farm marks) — not a
// vessel; skip so the picture stays ships-only.
const isAidToNav = (mmsi) => String(mmsi).startsWith('99');

// Data Docked reports speed in tenths of a knot by default.
function speedKn(raw) {
  const n = Number(raw);
  if (!isFinite(n) || n < 0) return 0;
  return config.dataDocked.speedTenths ? +(n / 10).toFixed(1) : +n.toFixed(1);
}

function upsert(row) {
  const mmsi = Number(row.mmsi ?? row.MMSI);
  const lat = parseFloat(row.latitude ?? row.lat);
  const lon = parseFloat(row.longitude ?? row.lon);
  if (!mmsi || !isFinite(lat) || !isFinite(lon)) return false;
  if (isAidToNav(mmsi)) return false;

  const now = Date.now();
  let v = store.vessels.get(mmsi);
  const course = Number(row.course) || 0;
  const heading = row.heading != null && Number(row.heading) !== 511 ? Number(row.heading) : course;
  const patch = {
    lat, lon, course, heading, speed: speedKn(row.speed),
    name: (row.name || '').toString().trim() || undefined,
    type: typeFromDd(row.typeSpecific || row.type),
    destination: (row.destination || '').toString().trim() || undefined,
  };

  if (!v) {
    v = {
      mmsi, name: patch.name || `MMSI ${mmsi}`, callsign: '', type: patch.type || 'cargo',
      flag: 'Unknown', isNavy: false, pennant: null, length: 0, lon, lat, course, heading,
      speed: patch.speed || 0, baseSpeed: patch.speed || 0, classification: 'neutral',
      aisOn: true, spoofing: false, lastReport: now, flags: [], track: [],
      destination: patch.destination || '', source: 'ais-live', provider: 'datadocked',
    };
    store.vessels.set(mmsi, v);
  }
  for (const k in patch) if (patch[k] !== undefined) v[k] = patch[k];
  v.aisOn = true;
  v.lastReport = now;
  v.source = 'ais-live';
  v.provider = 'datadocked';
  v.track.push({ lon, lat, ts: now });
  if (v.track.length > TRACK_LEN) v.track.shift();
  return true;
}

async function pollPoint(lat, lon) {
  const url = `${BASE}?latitude=${lat}&longitude=${lon}&circle_radius=${config.dataDocked.radiusKm}`;
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 25000);
  try {
    const r = await fetch(url, { headers: { accept: 'application/json', 'x-api-key': config.dataDocked.key }, signal: c.signal });
    if (!r.ok) {
      const b = await r.text();
      if (r.status === 400 && /credit/i.test(b)) {
        outOfCredits = true;
        lastError = 'out of credits';
        console.warn('  Data Docked: out of credits — pausing further polls.');
      } else {
        lastError = `HTTP ${r.status}`;
      }
      return 0;
    }
    const j = await r.json();
    const arr = Array.isArray(j) ? j : (j.data || j.vessels || j.results || []);
    let n = 0;
    for (const row of arr) if (upsert(row)) n++;
    outOfCredits = false;
    return n;
  } finally {
    clearTimeout(t);
  }
}

async function poll() {
  if (!config.dataDocked.key || outOfCredits) return;
  let total = 0;
  let ok = false;
  for (const [lat, lon] of config.dataDocked.points) {
    if (outOfCredits) break;
    try { total += await pollPoint(lat, lon); ok = true; }
    catch (e) { lastError = e.message; }
  }
  if (ok && !outOfCredits) {
    connected = true;
    lastCount = total;
    if (total) console.log(`  Data Docked: ${total} vessels ingested from ${config.dataDocked.points.length} area(s).`);
  } else if (outOfCredits) {
    connected = false;
  }
}

export function startDataDocked() {
  if (!config.dataDocked.key) return false;
  if (timer) return true;
  outOfCredits = false;
  console.log(`  Data Docked: polling ${config.dataDocked.points.length} area(s) every ${config.dataDocked.pollSec}s (credit-metered).`);
  poll();
  timer = setInterval(poll, config.dataDocked.pollSec * 1000);
  return true;
}

export function stopDataDocked() {
  clearInterval(timer);
  clearTimeout(timer);
  timer = null;
  connected = false;
}
