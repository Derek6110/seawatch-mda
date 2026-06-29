// Runtime data-source switching (Simulation / Live AIS / Hybrid).
import { Router } from 'express';
import { requireAuth, logAudit } from '../auth.js';
import { getMode, setMode, liveAvailable } from '../source.js';

const router = Router();

router.get('/source', (_req, res) => res.json({ mode: getMode(), liveAvailable: liveAvailable() }));

router.post('/source/mode', requireAuth, (req, res) => {
  try {
    const mode = setMode(req.body?.mode);
    logAudit(req.user, 'source.switch', `Data source → ${mode.toUpperCase()}`);
    res.json({ mode, liveAvailable: liveAvailable() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
