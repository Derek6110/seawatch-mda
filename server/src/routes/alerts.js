// Dark-vessel / anomaly alert endpoints.
import { Router } from 'express';
import { store } from '../store.js';
import { requireAuth, requireCap, logAudit } from '../auth.js';

const router = Router();

router.get('/alerts', (req, res) => {
  let alerts = store.alerts;
  const { status, severity, type } = req.query;
  if (status) alerts = alerts.filter((a) => a.status === status);
  if (severity) alerts = alerts.filter((a) => a.severity === severity);
  if (type) alerts = alerts.filter((a) => a.type === type);
  res.json(alerts.slice(0, 200));
});

router.post('/alerts/:id/ack', requireAuth, requireCap('ackAlert'), (req, res) => {
  const a = store.alerts.find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'alert not found' });
  a.acknowledged = true;
  a.acknowledgedBy = req.user.name;
  logAudit(req.user, 'alert.ack', `Acknowledged ${a.id} — ${a.title}`);
  req.app.get('io')?.emit('alert:update', a);
  res.json(a);
});

router.post('/alerts/:id/resolve', requireAuth, requireCap('resolveAlert'), (req, res) => {
  const a = store.alerts.find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'alert not found' });
  a.status = 'resolved';
  a.resolvedBy = req.user.name;
  a.resolution = req.body?.resolution || '';
  logAudit(req.user, 'alert.resolve', `Resolved ${a.id} — ${a.title}`);
  req.app.get('io')?.emit('alert:update', a);
  res.json(a);
});

export default router;
