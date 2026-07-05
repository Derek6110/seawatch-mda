import { create } from 'zustand';
import { api, setToken, getToken } from './api.js';
import { socket } from './socket.js';
import { can as canDo } from './lib/roles.js';

// Global application state: authentication, the live operating picture,
// collaboration, track replay, and all socket event wiring.

export const useStore = create((set, get) => ({
  // --- auth ---
  user: null, // { id, name, email, role, mocId }
  authChecked: false, // have we attempted token restore yet
  authError: null,
  signupMessage: null, // shown after a successful pending-approval signup
  users: [], // admin: full user directory

  // --- reference / identity ---
  mocs: [],
  operators: [],
  zones: [],
  currentMoc: null, // the MOC this workstation represents
  currentOperator: null,

  // --- live picture ---
  vessels: [],
  vesselsByMmsi: {},
  alerts: [],
  incidents: [],
  tasks: [],
  stats: null,
  audit: [],
  source: { mode: 'sim', live: false },
  connected: false,
  lastUpdate: null,

  // --- collaboration ---
  activeChannel: 'ops-national',
  messages: {},
  presence: {},
  overlays: [], // shared tactical map drawings, synced across MOCs

  // --- ui ---
  selectedMmsi: null,
  rightTab: 'alerts',
  filters: { type: '', classification: '', flag: '', q: '', darkOnly: false },
  zoneVisibility: { eez: true, territorial: true, fishing: true, oil: true, anchorage: false, aoi: true },
  followMmsi: null,
  basemap: 'dark', // dark | satellite | ocean
  adminOpen: false,
  selectedIncidentId: null, // open incident discussion thread

  // --- replay ---
  replayMode: false,
  replayFrames: [],
  replayIndex: 0,
  replayPlaying: false,

  can(action) {
    const role = get().user?.role;
    return role ? canDo(role, action) : false;
  },

  // --- auth flow -------------------------------------------------------------
  async bootstrapAuth() {
    const token = getToken();
    if (token) {
      try {
        const { user } = await api.me();
        set({ user });
        await get().init();
      } catch {
        setToken(null);
      }
    }
    set({ authChecked: true });
  },

  async login(email, password) {
    set({ authError: null });
    try {
      const { token, user } = await api.login({ email, password });
      setToken(token);
      set({ user });
      await get().init();
    } catch (e) {
      set({ authError: e.message });
      throw e;
    }
  },

  // Self-service signup creates a PENDING account — no token, no auto-login.
  async register(body) {
    set({ authError: null, signupMessage: null });
    try {
      const res = await api.register(body);
      set({ signupMessage: res.message || 'Account created and pending administrator approval.' });
      return res;
    } catch (e) {
      set({ authError: e.message });
      throw e;
    }
  },
  clearSignupMessage() { set({ signupMessage: null }); },

  async logout() {
    try { await api.logout(); } catch { /* noop */ }
    setToken(null);
    set({ user: null });
    window.location.reload();
  },

  // --- data bootstrap --------------------------------------------------------
  async init() {
    const [mocs, operators, zones, vessels, alerts, incidents, tasks, stats, overlays] =
      await Promise.all([
        api.mocs(), api.operators(), api.zones(), api.vessels(),
        api.alerts(), api.incidents(), api.tasks(), api.stats(),
        api.overlays().catch(() => []),
      ]);
    const byMmsi = {};
    vessels.forEach((v) => (byMmsi[v.mmsi] = v));
    const user = get().user;
    const currentMoc = mocs.find((m) => m.id === user?.mocId) || mocs[0];
    set({
      mocs, operators, zones, vessels, vesselsByMmsi: byMmsi,
      alerts, incidents, tasks, stats, overlays,
      source: stats?.source || { mode: 'sim', live: false },
      currentMoc,
      currentOperator: { name: user?.name || 'Operator', role: user?.role },
    });
    if (get().can('viewAudit')) get().refreshAudit();
    get().wireSocket();
  },

  _wired: false,
  wireSocket() {
    if (get()._wired) return;
    set({ _wired: true });

    const onConnect = () => {
      set({ connected: true });
      const { currentMoc, currentOperator, activeChannel } = get();
      socket.emit('identify', { mocId: currentMoc?.id, operator: currentOperator?.name });
      socket.emit('channel:join', activeChannel);
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', () => set({ connected: false }));
    if (socket.connected) onConnect();

    socket.on('vessels:update', ({ vessels, ts, source }) => {
      const byMmsi = {};
      vessels.forEach((v) => (byMmsi[v.mmsi] = v));
      set({ vessels, vesselsByMmsi: byMmsi, lastUpdate: ts, ...(source ? { source } : {}) });
      get().refreshStats();
    });

    socket.on('alert:new', (alert) =>
      set((s) => (s.alerts.some((a) => a.id === alert.id) ? {} : { alerts: [alert, ...s.alerts].slice(0, 300) })));
    socket.on('alert:update', (alert) =>
      set((s) => ({ alerts: s.alerts.map((a) => (a.id === alert.id ? alert : a)) })));

    socket.on('incident:new', (inc) =>
      set((s) => (s.incidents.some((i) => i.id === inc.id) ? {} : { incidents: [inc, ...s.incidents] })));
    socket.on('incident:update', (inc) =>
      set((s) => ({ incidents: s.incidents.map((i) => (i.id === inc.id ? inc : i)) })));

    socket.on('task:new', (t) =>
      set((s) => (s.tasks.some((x) => x.id === t.id) ? {} : { tasks: [t, ...s.tasks] })));
    socket.on('task:update', (t) =>
      set((s) => ({ tasks: s.tasks.map((x) => (x.id === t.id ? t : x)) })));

    socket.on('channel:history', ({ channelId, messages }) =>
      set((s) => ({ messages: { ...s.messages, [channelId]: messages } })));
    socket.on('message:new', (msg) =>
      set((s) => ({ messages: { ...s.messages, [msg.channelId]: [...(s.messages[msg.channelId] || []), msg] } })));
    socket.on('presence:update', ({ channelId, members }) =>
      set((s) => ({ presence: { ...s.presence, [channelId]: members } })));

    socket.on('overlay:new', (o) =>
      set((s) => (s.overlays.some((x) => x.id === o.id) ? {} : { overlays: [...s.overlays, o] })));
    socket.on('overlay:update', (o) =>
      set((s) => ({ overlays: s.overlays.map((x) => (x.id === o.id ? o : x)) })));
    socket.on('overlay:delete', ({ id }) =>
      set((s) => ({ overlays: s.overlays.filter((x) => x.id !== id) })));
  },

  async refreshStats() {
    try { set({ stats: await api.stats() }); } catch { /* ignore */ }
  },
  async refreshAudit() {
    try { set({ audit: await api.audit() }); } catch { /* ignore */ }
  },

  setMoc(mocId) {
    const moc = get().mocs.find((m) => m.id === mocId);
    set({ currentMoc: moc });
    socket.emit('identify', { mocId, operator: get().currentOperator?.name });
    get().joinChannel(moc?.channels?.[0] || 'ops-national');
  },

  joinChannel(channelId) {
    const prev = get().activeChannel;
    if (prev && prev !== channelId) socket.emit('channel:leave', prev);
    socket.emit('channel:join', channelId);
    set({ activeChannel: channelId });
  },

  sendMessage(text) {
    const { activeChannel, currentOperator, currentMoc } = get();
    if (!text.trim()) return;
    socket.emit('message:send', {
      channelId: activeChannel, author: currentOperator?.name, mocId: currentMoc?.id, text: text.trim(),
    });
  },

  // --- ui setters ------------------------------------------------------------
  selectVessel(mmsi) { set({ selectedMmsi: mmsi }); },
  setRightTab(tab) { set({ rightTab: tab }); },
  setFilter(patch) { set((s) => ({ filters: { ...s.filters, ...patch } })); },
  toggleZone(kind) { set((s) => ({ zoneVisibility: { ...s.zoneVisibility, [kind]: !s.zoneVisibility[kind] } })); },
  setFollow(mmsi) { set((s) => ({ followMmsi: s.followMmsi === mmsi ? null : mmsi })); },
  setBasemap(b) { set({ basemap: b }); },
  setAdminOpen(v) { set({ adminOpen: v }); if (v) get().loadUsers(); },

  // --- replay ----------------------------------------------------------------
  async enterReplay() {
    try {
      const frames = await api.history();
      set({ replayFrames: frames, replayIndex: Math.max(0, frames.length - 1), replayMode: true, replayPlaying: false });
    } catch { /* ignore */ }
  },
  exitReplay() { set({ replayMode: false, replayPlaying: false }); },
  setReplayIndex(i) {
    const n = get().replayFrames.length;
    set({ replayIndex: Math.max(0, Math.min(n - 1, i)) });
  },
  toggleReplayPlay() { set((s) => ({ replayPlaying: !s.replayPlaying })); },

  // Vessels to render: replay frame when scrubbing, otherwise the live picture.
  displayVessels() {
    const s = get();
    if (s.replayMode && s.replayFrames.length) {
      return s.replayFrames[s.replayIndex]?.vessels || [];
    }
    return s.vessels;
  },

  // --- data source switch (Simulation / Live / Hybrid) -----------------------
  async setSourceMode(mode) {
    await api.setSourceMode(mode);
    await get().refreshStats();
  },

  // --- admin: user management ------------------------------------------------
  async loadUsers() {
    try { set({ users: await api.users() }); } catch { /* ignore */ }
  },
  async adminApproveUser(id) { await api.approveUser(id); get().loadUsers(); get().refreshAudit(); },
  async adminUpdateUser(id, patch) { await api.updateUser(id, patch); get().loadUsers(); get().refreshAudit(); },
  async adminDeleteUser(id) { await api.deleteUser(id); get().loadUsers(); get().refreshAudit(); },
  async adminCreateUser(body) { await api.createUser(body); get().loadUsers(); get().refreshAudit(); },

  // --- privileged actions (backend enforces; we also gate UI) ----------------
  async ackAlert(id) { await api.ackAlert(id); get().refreshAudit(); },
  async resolveAlert(id) { await api.resolveAlert(id, { resolution: 'Investigated' }); get().refreshAudit(); },
  async createIncident(body) {
    const { currentMoc } = get();
    await api.createIncident({ ...body, mocId: currentMoc?.id });
    get().refreshAudit();
  },
  selectIncident(id) { set({ selectedIncidentId: id }); },
  async commentIncident(id, text) {
    if (!text.trim()) return;
    const inc = await api.commentIncident(id, text.trim());
    set((s) => ({ incidents: s.incidents.map((i) => (i.id === inc.id ? inc : i)) }));
  },
  async reactIncident(id, emoji) {
    const inc = await api.reactIncident(id, emoji);
    set((s) => ({ incidents: s.incidents.map((i) => (i.id === inc.id ? inc : i)) }));
  },
  // Collaborator institutions = all MOCs except the account holder's own MOC.
  collaborators() {
    const { mocs, currentMoc } = get();
    return mocs.filter((m) => m.id !== currentMoc?.id);
  },

  // --- shared tactical overlays (map drawings) --------------------------------
  // Server broadcast (overlay:*) is the source of truth; these fire-and-forget.
  async createOverlay(spec) {
    try { await api.createOverlay(spec); } catch (e) { console.error('overlay save failed:', e.message); }
  },
  async updateOverlay(id, patch) {
    try { await api.updateOverlay(id, patch); } catch { /* ignore */ }
  },
  async deleteOverlay(id) {
    try { await api.deleteOverlay(id); } catch { /* ignore */ }
  },
  async createTask(body) {
    const { currentMoc } = get();
    await api.createTask({ ...body, fromMoc: currentMoc?.id });
    get().refreshAudit();
  },
}));
