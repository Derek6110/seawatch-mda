// MOC collaboration: shared incident reports, channel message history, and
// inter-command taskings. Writes broadcast over the socket so every connected
// MOC sees them live.
import { Router } from 'express';
import { store, nextIncidentId, nextTaskId } from '../store.js';
import { nanoid } from 'nanoid';
import { requireAuth, requireCap, logAudit } from '../auth.js';
import { saveIncident, saveTask } from '../db.js';

const router = Router();

// --- Incidents (shared situational reports) --------------------------------
router.get('/incidents', (_req, res) => res.json(store.incidents));

// An incident is visible/interactive to: the originating MOC, anyone if shared
// with 'all', or the specific MOCs it was shared with.
function canAccessIncident(inc, user) {
  if (!inc.sharedWith || inc.sharedWith.includes('all')) return true;
  return inc.mocId === user.mocId || inc.sharedWith.includes(user.mocId);
}

router.post('/incidents', requireAuth, requireCap('createIncident'), (req, res) => {
  const { title, category, severity, lat, lon, mmsi, description, sharedWith, mocId } = req.body || {};
  if (!title || !category) return res.status(400).json({ error: 'title and category required' });
  const incident = {
    id: nextIncidentId(),
    title,
    category, // piracy | iuu-fishing | smuggling | sar | pollution | suspicious
    severity: severity || 'medium',
    status: 'open',
    lat, lon, mmsi: mmsi || null,
    description: description || '',
    reportedBy: req.user.name,
    reportedRole: req.user.role,
    mocId: mocId || req.user.mocId || null,
    // MOC ids this incident is shared with (['all'] = every command/agency).
    sharedWith: Array.isArray(sharedWith) && sharedWith.length ? sharedWith : ['all'],
    ts: Date.now(),
    updates: [],
    comments: [], // running discussion thread between the sharing institutions
    reactions: [], // {mocId, author, emoji, ts}
  };
  store.incidents.unshift(incident);
  saveIncident(incident);
  logAudit(req.user, 'incident.create', `${incident.id} — ${incident.title} (shared: ${incident.sharedWith.join(', ')})`);
  req.app.get('io')?.emit('incident:new', incident);
  res.status(201).json(incident);
});

// Add a comment to an incident's discussion thread (chat-style).
router.post('/incidents/:id/comments', requireAuth, (req, res) => {
  const inc = store.incidents.find((i) => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: 'incident not found' });
  if (!canAccessIncident(inc, req.user)) return res.status(403).json({ error: 'not shared with your institution' });
  const text = (req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text required' });
  if (!inc.comments) inc.comments = [];
  const comment = {
    id: nanoid(6), mocId: req.user.mocId, author: req.user.name,
    role: req.user.role, text, ts: Date.now(),
  };
  inc.comments.push(comment);
  saveIncident(inc);
  req.app.get('io')?.emit('incident:update', inc);
  res.status(201).json(inc);
});

// Toggle a reaction (emoji) on an incident.
router.post('/incidents/:id/reactions', requireAuth, (req, res) => {
  const inc = store.incidents.find((i) => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: 'incident not found' });
  if (!canAccessIncident(inc, req.user)) return res.status(403).json({ error: 'not shared with your institution' });
  const emoji = req.body?.emoji;
  if (!emoji) return res.status(400).json({ error: 'emoji required' });
  if (!inc.reactions) inc.reactions = [];
  const i = inc.reactions.findIndex((r) => r.author === req.user.name && r.mocId === req.user.mocId && r.emoji === emoji);
  if (i >= 0) inc.reactions.splice(i, 1);
  else inc.reactions.push({ mocId: req.user.mocId, author: req.user.name, emoji, ts: Date.now() });
  saveIncident(inc);
  req.app.get('io')?.emit('incident:update', inc);
  res.json(inc);
});

router.patch('/incidents/:id', requireAuth, requireCap('updateIncident'), (req, res) => {
  const inc = store.incidents.find((i) => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: 'incident not found' });
  const { status, note, author } = req.body || {};
  if (status) inc.status = status;
  if (note) inc.updates.push({ id: nanoid(6), note, author: author || 'operator', ts: Date.now() });
  saveIncident(inc);
  logAudit(req.user, 'incident.update', `${inc.id} — status ${inc.status}`);
  req.app.get('io')?.emit('incident:update', inc);
  res.json(inc);
});

// --- Channel message history (live send is over the socket) ----------------
router.get('/messages', (req, res) => {
  const { channelId } = req.query;
  let msgs = store.messages;
  if (channelId) msgs = msgs.filter((m) => m.channelId === channelId);
  res.json(msgs.slice(-200));
});

// --- Taskings (assign an asset to investigate) -----------------------------
router.get('/tasks', (_req, res) => res.json(store.tasks));

router.post('/tasks', requireAuth, requireCap('createTask'), (req, res) => {
  const { title, mmsi, assignedTo, assignedToName, priority, fromMoc, note } = req.body || {};
  const task = {
    id: nextTaskId(),
    title: title || 'Investigate contact',
    mmsi: mmsi || null,
    assignedTo: assignedTo || null, // moc id of tasked command
    assignedToName: assignedToName || null,
    priority: priority || 'routine', // routine | priority | immediate
    fromMoc: fromMoc || null,
    note: note || '',
    status: 'assigned', // assigned | enroute | onstation | complete
    ts: Date.now(),
  };
  store.tasks.unshift(task);
  saveTask(task);
  logAudit(req.user, 'task.create', `${task.id} — ${task.title} (${task.priority})`);
  req.app.get('io')?.emit('task:new', task);
  res.status(201).json(task);
});

router.patch('/tasks/:id', requireAuth, requireCap('updateTask'), (req, res) => {
  const t = store.tasks.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'task not found' });
  if (req.body?.status) t.status = req.body.status;
  saveTask(t);
  req.app.get('io')?.emit('task:update', t);
  res.json(t);
});

export default router;
