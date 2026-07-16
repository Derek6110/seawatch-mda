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
let ws = null;
let connected = false;
let reconnectTimer = null;
let stopped = false;

export function isLiveConnected() {
  return connected;
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

function upsert(mmsi, patch) {
  let v = store.vessels.get(mmsi);
  const now = Date.now();
  if (!v) {
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
    ws.on('open', () => {
      connected = true;
      console.log(`  AISStream: connected — streaming live AIS for ${config.liveRegion}.`);
      ws.send(JSON.stringify({
        APIKey: config.aisStreamKey,
        // [[SW lat, SW lon], [NE lat, NE lon]]
        BoundingBoxes: [[[bbox.minLat, bbox.minLon], [bbox.maxLat, bbox.maxLon]]],
        FilterMessageTypes: ['PositionReport', 'StandardClassBPositionReport', 'ExtendedClassBPositionReport', 'ShipStaticData'],
      }));
    });
    ws.on('message', handleMessage);
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
  return true;
}

// Stop the live feed and drop already-ingested live contacts.
export function stopLiveAis() {
  stopped = true;
  clearTimeout(reconnectTimer);
  try { ws?.close(); } catch { /* noop */ }
  ws = null;
  connected = false;
  for (const v of [...store.vessels.values()]) {
    if (v.source === 'ais-live') store.vessels.delete(v.mmsi);
  }
}

// Cap the live picture so a busy subscription (e.g. the Dover Strait, which can
// stream 1500+ contacts) stays smooth to render on the map. We keep the most
// recently-reporting contacts, which is the freshest, most relevant picture.
const MAX_LIVE = Number(process.env.MAX_LIVE_VESSELS) || 150;

// Live vessels whose AIS has not refreshed within the going-dark threshold are
// marked dark so the detection engine flags them just like simulated contacts.
// Eviction happens well past the gone-dark tier so a silent vessel is flagged
// (going dark at 2h, gone dark at 3h) before it is dropped from the picture.
export function ageLiveVessels() {
  const now = Date.now();
  const gapMs = config.detection.goingDarkMinutes * 60 * 1000;
  const staleMs = Math.max(6 * 60 * 60 * 1000, config.detection.goneDarkMinutes * 2 * 60 * 1000);
  const live = [];
  for (const v of store.vessels.values()) {
    if (v.source !== 'ais-live') continue;
    if (now - v.lastReport > gapMs) v.aisOn = false;
    if (now - v.lastReport > staleMs) { store.vessels.delete(v.mmsi); continue; }
    live.push(v);
  }
  if (live.length > MAX_LIVE) {
    live.sort((a, b) => a.lastReport - b.lastReport)
      .slice(0, live.length - MAX_LIVE)
      .forEach((v) => store.vessels.delete(v.mmsi));
  }
}
