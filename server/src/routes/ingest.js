// Raw-AIS ingest endpoint for Navy shore-station receivers.
//
// The forwarder agent at the receiver site POSTs batches of NMEA lines here,
// authenticated with the site's INGEST_KEY (a shared secret set in the server
// environment). Ingest is accepted only while the data source is in Live or
// Hybrid mode, mirroring how the other live feeds behave.

import { Router } from 'express';
import { config } from '../config.js';
import { ingestNmea, shoreStatus } from '../shorestation.js';
import { liveActive } from '../source.js';

const router = Router();

router.post('/ingest/nmea', (req, res) => {
  if (!config.ingestKey) {
    return res.status(503).json({ error: 'ingest not configured on this server (INGEST_KEY unset)' });
  }
  if (req.headers['x-ingest-key'] !== config.ingestKey) {
    return res.status(401).json({ error: 'invalid ingest key' });
  }
  const lines = Array.isArray(req.body?.lines) ? req.body.lines.slice(0, 2000) : null;
  if (!lines) return res.status(400).json({ error: 'expected JSON body { lines: ["!AIVDM,...", ...] }' });
  if (!liveActive()) {
    // Simulation mode clears live contacts; don't ingest into a picture that
    // would immediately discard them — tell the forwarder we're paused.
    return res.status(202).json({ paused: true, note: 'server is in SIMULATION mode — switch to Live/Hybrid to ingest' });
  }
  const result = ingestNmea(lines);
  res.json({ ok: true, ...result, vessels: shoreStatus().vessels });
});

export default router;
