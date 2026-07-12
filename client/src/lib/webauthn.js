// Client-side biometric 2FA helpers (WebAuthn).
//
// Thin wrappers around @simplewebauthn/browser that drive the browser/OS
// biometric prompt (Windows Hello, Touch ID, Face ID, Android fingerprint) and
// exchange the challenge with our server. The API here is intentionally tiny:
// the store orchestrates the two-call ceremonies.

import {
  startRegistration as browserStartRegistration,
  startAuthentication as browserStartAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser';
import { api } from '../api.js';

// Is a fingerprint/face sensor usable in this browser on this device?
export async function biometricAvailable() {
  try {
    if (!browserSupportsWebAuthn()) return false;
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

// Enrol a biometric credential. `grant` is the post-signup enrolGrant; omit it
// when the user is already signed in (the session token authorises enrolment).
export async function enrolBiometric(grant) {
  const { regTicket, options } = await api.mfaRegisterOptions(grant ? { enrollGrant: grant } : {});
  let attResp;
  try {
    attResp = await browserStartRegistration({ optionsJSON: options });
  } catch (e) {
    throw normaliseWebAuthnError(e, 'enrol');
  }
  return api.mfaRegisterVerify({ regTicket, response: attResp });
}

// Complete a login step-up. `challenge` is the { mfaTicket, options } returned
// by POST /auth/login when the account has 2FA enrolled.
export async function verifyBiometric({ mfaTicket, options }) {
  let assertion;
  try {
    assertion = await browserStartAuthentication({ optionsJSON: options });
  } catch (e) {
    throw normaliseWebAuthnError(e, 'verify');
  }
  return api.mfaLoginVerify({ mfaTicket, response: assertion });
}

// Turn the browser's terse WebAuthn errors into operator-friendly messages.
function normaliseWebAuthnError(e, phase) {
  const name = e?.name || '';
  if (name === 'NotAllowedError') {
    return new Error(phase === 'enrol'
      ? 'Biometric setup was cancelled or timed out. Please try again.'
      : 'Biometric check was cancelled or timed out. Please try again.');
  }
  if (name === 'InvalidStateError') return new Error('This device is already enrolled for your account.');
  if (name === 'SecurityError') return new Error('Biometric auth requires a secure (HTTPS) connection.');
  return new Error(e?.message || 'Biometric authentication failed.');
}
