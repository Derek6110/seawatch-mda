// Shore-station AIS provider — SeaWatch's own terrestrial feed.
//
// A Ghana Navy AIS receiver site (e.g. Tema) runs the small forwarder agent
// (see forwarder/ at the repo root), which reads raw NMEA from the receiver and
// POSTs it to /api/ingest/nmea with the site's INGEST_KEY. This module decodes
// the AIVDM sentences and upserts contacts into the shared vessel store, where
// the detection engine, risk scoring and alerts treat them exactly like any
// other live traffic. Contacts are tagged provider:'shore' for provenance.

import { config } from './config.js';
import { store } from './store.js';
import { AivdmDecoder } from './ais-decoder.js';

const TRACK_LEN = 30;
// Cap on shore-station contacts (a Tema antenna realistically hears a few
// hundred at most; this guards against decode garbage flooding the store).
const MAX_SHORE = Number(process.env.SHORE_MAX_VESSELS) || 300;
// Reject positions far outside the wider Gulf of Guinea — a terrestrial
// receiver cannot genuinely hear beyond a few hundred km, so anything else is
// a corrupt decode or GPS glitch.
const SANE = { minLat: -10, maxLat: 15, minLon: -15, maxLon: 10 };
// "Connected" = data received recently.
const FRESH_MS = 5 * 60 * 1000;

const decoder = new AivdmDecoder();
let lastDataAt = 0;
let totalDecoded = 0;

// Static data (name/type) often arrives before we have a position for that
// MMSI; cache it and apply when the first position report lands.
const pendingStatic = new Map(); // mmsi -> static patch
const PENDING_CAP = 500;

const isAidToNav = (mmsi) => String(mmsi).startsWith('99');

function typeFromCode(t) {
  if (t == null) return undefined;
  if (t >= 30 && t <= 39) return 'fishing';
  if (t >= 60 && t <= 69) return 'passenger';
  if (t >= 70 && t <= 79) return 'cargo';
  if (t >= 80 && t <= 89) return 'tanker';
  if (t >= 50 && t <= 59) return 'tug';
  if (t === 35) return 'naval';
  return 'cargo';
}

function shoreCount() {
  let n = 0;
  for (const v of store.vessels.values()) if (v.provider === 'shore') n++;
  return n;
}

function upsertPosition(m) {
  if (m.lat < SANE.minLat || m.lat > SANE.maxLat || m.lon < SANE.minLon || m.lon > SANE.maxLon) return false;
  let v = store.vessels.get(m.mmsi);
  const now = Date.now();
  if (!v) {
    if (shoreCount() >= MAX_SHORE) return false; // sticky cap, like the other live feeds
    const cached = pendingStatic.get(m.mmsi) || {};
    pendingStatic.delete(m.mmsi);
    v = {
      mmsi: m.mmsi, name: cached.name || m.name || `MMSI ${m.mmsi}`,
      callsign: cached.callsign || '', type: cached.type || typeFromCode(m.typeCode) || 'cargo',
      flag: flagFromMmsi(m.mmsi), isNavy: false, pennant: null,
      length: cached.length || m.length || 0,
      lon: m.lon, lat: m.lat, course: m.course || 0,
      heading: m.heading ?? m.course ?? 0,
      speed: m.speed || 0, baseSpeed: m.speed || 0,
      classification: 'neutral', aisOn: true, spoofing: false,
      lastReport: now, flags: [], track: [],
      destination: cached.destination || '',
      source: 'ais-live', provider: 'shore',
    };
    store.vessels.set(m.mmsi, v);
  } else {
    v.lat = m.lat; v.lon = m.lon;
    v.speed = m.speed ?? v.speed;
    v.course = m.course ?? v.course;
    v.heading = m.heading ?? m.course ?? v.heading;
    if (m.name) v.name = m.name;
    if (m.length) v.length = m.length;
    v.aisOn = true;
    v.lastReport = now;
    v.source = 'ais-live';
    v.provider = 'shore';
  }
  v.track.push({ lon: v.lon, lat: v.lat, ts: now });
  if (v.track.length > TRACK_LEN) v.track.shift();
  return true;
}

function upsertStatic(m) {
  const v = store.vessels.get(m.mmsi);
  const patch = {
    name: m.name, callsign: m.callsign,
    type: m.typeCode != null ? typeFromCode(m.typeCode) : undefined,
    length: m.length, destination: m.destination,
  };
  if (v) {
    for (const k in patch) if (patch[k] !== undefined) v[k] = patch[k];
    return;
  }
  // No position yet — remember the static data for when one arrives.
  if (pendingStatic.size >= PENDING_CAP) {
    const first = pendingStatic.keys().next().value;
    pendingStatic.delete(first);
  }
  const prev = pendingStatic.get(m.mmsi) || {};
  for (const k in patch) if (patch[k] !== undefined) prev[k] = patch[k];
  pendingStatic.set(m.mmsi, prev);
}

// Rough flag from the MMSI's MID (country) prefix — the ones common off Ghana.
const MIDS = {
  627: 'Ghana', 621: 'Togo', 619: 'Ivory Coast', 657: 'Nigeria', 610: 'Benin',
  636: 'Liberia', 538: 'Marshall Is', 371: 'Panama', 477: 'Hong Kong',
  636992: 'Liberia',
};
function flagFromMmsi(mmsi) {
  return MIDS[String(mmsi).slice(0, 3)] || 'Unknown';
}

// --- public API --------------------------------------------------------------

export function ingestNmea(lines) {
  let decoded = 0;
  let positions = 0;
  for (const line of lines) {
    const m = decoder.push(line);
    if (!m) continue;
    decoded++;
    if (isAidToNav(m.mmsi)) continue;
    if (m.kind === 'position') { if (upsertPosition(m)) positions++; }
    else upsertStatic(m);
  }
  if (decoded) {
    lastDataAt = Date.now();
    totalDecoded += decoded;
  }
  return { decoded, positions };
}

export function shoreConfigured() { return !!config.ingestKey; }
export function isShoreConnected() { return lastDataAt > 0 && Date.now() - lastDataAt < FRESH_MS; }
export function shoreStatus() {
  return {
    configured: shoreConfigured(),
    connected: isShoreConnected(),
    vessels: shoreCount(),
    messages: totalDecoded,
    site: config.shoreSite,
  };
}
