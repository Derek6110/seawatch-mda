// Biometric second-factor authentication (WebAuthn / FIDO2).
//
// SeaWatch uses the W3C Web Authentication API for its second factor. The user's
// device (Windows Hello, Touch ID, Face ID, Android fingerprint) performs the
// fingerprint or facial check locally and returns a signed assertion — the
// biometric itself NEVER leaves the device or reaches this server. We only ever
// store a public key. This is the same standard behind bank and government MFA.
//
// Two ceremonies, each a challenge/response:
//   • Registration (enrolment)  — run once, right after signup, to bind a
//     fingerprint/face credential to the account.
//   • Authentication (login)    — run after the password check on every sign-in
//     for accounts that have a credential enrolled.
//
// Credentials are device-bound by design: a fingerprint enrolled on one machine
// only signs in from that machine. A director can reset a user's 2FA (clearing
// their credentials) if a device is lost — see adminResetMfa in auth.js.

import crypto from 'node:crypto';

// The @simplewebauthn/server library is loaded lazily on first use rather than
// at module load. A failure to load it (e.g. an ESM/runtime quirk on the host)
// then degrades only the 2FA endpoints — it can never crash the whole service
// at boot, which would take the entire app down.
let _lib = null;
async function lib() {
  if (!_lib) _lib = await import('@simplewebauthn/server');
  return _lib;
}

const RP_NAME = 'SeaWatch — Ghana Navy MDA';
const TICKET_TTL_MS = 5 * 60 * 1000; // enrolment / step-up tickets live 5 minutes

// Short-lived tickets that carry a challenge between the two HTTP calls of a
// ceremony. Keyed by an opaque random string handed to the client.
//   { userId, purpose: 'enroll' | 'login', challenge, exp }
const tickets = new Map();

function newTicket(userId, purpose, challenge) {
  const id = crypto.randomBytes(24).toString('base64url');
  tickets.set(id, { userId, purpose, challenge, exp: Date.now() + TICKET_TTL_MS });
  return id;
}
function takeTicket(id, purpose) {
  const t = tickets.get(id);
  if (!t || t.purpose !== purpose) throw new Error('invalid or expired session');
  if (Date.now() > t.exp) { tickets.delete(id); throw new Error('session expired — please try again'); }
  return t;
}

// Read the account a ticket belongs to without consuming it, so the route can
// resolve the user before running the (consuming) verification step.
export function ticketUserId(id, purpose) {
  return takeTicket(id, purpose).userId;
}
// Periodically drop expired tickets so the map cannot grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [id, t] of tickets) if (now > t.exp) tickets.delete(id);
}, TICKET_TTL_MS).unref?.();

// Derive the Relying Party ID (the registrable domain) and the expected origin
// from the request. This keeps the same build working on localhost in
// development and on the HTTPS host in production without configuration.
function rpFromRequest(req) {
  const origin = req.headers.origin
    || (req.headers.referer ? new URL(req.headers.referer).origin : null)
    || `${req.protocol}://${req.get('host')}`;
  const rpID = new URL(origin).hostname; // e.g. 'localhost' or 'seawatch.onrender.com'
  return { origin, rpID };
}

// Stored credential <-> library shape. We keep the public key as base64 text so
// it round-trips cleanly through JSON / Postgres JSONB.
const toStored = (cred, extra = {}) => ({
  id: cred.id,
  publicKey: Buffer.from(cred.publicKey).toString('base64'),
  counter: cred.counter,
  transports: cred.transports || [],
  createdAt: Date.now(),
  ...extra,
});
const toLibCredential = (s) => ({
  id: s.id,
  publicKey: new Uint8Array(Buffer.from(s.publicKey, 'base64')),
  counter: s.counter || 0,
  transports: s.transports || [],
});

// --- registration (enrolment) ----------------------------------------------
export async function startRegistration(req, user) {
  const { generateRegistrationOptions } = await lib();
  const { rpID } = rpFromRequest(req);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: 'none',
    excludeCredentials: (user.credentials || []).map((c) => ({ id: c.id, transports: c.transports })),
    authenticatorSelection: {
      // Platform authenticator = the device's own biometric sensor (fingerprint
      // reader / face camera), and userVerification 'required' forces the
      // biometric (or device PIN) rather than mere presence.
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'required',
    },
  });
  const ticket = newTicket(user.id, 'enroll', options.challenge);
  return { ticket, options };
}

export async function finishRegistration(req, ticketId, response) {
  const { verifyRegistrationResponse } = await lib();
  const { origin, rpID } = rpFromRequest(req);
  const t = takeTicket(ticketId, 'enroll');
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: t.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });
  if (!verification.verified || !verification.registrationInfo) throw new Error('biometric enrolment could not be verified');
  tickets.delete(ticketId);
  const label = friendlyLabel(response, req);
  return { userId: t.userId, credential: toStored(verification.registrationInfo.credential, { label }) };
}

// --- authentication (login step-up) ----------------------------------------
export async function startAuthentication(req, user) {
  const { generateAuthenticationOptions } = await lib();
  const { rpID } = rpFromRequest(req);
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: (user.credentials || []).map((c) => ({ id: c.id, transports: c.transports })),
    userVerification: 'required',
  });
  const ticket = newTicket(user.id, 'login', options.challenge);
  return { ticket, options };
}

// Verifies the assertion. Returns the updated counter so the caller can persist
// it (counter regression is a cloned-authenticator signal). `user` must be the
// account resolved from the ticket, not from client-supplied data.
export async function finishAuthentication(req, ticketId, response, user) {
  const { verifyAuthenticationResponse } = await lib();
  const { origin, rpID } = rpFromRequest(req);
  const t = takeTicket(ticketId, 'login');
  if (t.userId !== user.id) throw new Error('session mismatch');
  const stored = (user.credentials || []).find((c) => c.id === response.id);
  if (!stored) throw new Error('unrecognised security key for this account');
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: t.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: toLibCredential(stored),
    requireUserVerification: true,
  });
  if (!verification.verified) throw new Error('biometric verification failed');
  tickets.delete(ticketId);
  return { credentialId: stored.id, newCounter: verification.authenticationInfo.newCounter };
}

// Best-effort human label for the enrolled device, from the User-Agent.
function friendlyLabel(response, req) {
  const ua = req.headers['user-agent'] || '';
  let device = 'Security key';
  if (/Windows/i.test(ua)) device = 'Windows Hello';
  else if (/iPhone|iPad|Mac OS X|Macintosh/i.test(ua)) device = 'Touch ID / Face ID';
  else if (/Android/i.test(ua)) device = 'Android biometric';
  const authAttachment = response?.authenticatorAttachment;
  return authAttachment === 'cross-platform' ? 'External security key' : device;
}
