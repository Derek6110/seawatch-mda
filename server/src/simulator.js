// AIS traffic simulator. Produces a realistic-looking live picture for the
// Gulf of Guinea and periodically injects the anomalies that the detection
// engine turns into dark-vessel alerts. In production this module is replaced
// by a real ingestion pipeline (AIS receivers, coastal radar, SAT-AIS, optical
// satellite) that writes into the same vessel store.

import { config } from './config.js';
import { store } from './store.js';
import { project, randomInBbox, pointInPolygon } from './geo.js';
import {
  FLAGS, VESSEL_TYPES, SHIP_NAMES, NAVY_UNITS, ZONES,
} from './seed.js';

const TRACK_LEN = 30; // history points kept per vessel

function weightedType() {
  const total = VESSEL_TYPES.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of VESSEL_TYPES) {
    if ((r -= t.weight) <= 0) return t.type;
  }
  return 'cargo';
}

function speedForType(type) {
  switch (type) {
    case 'fishing': return 2 + Math.random() * 6;
    case 'tanker': return 8 + Math.random() * 5;
    case 'cargo': return 10 + Math.random() * 8;
    case 'passenger': return 12 + Math.random() * 8;
    case 'naval': return 8 + Math.random() * 14;
    case 'supply': return 6 + Math.random() * 6;
    case 'tug': return 4 + Math.random() * 5;
    default: return 8;
  }
}

function randomMmsi(flag) {
  // First 3 digits = MID (maritime identification digits). A handful of real-ish
  // MIDs for regional flavour; the rest random.
  const mid = { Ghana: 627, Nigeria: 657, Togo: 671, Benin: 610, Liberia: 636,
    Panama: 351, 'Côte d’Ivoire': 619 }[flag] || 200 + Math.floor(Math.random() * 600);
  return Number(`${mid}${Math.floor(100000 + Math.random() * 899999)}`);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

let nameIdx = 0;

function makeVessel(i) {
  const isNavy = i < NAVY_UNITS.length;
  const type = isNavy ? 'naval' : weightedType();
  const flag = isNavy ? 'Ghana' : pick(FLAGS);
  const pos = randomInBbox(config.bbox);
  const name = isNavy
    ? NAVY_UNITS[i].name
    : `${SHIP_NAMES[nameIdx++ % SHIP_NAMES.length]}${nameIdx > SHIP_NAMES.length ? ' II' : ''}`;

  const course = Math.random() * 360;
  const speed = speedForType(type);
  return {
    mmsi: randomMmsi(flag),
    name,
    callsign: `9G${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(1000 + Math.random() * 8999)}`,
    type,
    flag,
    isNavy,
    pennant: isNavy ? NAVY_UNITS[i].pennant : null,
    length: isNavy ? 28 + Math.floor(Math.random() * 40) : 40 + Math.floor(Math.random() * 220),
    lon: pos.lon,
    lat: pos.lat,
    course,
    heading: course,
    speed,
    baseSpeed: speed,
    // classification: friendly | neutral | unknown | suspect
    classification: isNavy ? 'friendly' : Math.random() < 0.12 ? 'unknown' : 'neutral',
    aisOn: true,
    spoofing: false,
    lastReport: Date.now(),
    flags: [], // active anomaly tags, set by detection engine
    track: [{ lon: pos.lon, lat: pos.lat, ts: Date.now() }],
    destination: pick(['TEMA', 'TAKORADI', 'LOME', 'ABIDJAN', 'LAGOS', 'FISHING GROUNDS', 'JUBILEE FIELD', 'OFFSHORE']),
    // sensor provenance — 'sim' here; live feed sets 'ais-live'. Some contacts
    // are modelled as radar/satellite (non-cooperative) to show sensor fusion.
    source: isNavy ? 'ais' : Math.random() < 0.08 ? 'radar' : Math.random() < 0.08 ? 'sat' : 'sim',
  };
}

function populateSim() {
  for (let i = 0; i < config.vesselCount; i++) {
    const v = makeVessel(i);
    store.vessels.set(v.mmsi, v);
  }
  // Pre-arm a few anomalies so the first screen already shows tracked threats.
  const arr = Array.from(store.vessels.values()).filter((v) => !v.isNavy && v.source !== 'ais-live');
  goDark(pick(arr));
  startLoiter(pick(arr.filter((v) => v.type === 'fishing')) || pick(arr));
  startSpoof(pick(arr));
}

export function initVessels() {
  store.vessels.clear();
  populateSim();
}

// Add simulated vessels only if none are present (preserves live contacts).
export function ensureSimVessels() {
  const hasSim = [...store.vessels.values()].some((v) => v.source !== 'ais-live');
  if (!hasSim) populateSim();
}

// Remove only the simulated vessels (used when switching to pure-live mode).
export function clearSimVessels() {
  for (const v of [...store.vessels.values()]) {
    if (v.source !== 'ais-live') store.vessels.delete(v.mmsi);
  }
}

// --- anomaly injectors ------------------------------------------------------
function goDark(v) {
  if (!v) return;
  v.aisOn = false;
  v.classification = 'suspect';
  // backdate last report so it immediately reads as an AIS gap
  v.lastReport = Date.now() - (config.detection.aisGapMinutes + 5) * 60 * 1000;
}

function startLoiter(v) {
  if (!v) return;
  v.speed = 0.4;
  v.loiterSince = Date.now() - (config.detection.loiterMinutes + 8) * 60 * 1000;
}

function startSpoof(v) {
  if (!v) return;
  v.spoofing = true;
  v.classification = 'suspect';
}

// --- main tick --------------------------------------------------------------
function inAnyZoneOfKind(point, kinds) {
  return ZONES.some(
    (z) => kinds.includes(z.kind) && pointInPolygon(point, z.polygon)
  );
}

export function tick() {
  const now = Date.now();
  const { bbox } = config;

  for (const v of store.vessels.values()) {
    // Occasional course wander for natural-looking tracks.
    if (Math.random() < 0.15) v.course = (v.course + (Math.random() * 30 - 15) + 360) % 360;

    // Keep vessels inside the operating area by steering back when near edges.
    if (v.lon < bbox.minLon + 0.2) v.course = 90 + (Math.random() * 40 - 20);
    if (v.lon > bbox.maxLon - 0.2) v.course = 270 + (Math.random() * 40 - 20);
    if (v.lat < bbox.minLat + 0.2) v.course = 0 + (Math.random() * 40 - 20);
    if (v.lat > bbox.maxLat - 0.2) v.course = 180 + (Math.random() * 40 - 20);
    v.heading = v.course;

    const minutes = config.tickMs / 60000;
    let effSpeed = v.speed;

    // Spoofing vessels report an implausible teleport every few ticks.
    if (v.spoofing && Math.random() < 0.25) {
      const jump = project(v, Math.random() * 360, 8 + Math.random() * 12);
      v.lon = jump.lon;
      v.lat = jump.lat;
    } else {
      const np = project(v, v.course, (effSpeed * minutes) / 60);
      v.lon = np.lon;
      v.lat = np.lat;
    }

    // Vessels still transmitting refresh their AIS timestamp.
    if (v.aisOn) {
      v.lastReport = now;
      v.track.push({ lon: v.lon, lat: v.lat, ts: now });
      if (v.track.length > TRACK_LEN) v.track.shift();
    }
  }

  // Randomly evolve the threat picture so a live demo keeps producing alerts.
  const civ = Array.from(store.vessels.values()).filter((v) => !v.isNavy);
  if (Math.random() < 0.18) goDark(pick(civ));
  if (Math.random() < 0.15) startLoiter(pick(civ.filter((v) => v.type === 'fishing')) || pick(civ));
  if (Math.random() < 0.1) startSpoof(pick(civ));
  // Occasionally a dark vessel "reappears" (resumes AIS) — resolves its gap.
  if (Math.random() < 0.12) {
    const dark = civ.find((v) => !v.aisOn);
    if (dark) {
      dark.aisOn = true;
      dark.lastReport = now;
      dark.loiterSince = null;
      if (!dark.spoofing) dark.classification = 'neutral';
    }
  }
}

export { inAnyZoneOfKind };
