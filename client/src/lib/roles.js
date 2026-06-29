// Client mirror of the backend role hierarchy & capability matrix, used to
// show/hide and enable/disable controls. The backend still enforces these.

export const ROLES = ['watchkeeper', 'supervisor', 'oic', 'deputy-director', 'director'];

export const ROLE_LABELS = {
  watchkeeper: 'Watchkeeper',
  supervisor: 'Supervisor',
  oic: 'Officer in Charge (OIC)',
  'deputy-director': 'Deputy Director',
  director: 'Director',
};

export const ROLE_SHORT = {
  watchkeeper: 'WK',
  supervisor: 'SUP',
  oic: 'OIC',
  'deputy-director': 'DDIR',
  director: 'DIR',
};

const CAPS = {
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
