// Central configuration for the SeaWatch MDA backend.
// Values are intentionally overridable via environment variables so the same
// build can run as a local demo or against real maritime data feeds.

// Parse a "minLat,minLon,maxLat,maxLon" string into a bbox, falling back to a
// default when unset or malformed.
function parseLiveBbox(s, def) {
  if (!s) return def;
  const p = s.split(',').map(Number);
  if (p.length !== 4 || p.some(Number.isNaN)) return def;
  return { minLat: p[0], minLon: p[1], maxLat: p[2], maxLon: p[3] };
}

const liveBbox = parseLiveBbox(process.env.LIVE_BBOX, { minLat: 1.4, minLon: -4.2, maxLat: 6.4, maxLon: 2.2 });

// MarineTraffic live-AIS provider (polling REST API — paid subscription).
// Provide MARINETRAFFIC_API_KEY; the area endpoint below is built from the live
// bounding box by default, or override the whole URL with MARINETRAFFIC_URL
// (recommended — paste the exact endpoint your MarineTraffic product gives you).
function marineTrafficCfg() {
  const key = process.env.MARINETRAFFIC_API_KEY || '';
  const bb = liveBbox;
  const defaultUrl = key
    ? `https://services.marinetraffic.com/api/exportvessels/v:8/${key}`
      + `/MINLAT:${bb.minLat}/MAXLAT:${bb.maxLat}/MINLON:${bb.minLon}/MAXLON:${bb.maxLon}`
      + `/protocol:jsono/msgtype:extended`
    : '';
  return {
    key,
    url: process.env.MARINETRAFFIC_URL || defaultUrl,
    pollSec: Number(process.env.MARINETRAFFIC_POLL_SEC) || 120, // respect your plan's rate limit
    speedTenths: process.env.MARINETRAFFIC_SPEED_TENTHS !== 'false', // MT reports SPEED in tenths of a knot
  };
}

// Data Docked provider (https://datadocked.com) — polling REST, credit-metered.
// Covers an area by querying one or more centre points (each a circle of
// radiusKm, max 50). Default is a single point over the busy Tema/Accra approach
// to conserve credits; add more via DATADOCKED_POINTS="lat,lon;lat,lon".
function dataDockedCfg() {
  const parsePoints = (s, def) => {
    if (!s) return def;
    const pts = s.split(';').map((p) => p.split(',').map(Number)).filter((p) => p.length === 2 && p.every(Number.isFinite));
    return pts.length ? pts : def;
  };
  return {
    key: process.env.DATADOCKED_API_KEY || '',
    points: parsePoints(process.env.DATADOCKED_POINTS, [[5.6, 0.0]]), // Tema / Accra approach
    radiusKm: Math.min(50, Number(process.env.DATADOCKED_RADIUS_KM) || 50),
    pollSec: Number(process.env.DATADOCKED_POLL_SEC) || 300, // 5 min default — conserve credits
    speedTenths: process.env.DATADOCKED_SPEED_TENTHS !== 'false',
  };
}

export const config = {
  port: Number(process.env.PORT) || 4000,

  // Data source: 'sim' (built-in simulator), 'live' (AISStream.io real feed),
  // or 'hybrid' (live feed + simulated own-force units / sensor contacts).
  // Falls back to 'sim' automatically when no AISStream API key is present.
  dataSource: process.env.DATA_SOURCE || 'sim',

  // Free real-time AIS. Get a key at https://aisstream.io (free signup) and set
  // AISSTREAM_API_KEY in the environment to enable the live feed.
  aisStreamKey: process.env.AISSTREAM_API_KEY || '',

  // Simulation tick: how often vessel positions advance and detection runs.
  tickMs: Number(process.env.TICK_MS) || 4000,

  // Geographic focus — Gulf of Guinea, centred on Ghana's maritime domain.
  bbox: {
    minLon: -4.2,
    maxLon: 2.2,
    minLat: 1.4,
    maxLat: 6.4,
  },

  // Bounding box for the LIVE subscription. Defaults to the Gulf of Guinea, but
  // can be pointed anywhere via LIVE_BBOX="minLat,minLon,maxLat,maxLon" — useful
  // to demonstrate the live feed over a well-covered area (e.g. Singapore Strait).
  liveBbox,
  liveRegion: process.env.LIVE_REGION || 'Gulf of Guinea',

  // MarineTraffic provider settings (see marineTrafficCfg above).
  marineTraffic: marineTrafficCfg(),

  // Data Docked provider settings (see dataDockedCfg above).
  dataDocked: dataDockedCfg(),

  // Number of simulated vessels for the demo dataset.
  vesselCount: Number(process.env.VESSEL_COUNT) || 90,

  // How many historical snapshots to retain for track replay (frames).
  historyFrames: Number(process.env.HISTORY_FRAMES) || 450, // ~30 min @ 4s

  // Dark-vessel detection thresholds.
  detection: {
    // Flag a vessel as suspected (gone dark) once it has not transmitted AIS for
    // more than 6 hours while at sea. Override with AIS_GAP_MINUTES.
    aisGapMinutes: Number(process.env.AIS_GAP_MINUTES) || 360,
    loiterSpeedKn: 1.2,
    loiterMinutes: 25,
    stsProximityNm: 0.6,
    impossibleSpeedKn: 45,
  },
};
