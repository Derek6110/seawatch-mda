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
  liveBbox: parseLiveBbox(process.env.LIVE_BBOX, { minLat: 1.4, minLon: -4.2, maxLat: 6.4, maxLon: 2.2 }),
  liveRegion: process.env.LIVE_REGION || 'Gulf of Guinea',

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
