// In-memory data store for the demo. Every collection is exposed behind this
// module so the persistence layer can later be replaced with PostgreSQL/PostGIS,
// SQLite, or a live AIS database without touching routes or sockets.

export const store = {
  mocs: [], // Maritime Operations Centres / commands
  operators: [], // users belonging to a MOC
  zones: [], // EEZ, territorial waters, fishing grounds, oil fields, AOIs
  vessels: new Map(), // mmsi -> vessel (mutated each simulation tick)
  alerts: [], // dark-vessel / anomaly alerts (newest first)
  incidents: [], // operator-created incident reports (shared across MOCs)
  messages: [], // collaboration chat messages, keyed by channelId
  tasks: [], // taskings: assign an asset to investigate a contact
  history: [], // rolling positional snapshots for track replay
  overlays: [], // shared tactical map drawings (measurements, shapes, markers)
};

// Append a lean positional snapshot for replay and trim to the configured size.
export function pushHistory(frame, maxFrames) {
  store.history.push(frame);
  while (store.history.length > maxFrames) store.history.shift();
}

let alertSeq = 1;
export const nextAlertId = () => `ALR-${String(alertSeq++).padStart(5, '0')}`;

let incidentSeq = 1;
export const nextIncidentId = () =>
  `INC-${new Date().getFullYear()}-${String(incidentSeq++).padStart(4, '0')}`;

let taskSeq = 1;
export const nextTaskId = () => `TSK-${String(taskSeq++).padStart(4, '0')}`;

// After restoring persisted incidents/tasks, advance the ID counters past the
// highest existing number so new IDs don't collide with restored ones.
export function syncSequences() {
  const lastNum = (arr) => Math.max(0, ...arr.map((x) => parseInt(String(x.id).split('-').pop(), 10) || 0));
  incidentSeq = lastNum(store.incidents) + 1;
  taskSeq = lastNum(store.tasks) + 1;
}

export function listVessels() {
  return Array.from(store.vessels.values());
}
