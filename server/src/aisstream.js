// Live AIS provider using AISStream.io — a free real-time global AIS feed
// (terrestrial + satellite) delivered over WebSocket.
//
// Get a free API key at https://aisstream.io and set AISSTREAM_API_KEY.
// When connected, incoming position/static reports are upserted into the shared
// vessel store with source='ais-live'; the detection engine then runs over them
// exactly as it does for simulated traffic.

import { WebSocket } from 'ws';
import { config } from './config.js';
import { store } from './store.js';

const TRACK_LEN = 30;
// If the socket is "connected" but no message arrives for this long, treat the
// stream as dead and force a reconnect. AISStream can stop delivering without
// closing the socket (e.g. a competing connection on the same free-tier key, or
// an upstream stall), which would otherwise leave us connected-but-empty forever.
const STALE_MS = Number(process.env.AISSTREAM_STALE_SEC || 45) * 1000;

let ws = null;
let connected = false;
let reconnectTimer = null;
let watchdogTimer = null;
let lastMessageAt = 0;
let stopped = false;

export function isLiveConnected() {
  return connected;
}
// True only when connected AND actually receiving data recently.
export function isLiveStreaming() {
  return connected && lastMessageAt > 0 && Date.now() - lastMessageAt < STALE_MS;
}

function typeFromAis(t) {
  // Map AIS ship-type codes to our categories.
  if (t == null) return 'cargo';
  if (t >= 30 && t <= 39) return 'fishing';
  if (t >= 60 && t <= 69) return 'passenger';
  if (t >= 70 && t <= 79) return 'cargo';
  if (t >= 80 && t <= 89) return 'tanker';
  if (t >= 50 && t <= 59) return 'tug';
  if (t === 35) return 'naval';
  return 'cargo';
}

function liveCount() {
  let n = 0;
  for (const v of store.vessels.values()) if (v.source === 'ais-live') n++;
  return n;
}

function upsert(mmsi, patch) {
  let v = store.vessels.get(mmsi);
  const now = Date.now();
  if (!v) {
    // Sticky cap: once we're tracking MAX_LIVE contacts, keep updating those but
    // do NOT admit brand-new ones. This keeps the displayed set stable — a shown
    // vessel is never dropped just because a newer contact arrived (which is what
    // made vessels flicker in/out). Slots free up only as vessels age out
    // (retention window), so the picture changes slowly and stays verifiable.
    if (liveCount() >= MAX_LIVE) return;
    v = {
      mmsi, name: patch.name || `MMSI ${mmsi}`, callsign: patch.callsign || '',
      type: patch.type || 'cargo', flag: patch.flag || 'Unknown', isNavy: false,
      pennant: null, length: patch.length || 0, lon: patch.lon, lat: patch.lat,
      course: patch.course || 0, heading: patch.heading || patch.course || 0,
      speed: patch.speed || 0, baseSpeed: patch.speed || 0,
      classification: 'neutral', aisOn: true, spoofing: false,
      lastReport: now, flags: [], track: [], destination: patch.destination || '',
      source: 'ais-live',
    };
    store.vessels.set(mmsi, v);
  }
  // Merge only defined fields — AIS messages often omit values (e.g. empty ship
  // name), and a plain Object.assign would clobber good data with undefined.
  for (const k in patch) if (patch[k] !== undefined) v[k] = patch[k];
  v.aisOn = true;
  v.lastReport = now;
  v.source = 'ais-live';
  if (patch.lat != null && patch.lon != null) {
    v.track.push({ lon: v.lon, lat: v.lat, ts: now });
    if (v.track.length > TRACK_LEN) v.track.shift();
  }
}

function handleMessage(raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }
  const meta = msg.MetaData || {};
  const mmsi = meta.MMSI || meta.MMSI_String;
  if (!mmsi) return;

  // Class-A and Class-B position reports both carry lat/lon/speed/course but
  // under different keys — handle all common position message types.
  const posTypes = {
    PositionReport: 'PositionReport',
    StandardClassBPositionReport: 'StandardClassBPositionReport',
    ExtendedClassBPositionReport: 'ExtendedClassBPositionReport',
  };
  if (posTypes[msg.MessageType]) {
    const p = msg.Message?.[posTypes[msg.MessageType]];
    if (!p) return;
    const lat = p.Latitude ?? meta.latitude;
    const lon = p.Longitude ?? meta.longitude;
    if (lat == null || lon == null) return;
    upsert(Number(mmsi), {
      lat, lon,
      speed: p.Sog ?? 0, course: p.Cog ?? 0,
      heading: p.TrueHeading && p.TrueHeading !== 511 ? p.TrueHeading : (p.Cog ?? 0),
      name: (meta.ShipName || '').trim() || undefined,
    });
  } else if (msg.MessageType === 'ShipStaticData') {
    const s = msg.Message?.ShipStaticData;
    if (!s) return;
    const dim = s.Dimension || {};
    upsert(Number(mmsi), {
      name: (s.Name || meta.ShipName || '').trim() || undefined,
      callsign: (s.CallSign || '').trim() || undefined,
      type: typeFromAis(s.Type),
      length: (dim.A || 0) + (dim.B || 0) || undefined,
      destination: (s.Destination || '').trim() || undefined,
      lat: meta.latitude, lon: meta.longitude,
    });
  }
}

export function startLiveAis() {
  if (!config.aisStreamKey) {
    console.log('  AISStream: no API key set — staying in simulation mode.');
    return false;
  }
  if (ws && (connected || ws.readyState === 0)) return true; // already running
  stopped = false;
  const bbox = config.liveBbox;
  const connect = () => {
    if (stopped) return;
    ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    lastMessageAt = Date.now(); // grace period from connect attempt
    ws.on('open', () => {
      connected = true;
      lastMessageAt = Date.now();
      console.log(`  AISStream: connected — streaming live AIS for ${config.liveRegion}.`);
      ws.send(JSON.stringify({
        APIKey: config.aisStreamKey,
        // [[SW lat, SW lon], [NE lat, NE lon]]
        BoundingBoxes: [[[bbox.minLat, bbox.minLon], [bbox.maxLat, bbox.maxLon]]],
        FilterMessageTypes: ['PositionReport', 'StandardClassBPositionReport', 'ExtendedClassBPositionReport', 'ShipStaticData'],
      }));
    });
    ws.on('message', (raw) => {
      lastMessageAt = Date.now();
      handleMessage(raw);
    });
    ws.on('close', () => {
      connected = false;
      console.warn('  AISStream: disconnected — retrying in 5s.');
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 5000);
    });
    ws.on('error', (e) => {
      console.error('  AISStream error:', e.message);
      try { ws.close(); } catch { /* noop */ }
    });
  };
  connect();

  // Watchdog: if we appear connected but have gone silent past STALE_MS, the
  // stream is dead — force a fresh reconnect (terminate → 'close' → reconnect).
  clearInterval(watchdogTimer);
  watchdogTimer = setInterval(() => {
    if (stopped || !ws) return;
    const openish = connected || ws.readyState === 0; // OPEN or CONNECTING
    if (openish && Date.now() - lastMessageAt > STALE_MS) {
      console.warn(`  AISStream: no data for ${Math.round((Date.now() - lastMessageAt) / 1000)}s — forcing reconnect.`);
      lastMessageAt = Date.now(); // reset so we don't loop before the reconnect settles
      try { ws.terminate(); } catch { try { ws.close(); } catch { /* noop */ } }
    }
  }, 15000);

  return true;
}

// Stop the live feed and drop already-ingested live contacts.
export function stopLiveAis() {
  stopped = true;
  clearTimeout(reconnectTimer);
  clearInterval(watchdogTimer);
  try { ws?.close(); } catch { /* noop */ }
  ws = null;
  connected = false;
  lastMessageAt = 0;
  for (const v of [...store.vessels.values()]) {
    if (v.source === 'ais-live') store.vessels.delete(v.mmsi);
  }
}

// Maximum live contacts held/rendered at once (sticky — see upsert). Sized so a
// busy subscription stays smooth on the map. Override with MAX_LIVE_VESSELS.
const MAX_LIVE = Number(process.env.MAX_LIVE_VESSELS) || 220;

// Retention window: a live contact stays on the picture for this long after its
// LAST AIS report before being dropped. This is what makes the feed STABLE — a
// vessel does not blink out between position reports (which can be seconds to a
// few minutes apart); it only disappears once it has genuinely been silent for
// the full window (left the area / stopped transmitting), matching what a real
// MDA tool shows. Override with LIVE_RETENTION_MIN (minutes).
const RETENTION_MS = (Number(process.env.LIVE_RETENTION_MIN) || 10) * 60 * 1000;

export function ageLiveVessels() {
  const now = Date.now();
  const live = [];
  for (const v of store.vessels.values()) {
    if (v.source !== 'ais-live') continue;
    // Drop only contacts silent longer than the retention window.
    if (now - v.lastReport > RETENTION_MS) { store.vessels.delete(v.mmsi); continue; }
    live.push(v);
  }
  // Pure safety valve: should never trigger given the sticky ingestion cap, but
  // guards against unbounded growth. Drops the STALEST first (never a fresh one).
  if (live.length > MAX_LIVE) {
    live.sort((a, b) => a.lastReport - b.lastReport)
      .slice(0, live.length - MAX_LIVE)
      .forEach((v) => store.vessels.delete(v.mmsi));
  }
}
