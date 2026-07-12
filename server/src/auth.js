// Authentication, role-based access control, and audit logging.
//
// Users are persisted to a JSON file so accounts survive restarts. Passwords are
// hashed with scrypt (no native deps). Tokens are opaque random strings held in
// memory and presented as `Authorization: Bearer <token>`.
//
// Swap this module for a real IdP (OIDC / LDAP / military PKI) in production —
// the route guards and role hierarchy stay the same.

import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import { initUserDb, loadUsers, upsertUser, removeUser, loadAudit, saveAudit } from './db.js';

// Role hierarchy (low -> high). Index used for "at least this rank" checks.
export const ROLES = ['watchkeeper', 'supervisor', 'oic', 'deputy-director', 'director'];
export const ROLE_LABELS = {
  watchkeeper: 'Watchkeeper',
  supervisor: 'Supervisor',
  oic: 'Officer in Charge (OIC)',
  'deputy-director': 'Deputy Director',
  director: 'Director',
};

// Capability matrix — minimum role required for each action.
export const CAPS = {
  ackAlert: 'watchkeeper',
  resolveAlert: 'supervisor',
  createIncident: 'watchkeeper',
  updateIncident: 'supervisor',
  createTask: 'supervisor',
  updateTask: 'supervisor',
  viewAudit: 'oic',
  manageUsers: 'director',
};

export function roleAtLeast(role, min) {
  return ROLES.indexOf(role) >= ROLES.indexOf(min);
}
export function can(role, action) {
  const min = CAPS[action];
  return min ? roleAtLeast(role, min) : false;
}

// In-memory cache for fast synchronous reads; the DB (or file) is the source of
// truth, loaded at startup and written on every change.
let users = []; // {id, name, email, mocId, role, status, passHash, createdAt}
const tokens = new Map(); // token -> userId
const audit = []; // {id, ts, userId, name, role, action, detail}

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const h = crypto.scryptSync(pw, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(h, 'hex'));
}

const publicUser = (u) => u && ({
  id: u.id, name: u.name, email: u.email, mocId: u.mocId, role: u.role,
  status: u.status || 'approved', createdAt: u.createdAt,
  mfaEnabled: (u.credentials || []).length > 0,
  mfaDevices: (u.credentials || []).map((c) => ({ label: c.label, createdAt: c.createdAt })),
});

export function hasMfa(user) {
  return !!user && (user.credentials || []).length > 0;
}
export function getUserById(id) {
  return users.find((u) => u.id === id) || null;
}

// --- public API ------------------------------------------------------------
export async function initAuth(seedMocId = 'moc-nhq') {
  const mode = await initUserDb();
  users = await loadUsers();
  // Seed one demo account per role on first run so the app is usable instantly.
  if (users.length === 0) {
    const demo = [
      ['Director Demo', 'director@navy.gh', 'director'],
      ['Deputy Director Demo', 'deputy@navy.gh', 'deputy-director'],
      ['OIC Demo', 'oic@navy.gh', 'oic'],
      ['Supervisor Demo', 'supervisor@navy.gh', 'supervisor'],
      ['Watchkeeper Demo', 'watch@navy.gh', 'watchkeeper'],
    ];
    for (const [name, email, role] of demo) {
      const u = {
        id: nanoid(8), name, email, mocId: seedMocId, role,
        status: 'approved', credentials: [],
        passHash: hashPassword('seawatch'), createdAt: Date.now(),
      };
      users.push(u);
      await upsertUser(u, users);
    }
    console.log('  Seeded demo accounts (password: "seawatch") — e.g. director@navy.gh');
  }
  // Restore the audit trail (Postgres only; in-memory otherwise).
  const pastAudit = await loadAudit();
  if (pastAudit.length) audit.push(...pastAudit);
  console.log(`  Accounts store: ${mode === 'pg' ? 'PostgreSQL (persistent)' : 'local file'} — ${users.length} users`);
}

// Public self-service signup — creates a PENDING account that an administrator
// must approve before it can sign in. Does NOT return a token.
export async function register({ name, email, password, role, mocId }) {
  if (!name || !email || !password || !role) throw new Error('name, email, password and role are required');
  if (!ROLES.includes(role)) throw new Error('invalid role');
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error('email already registered');
  const user = {
    id: nanoid(8), name, email, mocId: mocId || 'moc-nhq', role,
    status: 'pending', credentials: [],
    passHash: hashPassword(password), createdAt: Date.now(),
  };
  users.push(user);
  await upsertUser(user, users);
  logAudit(null, 'account.register', `New signup ${email} (${ROLE_LABELS[role]}) — pending approval`);
  // Issue a short-lived grant so the new (not-yet-approved) user can enrol a
  // biometric second factor immediately, before an administrator approves them.
  return {
    pending: true,
    message: 'Account created and pending administrator approval.',
    userId: user.id,
    enrollGrant: issueEnrollGrant(user.id),
  };
}

// Step 1 of sign-in: verify the password and account status. Returns the
// INTERNAL user object (never sent to the client as-is). The route decides
// whether a biometric step-up is required before issuing a token.
export function verifyCredentials({ email, password }) {
  const user = users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user || !verifyPassword(password || '', user.passHash)) throw new Error('invalid credentials');
  if (user.status === 'pending') throw new Error('Account is pending administrator approval.');
  if (user.status === 'disabled') throw new Error('Account has been disabled. Contact an administrator.');
  return user;
}

// Step 2 of sign-in: issue the session token once all required factors pass.
export function completeLogin(user, { mfa = false } = {}) {
  return issueToken(user, mfa);
}

// --- biometric credential management ---------------------------------------
// Short-lived grants that let a freshly-signed-up (pending) account enrol a
// credential without a full session. token -> { userId, exp }.
const enrollGrants = new Map();
const ENROLL_GRANT_TTL = 15 * 60 * 1000;
function issueEnrollGrant(userId) {
  const token = crypto.randomBytes(24).toString('base64url');
  enrollGrants.set(token, { userId, exp: Date.now() + ENROLL_GRANT_TTL });
  return token;
}
export function resolveEnrollGrant(token) {
  const g = enrollGrants.get(token);
  if (!g || Date.now() > g.exp) { enrollGrants.delete(token); return null; }
  return users.find((u) => u.id === g.userId) || null;
}

export async function addCredential(userId, credential) {
  const u = users.find((x) => x.id === userId);
  if (!u) throw new Error('user not found');
  u.credentials = u.credentials || [];
  u.credentials.push(credential);
  await upsertUser(u, users);
  logAudit(u, 'account.mfa.enroll', `Enrolled biometric 2FA (${credential.label || 'device'})`);
  return publicUser(u);
}

export async function bumpCredentialCounter(userId, credentialId, newCounter) {
  const u = users.find((x) => x.id === userId);
  if (!u) return;
  const c = (u.credentials || []).find((x) => x.id === credentialId);
  if (c && newCounter > (c.counter || 0)) { c.counter = newCounter; await upsertUser(u, users); }
}

// Director-only: clear a user's enrolled biometrics (e.g. lost/replaced device).
export async function adminResetMfa(id, admin) {
  const u = users.find((x) => x.id === id);
  if (!u) throw new Error('user not found');
  u.credentials = [];
  await upsertUser(u, users);
  logAudit(admin, 'admin.user.mfa.reset', `Reset biometric 2FA for ${u.email}`);
  return publicUser(u);
}

// --- administration (director) --------------------------------------------
export async function adminCreateUser({ name, email, password, role, mocId }, admin) {
  if (!name || !email || !password || !role) throw new Error('name, email, password and role are required');
  if (!ROLES.includes(role)) throw new Error('invalid role');
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error('email already registered');
  const user = {
    id: nanoid(8), name, email, mocId: mocId || 'moc-nhq', role,
    status: 'approved', credentials: [], passHash: hashPassword(password), createdAt: Date.now(),
  };
  users.push(user);
  await upsertUser(user, users);
  logAudit(admin, 'admin.user.create', `Created ${email} (${ROLE_LABELS[role]})`);
  return publicUser(user);
}

export async function adminUpdateUser(id, patch, admin) {
  const u = users.find((x) => x.id === id);
  if (!u) throw new Error('user not found');
  if (patch.name) u.name = patch.name;
  if (patch.role) { if (!ROLES.includes(patch.role)) throw new Error('invalid role'); u.role = patch.role; }
  if (patch.mocId) u.mocId = patch.mocId;
  if (patch.status) u.status = patch.status; // approved | pending | disabled
  if (patch.password) u.passHash = hashPassword(patch.password);
  await upsertUser(u, users);
  logAudit(admin, 'admin.user.update', `Updated ${u.email} → ${JSON.stringify(patch.password ? { ...patch, password: '***' } : patch)}`);
  return publicUser(u);
}

export async function adminDeleteUser(id, admin) {
  const i = users.findIndex((x) => x.id === id);
  if (i === -1) throw new Error('user not found');
  if (users[i].id === admin?.id) throw new Error('cannot delete your own account');
  const [removed] = users.splice(i, 1);
  // Invalidate any active sessions for the removed user.
  for (const [tok, uid] of tokens) if (uid === removed.id) tokens.delete(tok);
  await removeUser(removed.id, users);
  logAudit(admin, 'admin.user.delete', `Deleted ${removed.email}`);
  return { ok: true };
}

export async function adminApproveUser(id, admin) {
  return adminUpdateUser(id, { status: 'approved' }, admin);
}

function issueToken(user, mfa = false) {
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, user.id);
  logAudit(user, 'login', `${ROLE_LABELS[user.role]} signed in${mfa ? ' with biometric 2FA' : ''}`);
  return { token, user: publicUser(user) };
}

export function logout(token) {
  tokens.delete(token);
}

export function userForToken(token) {
  const id = tokens.get(token);
  return id ? users.find((u) => u.id === id) : null;
}

export function listUsers() {
  return users.map(publicUser);
}

// Express middleware. Attaches req.user (public shape) or 401s.
export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  const user = token && userForToken(token);
  if (!user) return res.status(401).json({ error: 'authentication required' });
  req.user = user;
  req.token = token;
  next();
}

// Express middleware factory enforcing a capability.
export function requireCap(action) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'authentication required' });
    if (!can(req.user.role, action)) {
      return res.status(403).json({ error: `role '${req.user.role}' not permitted to ${action}` });
    }
    next();
  };
}

// --- audit -----------------------------------------------------------------
export function logAudit(user, action, detail) {
  const entry = {
    id: nanoid(8), ts: Date.now(),
    userId: user?.id || null, name: user?.name || 'system',
    role: user?.role || 'system', action, detail: detail || '',
  };
  audit.unshift(entry);
  if (audit.length > 1000) audit.pop();
  saveAudit(entry); // persisted in Postgres mode; no-op for file mode
  return entry;
}
export function getAudit(limit = 200) {
  return audit.slice(0, limit);
}
