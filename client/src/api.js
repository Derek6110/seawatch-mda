// Thin REST client. Same-origin paths are proxied to the backend by Vite in
// dev and served behind the same host in production. The auth token (if any) is
// attached automatically.

const BASE = '/api';

let authToken = localStorage.getItem('seawatch_token') || null;
export function setToken(t) {
  authToken = t;
  if (t) localStorage.setItem('seawatch_token', t);
  else localStorage.removeItem('seawatch_token');
}
export function getToken() {
  return authToken;
}

async function req(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try { const j = await res.json(); if (j.error) detail = j.error; } catch { /* noop */ }
    throw new Error(detail);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  // auth
  register: (body) => req('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => req('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => req('/auth/logout', { method: 'POST' }),
  me: () => req('/auth/me'),
  roles: () => req('/auth/roles'),
  audit: () => req('/audit'),
  users: () => req('/users'),
  createUser: (body) => req('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => req(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  approveUser: (id) => req(`/users/${id}/approve`, { method: 'POST', body: '{}' }),
  deleteUser: (id) => req(`/users/${id}`, { method: 'DELETE' }),
  setSourceMode: (mode) => req('/source/mode', { method: 'POST', body: JSON.stringify({ mode }) }),

  // reference + picture
  mocs: () => req('/mocs'),
  operators: () => req('/operators'),
  zones: () => req('/zones'),
  vessels: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/vessels${q ? `?${q}` : ''}`);
  },
  vessel: (mmsi) => req(`/vessels/${mmsi}`),
  history: () => req('/history'),
  alerts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/alerts${q ? `?${q}` : ''}`);
  },
  ackAlert: (id) => req(`/alerts/${id}/ack`, { method: 'POST', body: '{}' }),
  resolveAlert: (id, body) => req(`/alerts/${id}/resolve`, { method: 'POST', body: JSON.stringify(body) }),
  incidents: () => req('/incidents'),
  createIncident: (body) => req('/incidents', { method: 'POST', body: JSON.stringify(body) }),
  updateIncident: (id, body) => req(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  commentIncident: (id, text) => req(`/incidents/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  reactIncident: (id, emoji) => req(`/incidents/${id}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) }),
  tasks: () => req('/tasks'),
  createTask: (body) => req('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id, body) => req(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  stats: () => req('/stats'),
};
