// Authentication & administration endpoints.
import { Router } from 'express';
import {
  register, login, logout, requireAuth, requireCap,
  getAudit, listUsers, ROLES, ROLE_LABELS, CAPS,
  adminCreateUser, adminUpdateUser, adminDeleteUser, adminApproveUser,
} from '../auth.js';

const router = Router();

router.post('/auth/register', async (req, res) => {
  try {
    const result = await register(req.body || {});
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/auth/login', (req, res) => {
  try {
    res.json(login(req.body || {}));
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

router.post('/auth/logout', requireAuth, (req, res) => {
  logout(req.token);
  res.json({ ok: true });
});

router.get('/auth/me', requireAuth, (req, res) => {
  res.json({
    user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role, mocId: req.user.mocId },
  });
});

// Reference data for the signup form / client capability checks.
router.get('/auth/roles', (_req, res) => res.json({ roles: ROLES, labels: ROLE_LABELS, caps: CAPS }));

// Audit trail — restricted to OIC and above.
router.get('/audit', requireAuth, requireCap('viewAudit'), (_req, res) => {
  res.json(getAudit());
});

// --- User administration — director only -----------------------------------
router.get('/users', requireAuth, requireCap('manageUsers'), (_req, res) => {
  res.json(listUsers());
});

router.post('/users', requireAuth, requireCap('manageUsers'), async (req, res) => {
  try { res.status(201).json(await adminCreateUser(req.body || {}, req.user)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch('/users/:id', requireAuth, requireCap('manageUsers'), async (req, res) => {
  try { res.json(await adminUpdateUser(req.params.id, req.body || {}, req.user)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/users/:id/approve', requireAuth, requireCap('manageUsers'), async (req, res) => {
  try { res.json(await adminApproveUser(req.params.id, req.user)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/users/:id', requireAuth, requireCap('manageUsers'), async (req, res) => {
  try { res.json(await adminDeleteUser(req.params.id, req.user)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;
