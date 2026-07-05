// Shared tactical overlays — map drawings (measurements, range rings, shapes,
// markers) that persist and are shared live across every connected MOC.
// Geometry is stored as a small JSON spec (kind + coordinates + style), not as
// Leaflet internals, so any client can re-render it.
import { Router } from 'express';
import { nanoid } from 'nanoid';
import { store } from '../store.js';
import { requireAuth, logAudit } from '../auth.js';
import { saveOverlay, deleteOverlay } from '../db.js';

const router = Router();

const KINDS = ['measure', 'polygon', 'rings', 'rect', 'circle', 'marker'];

router.get('/overlays', (_req, res) => res.json(store.overlays));

router.post('/overlays', requireAuth, (req, res) => {
  const { kind, geometry, color, weight, label } = req.body || {};
  if (!KINDS.includes(kind) || !geometry) {
    return res.status(400).json({ error: 'kind and geometry required' });
  }
  const overlay = {
    id: nanoid(8),
    kind,
    geometry, // kind-specific: pts / center+radiusM / bounds / pos
    color: color || '#fcd116',
    weight: Number(weight) || 2.5,
    label: (label || '').toString().slice(0, 120),
    author: req.user.name,
    mocId: req.user.mocId,
    ts: Date.now(),
  };
  store.overlays.push(overlay);
  saveOverlay(overlay);
  logAudit(req.user, 'overlay.create', `${overlay.kind} ${overlay.id}${overlay.label ? ` — ${overlay.label}` : ''}`);
  req.app.get('io')?.emit('overlay:new', overlay);
  res.status(201).json(overlay);
});

router.patch('/overlays/:id', requireAuth, (req, res) => {
  const o = store.overlays.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'overlay not found' });
  if (req.body?.color) o.color = req.body.color;
  if (req.body?.label !== undefined) o.label = String(req.body.label).slice(0, 120);
  saveOverlay(o);
  req.app.get('io')?.emit('overlay:update', o);
  res.json(o);
});

router.delete('/overlays/:id', requireAuth, (req, res) => {
  const i = store.overlays.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'overlay not found' });
  const [removed] = store.overlays.splice(i, 1);
  deleteOverlay(removed.id);
  logAudit(req.user, 'overlay.delete', `${removed.kind} ${removed.id}`);
  req.app.get('io')?.emit('overlay:delete', { id: removed.id });
  res.json({ ok: true });
});

export default router;
