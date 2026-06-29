# SeaWatch — Ghana Navy Maritime Domain Awareness System

A SeaVision-style maritime domain awareness (MDA) platform tailored for the
**Ghana Navy** and the wider **Gulf of Guinea / Yaoundé Architecture**.

SeaWatch provides a live common operating picture of vessel traffic, automatic
**dark-vessel detection**, **role-based access** for the watch chain, **map
analysis tools**, and real-time **collaboration between Maritime Operations
Centres (MOCs)**. It runs on simulated data out of the box and can stream a real
**free AIS + satellite feed** when an API key is supplied.

> Demonstration build. Geometry (EEZ, zones, oil fields) is approximate.
> Not for operational navigation or targeting.

---

## Features

### Vessel tracking & search
- Live Gulf of Guinea map centred on Ghana, contacts updating in real time.
- Filter by type, classification, flag; search by name or MMSI.
- Per-contact detail card: track history, course/speed, sensor source, **risk score**.
- Ghana Navy own-force units (GNS pennants) shown as friendly.

### Live AIS + satellite feed
- **Real-time AIS** via [AISStream.io](https://aisstream.io) — a free global feed
  (terrestrial **and satellite** AIS) over WebSocket. Set `AISSTREAM_API_KEY`.
- Automatic **fallback to the built-in simulator** when no key is present, so the
  demo always works. The top bar shows **LIVE AIS** vs **SIMULATION**.
- **Satellite-imagery basemap** (Esri World Imagery) selectable alongside dark and
  ocean basemaps — no key required.
- **Sensor fusion**: contacts are tagged by source (AIS / coastal radar /
  satellite); non-cooperative radar & satellite contacts are drawn distinctly.

### Dark-vessel detection & risk scoring
Behavioural engine flags non-cooperative / suspicious vessels:
**AIS gaps**, **position spoofing**, **loitering**, **ship-to-ship (STS)
rendezvous**, **zone violations**. Each contact gets a **0–100 risk score**
(low/medium/high/critical) used for prioritisation and sorting.

### Map analysis tools
- **Measure** distance & bearing (multi-leg, NM + °T).
- **Range rings** (5/10/25/50 NM) around any point.
- **Draw shapes** — rectangle, circle, polygon, labelled markers — with live
  dimensions / area, plus a one-click clear.

### Track replay
Scrub or play back the last ~30 minutes of the picture with a timeline control.

### Login, roles & audit
- **Sign in / sign up** with five ranks: **Watchkeeper, Supervisor, OIC, Deputy
  Director, Director**.
- **Role-based permissions** (backend-enforced):
  | Action | Minimum role |
  |--------|--------------|
  | Acknowledge alert | Watchkeeper |
  | Report incident | Watchkeeper |
  | Resolve alert / update incident / task assets | Supervisor |
  | View audit trail | OIC |
  | User directory | Director |
- **Audit trail** of every privileged action (login, ack/resolve, incidents,
  taskings), visible to OIC and above.
- Demo accounts seeded on first run (password `seawatch`):
  `director@navy.gh`, `deputy@navy.gh`, `oic@navy.gh`, `supervisor@navy.gh`,
  `watch@navy.gh`.

### MOC collaboration
Workstation selector (NHQ MOC, Western/Eastern Naval Command, MMCC Zone F Accra,
Forward Operating Bases), real-time channels with presence, shared incident
reports, and inter-command taskings — all synced live across MOCs.

### Printable SITREP
One-click **Maritime Situation Report** (print / save as PDF) summarising the
current picture, dark contacts, open alerts and incidents.

### Zones & areas of interest
Ghana EEZ (200 NM), territorial sea, inshore artisanal fishing zone, Jubilee /
TEN / Sankofa oil-field safety zones, anchorages, and piracy / IUU AOIs.

---

## Architecture

```
trident-mda/                (project folder; product name: SeaWatch)
├── server/                 Node + Express + Socket.IO backend
│   └── src/
│       ├── index.js        entry: API + sockets + sim/live loop
│       ├── config.js       thresholds, data source, geographic focus
│       ├── auth.js         users, scrypt hashing, tokens, roles, audit
│       ├── aisstream.js    live AIS provider (AISStream.io)
│       ├── simulator.js    AIS traffic simulator (fallback / hybrid)
│       ├── detection.js    dark-vessel / anomaly detection engine
│       ├── risk.js         vessel risk scoring
│       ├── socket.js       MOC collaboration channels & presence
│       ├── seed.js         Ghana Navy MOCs, zones, vessel pools
│       ├── store.js        in-memory data layer (swap for Postgres/PostGIS)
│       └── routes/         REST endpoints (auth, vessels, alerts, …)
└── client/                 React + Vite + Tailwind + Leaflet frontend
    └── src/
        ├── store.js        Zustand state + socket wiring
        ├── api.js          REST client (token auth)
        ├── lib/            roles, colours, formatting, SITREP generator
        └── components/     login, map, map-tools, panels, replay, audit
```

**Designed to productionise:** simulator, store, auth and detection sit behind
clean module boundaries. To go live: supply an AISStream key (or replace
`aisstream.js`/`simulator.js` with your own feed), swap `store.js`/`auth.js` for a
database + real IdP, and the REST/socket/detection/UI layers stay unchanged.

---

## Running it

Requires **Node.js 18+**.

```bash
npm install              # root tool (concurrently)
npm run install:all      # server + client dependencies
npm run dev              # backend (:4000) + frontend (:5173)
```
Open **http://localhost:5173** and sign in with a demo account (or sign up).

### Enable the live AIS + satellite feed
1. Get a free API key at **https://aisstream.io**.
2. Set it before starting the server:
   ```bash
   # PowerShell
   $env:AISSTREAM_API_KEY="your_key"; $env:DATA_SOURCE="live"; npm run dev:server
   # bash
   AISSTREAM_API_KEY=your_key DATA_SOURCE=live npm run dev:server
   ```
3. The top bar switches to **LIVE AIS**. Use `DATA_SOURCE=hybrid` to combine the
   live feed with simulated own-force units.

---

## Configuration (`server/src/config.js`)

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `4000` | backend port |
| `DATA_SOURCE` | `sim` | `sim` \| `live` \| `hybrid` |
| `AISSTREAM_API_KEY` | – | free key from aisstream.io for live AIS |
| `TICK_MS` | `4000` | simulation / detection interval |
| `VESSEL_COUNT` | `90` | simulated contacts |
| `HISTORY_FRAMES` | `450` | replay buffer length (~30 min) |

---

## Roadmap to operational system
- Additional live data: terrestrial AIS receivers, coastal radar, VMS, LRIT.
- Satellite tasking (SAR / optical) to image dark contacts.
- Hardened auth (military PKI / OIDC), classification handling, full RBAC.
- Persistent database (PostgreSQL + PostGIS) and long-term historical replay.
- Pattern-of-life analytics & ML-assisted risk scoring.
- Secure sovereign deployment and inter-agency sharing across the Yaoundé Architecture.
```
