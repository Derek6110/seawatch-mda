// Authentication & administration endpoints.
import { Router } from 'express';
import {
  register, verifyCredentials, completeLogin, hasMfa, logout, requireAuth, requireCap,
  getAudit, listUsers, ROLES, ROLE_LABELS, CAPS,
  adminCreateUser, adminUpdateUser, adminDeleteUser, adminApproveUser, adminResetMfa,
  userForToken, resolveEnrollGrant, getUserById, addCredential, bumpCredentialCounter,
} from '../auth.js';
import {
  startRegistration, finishRegistration,
  startAuthentication, finishAuthentication, ticketUserId,
} from '../webauthn.js';

const router = Router();

router.post('/auth/register', async (req, res) => {
  try {
    const result = await register(req.body || {});
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Sign-in, phase 1: password. If the account has a biometric second factor
// enrolled, we return an MFA challenge instead of a token; the client completes
// it at /auth/webauthn/login/verify. Otherwise a token is issued immediately.
router.post('/auth/login', async (req, res) => {
  try {
    const user = verifyCredentials(req.body || {});
    if (hasMfa(user)) {
      const { ticket, options } = await startAuthentication(req, user);
      return res.json({ mfaRequired: true, mfaTicket: ticket, options });
    }
    res.json(completeLogin(user));
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// Sign-in, phase 2: verify the biometric assertion, then issue the token.
router.post('/auth/webauthn/login/verify', async (req, res) => {
  try {
    const { mfaTicket, response } = req.body || {};
    if (!mfaTicket || !response) throw new Error('missing authentication response');
    const user = getUserById(ticketUserId(mfaTicket, 'login'));
    if (!user) throw new Error('account not found');
    const { credentialId, newCounter } = await finishAuthentication(req, mfaTicket, response, user);
    await bumpCredentialCounter(user.id, credentialId, newCounter);
    res.json(completeLogin(user, { mfa: true }));
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// --- Biometric enrolment ----------------------------------------------------
// The target account is resolved from EITHER a live session (self-enrolling an
// additional device) OR a post-signup enrolment grant (a pending account adding
// its first factor). Never from client-supplied identity.
function resolveEnrolTarget(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  const sessionUser = token && userForToken(token);
  if (sessionUser) return sessionUser;
  const grant = (req.body || {}).enrollGrant;
  return grant ? resolveEnrollGrant(grant) : null;
}

router.post('/auth/webauthn/register/options', async (req, res) => {
  try {
    const user = resolveEnrolTarget(req);
    if (!user) return res.status(401).json({ error: 'enrolment session not found — sign in or sign up again' });
    const { ticket, options } = await startRegistration(req, user);
    res.json({ regTicket: ticket, options });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/auth/webauthn/register/verify', async (req, res) => {
  try {
    const { regTicket, response } = req.body || {};
    if (!regTicket || !response) throw new Error('missing registration response');
    const { userId, credential } = await finishRegistration(req, regTicket, response);
    const user = await addCredential(userId, credential);
    res.status(201).json({ enrolled: true, user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/auth/logout', requireAuth, (req, res) => {
  logout(req.token);
  res.json({ ok: true });
});

router.get('/auth/me', requireAuth, (req, res) => {
  const u = req.user;
  res.json({
    user: {
      id: u.id, name: u.name, email: u.email, role: u.role, mocId: u.mocId,
      mfaEnabled: (u.credentials || []).length > 0,
    },
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

// Clear a user's biometric enrolment (lost/replaced device).
router.post('/users/:id/reset-mfa', requireAuth, requireCap('manageUsers'), async (req, res) => {
  try { res.json(await adminResetMfa(req.params.id, req.user)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/users/:id', requireAuth, requireCap('manageUsers'), async (req, res) => {
  try { res.json(await adminDeleteUser(req.params.id, req.user)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;
