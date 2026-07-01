// Live AIS provider — MarineTraffic.
//
// MarineTraffic exposes a *polling* REST API (not a stream). You subscribe to a
// positions product (e.g. "PS06 — Vessel Positions in a Predefined Area" for the
// Gulf of Guinea, or "Export Vessels"), and it returns JSON positions for your
// account's area/fleet. We poll it on an interval and upsert into the shared
// vessel store, tagged source='ais-live' (provider='marinetraffic') so the
// detection engine treats it exactly like any other live AIS.
//
// Configure with MARINETRAFFIC_API_KEY (and optionally MARINETRAFFIC_URL with the
// exact endpoint your subscription gives you). See config.js / DEPLOY notes.

import { config } from './config.js';
import { store } from './store.js';

const TRACK_LEN = 30;
let timer = null;
let connected = false;
let lastError = null;
let lastCount = 0;

export function isMtConnected() { return connected; }
export function mtStatus() { return { connected, lastError, lastCount }; }

// Common 2-letter MarineTraffic flag codes → display names (extend as needed).
const FLAGS = {
  GH: 'Ghana', NG: 'Nigeria', TG: 'Togo', BJ: 'Benin', CI: 'Côte d’Ivoire',
  LR: 'Liberia', PA: 'Panama', MH: 'Marshall Islands', CN: 'China', NL: 'Netherlands',
  GR: 'Greece', GB: 'United Kingdom', FR: 'France', ES: 'Spain', SN: 'Senegal',
};

// MarineTraffic SHIPTYPE is an AIS numeric type; TYPE_NAME (if present) is a label.
function typeFromMt(row) {
  const tn = String(row.TYPE_NAME || row.AIS_TYPE_SUMMARY || '').toLowerCase();
  if (tn.includes('fish')) return 'fishing';
  if (tn.includes('tanker')) return 'tanker';
  if (tn.includes('cargo')) return 'cargo';
  if (tn.includes('passenger')) return 'passenger';
  if (tn.includes('tug')) return 'tug';
  if (tn.includes('navy') || tn.includes('military')) return 'naval';
  const t = Number(row.SHIPTYPE);
  if (t >= 30 && t <= 39) return 'fishing';
  if (t >= 60 && t <= 69) return 'passenger';
  if (t >= 70 && t <= 79) return 'cargo';
  if (t >= 80 && t <= 89) return 'tanker';
  if (t >= 50 && t <= 59) return 'tug';
  return 'cargo';
}

// MarineTraffic SPEED is reported in tenths of a knot (e.g. 105 = 10.5 kn).
function speedKn(raw) {
  const n = Number(raw);
  if (!isFinite(n) || n < 0) return 0;
  return config.marineTraffic.speedTenths ? +(n / 10).toFixed(1) : +n.toFixed(1);
}

function upsert(row) {
  // Normalise keys to upper-case so we tolerate casing differences between products.
  const r = {};
  for (const k in row) r[k.toUpperCase()] = row[k];
  const mmsi = Number(r.MMSI);
  const lat = Number(r.LAT);
  const lon = Number(r.LON);
  if (!mmsi || !isFinite(lat) || !isFinite(lon)) return false;

  const now = Date.now();
  let v = store.vessels.get(mmsi);
  const course = Number(r.COURSE ?? r.COG ?? 0) || 0;
  const heading = r.HEADING && Number(r.HEADING) !== 511 ? Number(r.HEADING) : course;
  const patch = {
    lat, lon, course, heading, speed: speedKn(r.SPEED),
    name: (r.SHIPNAME || '').toString().trim() || undefined,
    callsign: (r.CALLSIGN || '').toString().trim() || undefined,
    type: typeFromMt(r),
    flag: FLAGS[r.FLAG] || r.FLAG || undefined,
    length: Number(r.LENGTH) || undefined,
    destination: (r.DESTINATION || '').toString().trim() || undefined,
  };

  if (!v) {
    v = {
      mmsi, name: patch.name || `MMSI ${mmsi}`, callsign: patch.callsign || '',
      type: patch.type || 'cargo', flag: patch.flag || 'Unknown', isNavy: false,
      pennant: null, length: patch.length || 0, lon, lat, course, heading,
      speed: patch.speed || 0, baseSpeed: patch.speed || 0,
      classification: 'neutral', aisOn: true, spoofing: false,
      lastReport: now, flags: [], track: [], destination: patch.destination || '',
      source: 'ais-live', provider: 'marinetraffic',
    };
    store.vessels.set(mmsi, v);
  }
  // Merge only defined fields so empty values never clobber good data.
  for (const k in patch) if (patch[k] !== undefined) v[k] = patch[k];
  v.aisOn = true;
  v.lastReport = now;
  v.source = 'ais-live';
  v.provider = 'marinetraffic';
  v.track.push({ lon, lat, ts: now });
  if (v.track.length > TRACK_LEN) v.track.shift();
  return true;
}

async function poll() {
  const url = config.marineTraffic.url;
  if (!url) return;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      connected = false;
      lastError = `HTTP ${res.status}`;
      if (res.status === 429) console.warn('  MarineTraffic: rate limited (429) — increase MARINETRAFFIC_POLL_SEC.');
      else console.warn(`  MarineTraffic: request failed (${res.status}).`);
      return;
    }
    const body = await res.json();
    // jsono → array of objects; some products wrap in { DATA: [...] } or return arrays.
    const rows = Array.isArray(body) ? body : (body.DATA || body.data || []);
    let n = 0;
    for (const row of rows) if (upsert(row)) n++;
    connected = true;
    lastError = null;
    lastCount = n;
    if (n) console.log(`  MarineTraffic: ${n} vessel positions ingested.`);
  } catch (e) {
    connected = false;
    lastError = e.message;
    console.error('  MarineTraffic poll error:', e.message);
  }
}

export function startMarineTraffic() {
  if (!config.marineTraffic.url) {
    if (config.marineTraffic.key) console.warn('  MarineTraffic: key set but no resolvable endpoint URL.');
    return false;
  }
  if (timer) return true; // already polling
  console.log(`  MarineTraffic: polling every ${config.marineTraffic.pollSec}s for ${config.liveRegion}.`);
  poll();
  timer = setInterval(poll, config.marineTraffic.pollSec * 1000);
  return true;
}

// Stop polling. Vessel records are aged/cleared by the shared live-vessel logic
// (and dropped on a switch to simulation), so we only stop the timer here.
export function stopMarineTraffic() {
  clearTimeout(timer);
  clearInterval(timer);
  timer = null;
  connected = false;
}
