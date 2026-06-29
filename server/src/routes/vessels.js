// Vessel picture endpoints. The live stream comes over the socket; these REST
// endpoints serve the initial snapshot and on-demand detail / track history.
import { Router } from 'express';
import { store, listVessels } from '../store.js';

const router = Router();

// Strip the heavy track history from the list payload for performance.
function summarize(v) {
  const { track, ...rest } = v;
  return rest;
}

router.get('/vessels', (req, res) => {
  let vessels = listVessels();
  const { type, classification, flag, q, darkOnly } = req.query;
  if (type) vessels = vessels.filter((v) => v.type === type);
  if (classification) vessels = vessels.filter((v) => v.classification === classification);
  if (flag) vessels = vessels.filter((v) => v.flag === flag);
  if (darkOnly === 'true') vessels = vessels.filter((v) => v.flags && v.flags.length);
  if (q) {
    const s = String(q).toLowerCase();
    vessels = vessels.filter(
      (v) => v.name.toLowerCase().includes(s) || String(v.mmsi).includes(s)
    );
  }
  res.json(vessels.map(summarize));
});

// Rolling positional history for track replay.
router.get('/history', (_req, res) => res.json(store.history));

router.get('/vessels/:mmsi', (req, res) => {
  const v = store.vessels.get(Number(req.params.mmsi));
  if (!v) return res.status(404).json({ error: 'vessel not found' });
  res.json(v);
});

router.get('/vessels/:mmsi/track', (req, res) => {
  const v = store.vessels.get(Number(req.params.mmsi));
  if (!v) return res.status(404).json({ error: 'vessel not found' });
  res.json(v.track || []);
});

export default router;
