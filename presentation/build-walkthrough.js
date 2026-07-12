const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, TabStopType,
  HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak,
  TableOfContents,
} = require('docx');

const NAVYTX = '12365C';
const GOLD = '946F00';
const GREEN = '0B7A3B';
const MUTED = '5C6E82';
const CODEBG = 'F2F5F9';
const CW = 9360;

const run = (text, o = {}) => new TextRun({ text, bold: o.bold, italics: o.italic, color: o.color, size: o.size, font: o.font });
const code = (text) => new TextRun({ text, font: 'Courier New', size: 18, color: '24466B' });

const P = (children, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 110, line: 274, ...(o.before ? { before: o.before } : {}) },
  alignment: o.align,
  children: [].concat(children).map((t) => (typeof t === 'string' ? new TextRun({ text: t }) : t)),
});
const B = (children) => new Paragraph({
  numbering: { reference: 'b', level: 0 }, spacing: { after: 80, line: 274 },
  children: [].concat(children).map((t) => (typeof t === 'string' ? new TextRun({ text: t }) : t)),
});
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 140 }, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 100 }, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 80 }, children: [new TextRun(t)] });
const PB = () => new Paragraph({ children: [new PageBreak()] });

// Shaded monospace block, one paragraph per line.
const CODE = (lines) => [].concat(lines).map((l, i, a) => new Paragraph({
  shading: { fill: CODEBG, type: ShadingType.CLEAR },
  spacing: { after: a.length - 1 === i ? 110 : 0, line: 240 },
  indent: { left: 220, right: 220 },
  children: [new TextRun({ text: l === '' ? ' ' : l, font: 'Courier New', size: 17, color: '1B2733' })],
}));

const bd = { style: BorderStyle.SINGLE, size: 1, color: 'C9D6E3' };
const borders = { top: bd, bottom: bd, left: bd, right: bd, insideHorizontal: bd, insideVertical: bd };
function cell(content, w, opts = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA }, borders,
    margins: { top: 60, bottom: 60, left: 100, right: 100 }, verticalAlign: VerticalAlign.CENTER,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({
      spacing: { after: 0, line: 250 },
      children: [].concat(content).map((t) => (typeof t === 'string'
        ? new TextRun({ text: t, bold: opts.bold, color: opts.color, size: opts.size || 19, font: opts.mono ? 'Courier New' : undefined })
        : t)),
    })],
  });
}
function table(widths, headers, rows, opts = {}) {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], { bold: true, color: 'FFFFFF', fill: '0A1A2E' })) }),
      ...rows.map((r, ri) => new TableRow({
        children: r.map((c, i) => cell(c, widths[i], { fill: ri % 2 ? 'F2F6FA' : 'FFFFFF', bold: i === 0 && !opts.noBoldFirst, mono: opts.monoCols?.includes(i), size: 19 })),
      })),
    ],
  });
}

const crest = fs.readFileSync('crest.png');

const children = [
  // ---------- Title ----------
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600, after: 60 }, children: [new ImageRun({ type: 'png', data: crest, transformation: { width: 92, height: 88 }, altText: { title: 'Ghana Navy', description: 'crest', name: 'crest' } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 }, children: [run('SeaWatch', { bold: true, size: 52, color: '0A1A2E' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 }, children: [run('Maritime Domain Awareness System', { size: 26, color: NAVYTX })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [run('Technical Code Walkthrough — from index to hosting', { bold: true, size: 24, color: GOLD })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [run('Every file, every layer: boot, data engines, detection, real-time sync, UI, persistence, security and deployment', { italic: true, size: 20, color: MUTED })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Prepared by GIG IT SOLUTIONS · for the Ghana Navy SeaWatch programme', { size: 18, color: MUTED })] }),
  PB(),

  // ---------- TOC ----------
  new Paragraph({ children: [run('Contents', { bold: true, size: 28, color: NAVYTX })], spacing: { after: 160 } }),
  new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-2' }),
  PB(),

  // ================= 1. OVERVIEW =================
  H1('1.  System Overview'),
  P('SeaWatch is a full-stack JavaScript application with three moving parts that share one language and one repository:'),
  B([run('client/', { bold: true }), ' — a React single-page application (built with Vite, styled with Tailwind CSS) that renders the operating picture in the browser: the Leaflet map, panels, dashboards and tools.']),
  B([run('server/', { bold: true }), ' — a Node.js service using Express (REST API) and Socket.IO (real-time push). It runs the vessel simulator and/or live AIS ingestion, the dark-vessel detection engine, risk scoring, authentication and collaboration.']),
  B([run('Deployment files', { bold: true }), ' — package.json scripts, render.yaml (Render blueprint), and a Dockerfile. In production the server also serves the built client, so the entire system is one HTTPS service.']),
  P('The data flows in a loop: every 4 seconds the server advances the vessel picture (simulated and/or live), runs detection, scores risk, records a history frame, and broadcasts a snapshot over the WebSocket. The browser store receives it and React re-renders whatever changed. User actions (acknowledge alert, share incident, draw an overlay) travel the other way over REST, are persisted, and are re-broadcast to every connected Maritime Operations Centre.'),

  H2('1.1  Repository structure'),
  table([3300, 6060], ['Path', 'Purpose'], [
    [['client/'], ['React app: src/main.jsx boot, src/App.jsx shell, src/store.js state, src/components/* UI, src/lib/* helpers']],
    [['server/src/'], ['Node service: index.js entry, engines (simulator, detection, risk), providers (aisstream, marinetraffic, datadocked), auth, db, sockets']],
    [['server/src/routes/'], ['REST endpoints grouped by domain (auth, vessels, alerts, collaboration, overlays, stats, source, reference)']],
    [['package.json (root)'], ['Orchestration scripts: dev, build, start, render:build']],
    [['render.yaml / Dockerfile'], ['One-click Render deployment blueprint; portable container image']],
    [['presentation/'], ['Build scripts for the command deck, proposal and this document (not shipped)']],
  ], { monoCols: [0] }),

  // ================= 2. SERVER =================
  PB(),
  H1('2.  The Backend (server/src)'),

  H2('2.1  index.js — the entry point'),
  P(['Everything starts here. The file builds the Express app, mounts the API under ', code('/api'), ', and — critically for hosting — serves the built React app from ', code('client/dist'), ' when it exists:']),
  ...CODE([
    "app.use('/api', api);",
    "if (fs.existsSync(clientDist)) {",
    "  app.use(express.static(clientDist));",
    "  app.get('*', (req,res,next) => {        // SPA fallback",
    "    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();",
    "    res.sendFile(path.join(clientDist, 'index.html'));",
    "  });",
    "}",
  ]),
  P('This single-service design is why one URL serves the UI, the REST API and the WebSocket with no CORS or reverse proxy. The HTTP server is then wrapped by Socket.IO, and boot proceeds in order:'),
  B([run('seedStaticData()', { bold: true }), ' loads MOCs, operators and zones into memory.']),
  B([run('await initAuth()', { bold: true }), ' connects the user store (Postgres if DATABASE_URL is set, JSON file otherwise), seeds demo accounts on first run, and restores the audit trail.']),
  B([run('loadIncidents / loadTasks / loadOverlays', { bold: true }), ' restore persisted operational records and re-sync ID counters so new IDs never collide with restored ones.']),
  B([run('initSource()', { bold: true }), ' starts the configured data source (sim / live / hybrid).']),
  P(['Finally the main loop runs every ', code('config.tickMs'), ' (4,000 ms): advance simulator → age live vessels → run detection → apply risk scores → push a replay frame → broadcast ', code('vessels:update'), ' to every client.']),

  H2('2.2  config.js — one place for every knob'),
  P('All tunables live here and every one can be overridden by an environment variable, which is how the same build runs as a local demo and a production deployment. Key groups:'),
  table([2900, 3560, 2900], ['Setting', 'Meaning', 'Env override'], [
    [['dataSource'], ['sim | live | hybrid at boot'], ['DATA_SOURCE']],
    [['bbox / liveBbox'], ['Gulf of Guinea operating box; live subscription box'], ['LIVE_BBOX, LIVE_REGION']],
    [['tickMs / vesselCount'], ['Loop interval; simulated fleet size'], ['TICK_MS, VESSEL_COUNT']],
    [['detection.goingDarkMinutes'], ['AIS silent > 2 h ⇒ GOING DARK (medium)'], ['GOING_DARK_MINUTES']],
    [['detection.goneDarkMinutes'], ['AIS silent > 3 h ⇒ GONE DARK (high)'], ['GONE_DARK_MINUTES']],
    [['detection.stsProximityNm / stsSpeedKn'], ['STS pair: < 0.3 NM apart, both < 1.2 kn'], ['STS_PROXIMITY_NM, STS_SPEED_KN']],
    [['detection.loiterSpeedKn / loiterMinutes'], ['Loitering: < 1.2 kn for > 25 min in a sensitive zone'], ['—']],
    [['aisStreamKey'], ['AISStream.io live feed key'], ['AISSTREAM_API_KEY']],
    [['marineTraffic.*'], ['MarineTraffic polling URL/interval'], ['MARINETRAFFIC_API_KEY / _URL / _POLL_SEC']],
    [['dataDocked.*'], ['Data Docked key, query centres, radius, interval'], ['DATADOCKED_API_KEY / _POINTS / _RADIUS_KM / _POLL_SEC']],
  ], { monoCols: [0, 2] }),

  H2('2.3  seed.js — the Ghana tailoring'),
  P('This file is why SeaWatch feels built for the Ghana Navy rather than generic. It defines:'),
  B([run('MOCS', { bold: true }), ' — nine commands and agencies with coordinates and collaboration channels: NHQ MOC (Accra), Western Naval Command (Sekondi), Eastern Naval Command (Tema), FOB Ezinlibo, FOB Keta, MMCC Zone F (the Yaoundé Architecture node Ghana hosts), VTMIS (Ghana Maritime Authority), MRCC, and the Fisheries Commission Monitoring Centre.']),
  B([run('ZONES', { bold: true }), ' — polygon geometry for the Ghana EEZ (~200 NM), the 12 NM territorial sea, the Inshore Exclusive (artisanal) fishing Zone, the Jubilee / TEN / Sankofa oil-field safety zones, the Tema and Takoradi anchorages, and two Areas of Interest (piracy watch, IUU hotspot). Zone kind drives both map styling and detection rules.']),
  B([run('Vessel pools', { bold: true }), ' — regional ship names, flags with correct MMSI country prefixes, and six named Ghana Navy units (GNS Yaa Asantewaa, GNS Ehwor, …) with pennant numbers that the simulator spawns as friendly forces.']),

  H2('2.4  geo.js — the mathematics'),
  P('Four dependency-free geospatial functions power everything spatial:'),
  B([code('distanceNm(a,b)'), ' — great-circle (haversine) distance in nautical miles; used by measurement, STS detection and proximity checks.']),
  B([code('project(point, course, dist)'), ' — moves a point along a bearing; the simulator uses it to advance vessels each tick.']),
  B([code('pointInPolygon(point, polygon)'), ' — ray-casting containment test; answers "is this vessel inside the EEZ / an oil-field zone / an anchorage?" for the detection engine.']),
  B([code('randomInBbox(bbox)'), ' — spawn positions for the simulated fleet.']),

  H2('2.5  store.js — the in-memory picture'),
  P(['A single exported object holds the hot state: ', code('vessels'), ' (a Map keyed by MMSI — mutated every tick, far too hot for a database), plus arrays for alerts, incidents, messages, tasks, overlays and the replay history ring buffer. ID generators (', code('ALR-00001'), ', ', code('INC-2026-0001'), ', ', code('TSK-0001'), ') live here with ', code('syncSequences()'), ' to resume numbering after a restart restores persisted records.']),

  H2('2.6  simulator.js — the training picture'),
  P('Generates and animates ~90 realistic vessels across the Gulf of Guinea: weighted ship types, regional flags/MMSIs, type-appropriate speeds, and natural course wander with edge-of-area steering. Its anomaly injectors keep a demo alive:'),
  B([code('goDark(v)'), ' — switches AIS off and backdates the last report so contacts land in both doctrine tiers (2–3 h and 3 h+).']),
  B([code('startLoiter(v)'), ' — drops speed to 0.4 kn with a backdated loiter timer.']),
  B([code('startSpoof(v)'), ' — marks the vessel to teleport implausibly, triggering the spoofing rule.']),
  B([code('startSts(a,b)'), ' — parks two vessels 0.10–0.25 NM apart, both under 1.2 kn, clear of anchorages — staging a ship-to-ship rendezvous that satisfies the tightened rule.']),
  P(['Each tick also randomly evolves the threat picture and occasionally lets a dark vessel “reappear”. ', code('ensureSimVessels()'), ' / ', code('clearSimVessels()'), ' let hybrid mode mix simulation with live feeds without disturbing live contacts.']),

  H2('2.7  detection.js — the threat engine'),
  P('The heart of the system. Every tick it clears vessel flags and evaluates five independent rules; each detection sets a flag on the vessel (drives map/panel styling) and emits a graded alert. A per-vessel/per-type cool-down (5 minutes) prevents alert spam. Current doctrine:'),
  table([2500, 4560, 2300], ['Alert', 'Trigger', 'Severity'], [
    [['GOING DARK'], ['No AIS transmission for more than 2 hours (and under 3) while at sea'], ['Medium']],
    [['GONE DARK'], ['No AIS transmission for more than 3 hours — escalates automatically'], ['High']],
    [['Position Spoofing'], ['Implausible position jumps (> 45 kn implied speed) — falsified GPS'], ['High']],
    [['Loitering'], ['Under 1.2 kn for over 25 min inside a sensitive zone (fishing/oil/EEZ/AOI)'], ['Medium → High (oil)']],
    [['Zone Violation'], ['Trawler/large vessel in the artisanal zone; any non-support vessel in an oil-field safety zone'], ['Medium → High']],
    [['Ship-to-Ship (STS)'], ['Two vessels < 0.3 NM apart, both < 1.2 kn, offshore and outside any designated anchorage'], ['High']],
  ]),
  P(['The STS scan pre-filters to slow, non-navy contacts before the pairwise distance check, keeping the O(n²) loop cheap even against a large live feed. Alerts are broadcast immediately as ', code('alert:new'), ' socket events.']),

  H2('2.8  risk.js — prioritisation'),
  P('Converts behavioural flags into a single 0–100 score per vessel so the watch sorts by what matters: spoofing +40, gone-dark +35, STS +35, zone breach +25, going-dark +20, loitering +20, plus context (unknown classification +8, flag-of-convenience +4, AIS off +10). Own-force units are pinned to zero. Bands: Low 0–19, Medium 20–44, High 45–69, Critical 70–100. The function is deliberately small so it can later be replaced by a trained model without touching anything else.'),

  H2('2.9  Live AIS providers — aisstream.js, marinetraffic.js, datadocked.js'),
  P('Three interchangeable providers write into the same vessel store, tagged with their origin, so the detection engine treats live traffic exactly like simulated traffic:'),
  B([run('aisstream.js', { bold: true }), ' — connects a WebSocket to AISStream.io (free tier), subscribes to the live bounding box, and parses Class-A and Class-B position reports plus static data. Merges only defined fields so an empty AIS field never wipes good data. ', code('ageLiveVessels()'), ' marks a live vessel dark after the going-dark threshold and evicts it only well past gone-dark, with a hard cap (1,500) against unbounded growth.']),
  B([run('marinetraffic.js', { bold: true }), ' — polls the MarineTraffic REST API on an interval, normalising their field casing, flag codes and tenths-of-a-knot speeds. The endpoint URL is configurable because MarineTraffic products are account-specific.']),
  B([run('datadocked.js', { bold: true }), ' — polls Data Docked’s vessels-by-area endpoint (x-api-key header) over one or more circle centres (≤ 50 km each) covering Tema, Lomé, Takoradi and the Jubilee/TEN fields. Filters out aids-to-navigation (MMSI 99…), and because the API is credit-metered, an “out of credits” response pauses polling for 30 minutes and then retries automatically — status is exposed for diagnosis.']),

  H2('2.10  source.js — runtime source switching'),
  P(['Holds the current mode and lets an operator flip ', run('Simulation ⇄ Live ⇄ Hybrid', { bold: true }), ' at runtime with no restart: sim stops live feeds and ensures the simulated fleet exists; live clears simulated vessels and starts every configured provider; hybrid runs both. ', code('liveAvailable()'), ' reports whether any provider has credentials, which the UI uses to enable the switch.']),

  H2('2.11  db.js — persistence layer'),
  P(['If ', code('DATABASE_URL'), ' is set (a Neon serverless PostgreSQL in production), users live in a relational table and incidents, tasks, the audit log and map overlays live in JSONB document tables (', code('id, ts, data'), ') — created automatically on first boot. Without a database it falls back to a local JSON file for accounts (development mode). The rest of the code never knows which backend is active.']),

  H2('2.12  auth.js — identity, roles and audit'),
  B([run('Passwords', { bold: true }), ' are hashed with scrypt from Node’s built-in crypto (salted, timing-safe comparison). Nothing is ever stored in plain text.']),
  B([run('Sessions', { bold: true }), ' are opaque random bearer tokens held in memory and presented as ', code('Authorization: Bearer <token>'), '.']),
  B([run('Roles', { bold: true }), ' form a hierarchy — watchkeeper → supervisor → OIC → deputy-director → director — with a capability matrix (ack alert: watchkeeper+, resolve/task: supervisor+, audit view: OIC+, user management: director). ', code('requireAuth'), ' and ', code('requireCap(action)'), ' middleware enforce it on every protected route; the client mirrors the matrix only to hide buttons.']),
  B([run('Vetted onboarding', { bold: true }), ' — self-service signup creates a PENDING account that cannot log in until a Director approves it in the admin dashboard. Directors can also create, modify, disable and delete accounts.']),
  B([run('Audit', { bold: true }), ' — every login, alert action, incident, tasking, overlay and admin action is recorded with actor, role, timestamp and detail, and persisted.']),

  H2('2.13  socket.js — the collaboration switchboard'),
  P(['Manages Socket.IO rooms as collaboration channels (National Ops, Zone F Regional, Intel, VTMIS, SAR, command nets). Clients ', code('identify'), ' with their MOC and operator, join/leave channels, and receive presence updates (who is watching), message history on join, and live chat via ', code('message:send'), ' → ', code('message:new'), '. All operational broadcasts (vessels, alerts, incidents, tasks, overlays) also travel this socket.']),

  H2('2.14  routes/ — the REST API'),
  P('Thin, domain-grouped Express routers; heavy logic stays in the engine modules. The full surface:'),
  table([3400, 1300, 4660], ['Endpoint', 'Method', 'Purpose (auth requirement)'], [
    [['/api/health'], ['GET'], ['Liveness probe']],
    [['/api/auth/register · login · logout · me · roles'], ['POST/GET'], ['Signup (pending), sign-in, session introspection']],
    [['/api/users, /api/users/:id, /:id/approve'], ['GET/POST/PATCH/DELETE'], ['Account administration (director)']],
    [['/api/audit'], ['GET'], ['Audit trail (OIC+)']],
    [['/api/mocs · operators · zones'], ['GET'], ['Reference data']],
    [['/api/vessels, /api/vessels/:mmsi, /:mmsi/track'], ['GET'], ['Snapshot, detail, track history; filterable']],
    [['/api/history'], ['GET'], ['Replay frames (~30 min ring buffer)']],
    [['/api/alerts, /:id/ack, /:id/resolve'], ['GET/POST'], ['Alert feed; acknowledge (watchkeeper+), resolve (supervisor+)']],
    [['/api/incidents, /:id, /:id/comments, /:id/reactions'], ['GET/POST/PATCH'], ['Targeted incident sharing; live discussion thread; emoji reactions (access limited to shared institutions)']],
    [['/api/tasks, /api/tasks/:id'], ['GET/POST/PATCH'], ['Asset taskings with status flow (supervisor+)']],
    [['/api/overlays, /api/overlays/:id'], ['GET/POST/PATCH/DELETE'], ['Shared tactical map drawings (any authenticated operator)']],
    [['/api/stats'], ['GET'], ['Dashboard counters, risk distribution, per-provider feed status, persistence mode']],
    [['/api/source, /api/source/mode'], ['GET/POST'], ['Read / switch sim-live-hybrid at runtime']],
  ], { monoCols: [0, 1] }),

  // ================= 3. CLIENT =================
  PB(),
  H1('3.  The Frontend (client/src)'),

  H2('3.1  Boot chain: index.html → main.jsx → App.jsx'),
  P([code('index.html'), ' is a near-empty shell with a #root div. ', code('main.jsx'), ' mounts React in StrictMode and imports Leaflet’s CSS and the Tailwind stylesheet. ', code('App.jsx'), ' is the gatekeeper and layout: it restores a saved session (', code('bootstrapAuth'), '), renders the Login screen if unauthenticated, and otherwise composes the console — TopBar, left Sidebar, the map stage (MapView + VesselDetail + Legend + ReplayBar) and the right intelligence panel with tabs (Alerts, Dark Vessels, Collaborate, Incidents, and Audit for OIC+). Each region is wrapped in an ErrorBoundary so one panel failing can never blank the whole console. Modals (AdminDashboard, IncidentThread) mount at the root when opened.']),

  H2('3.2  store.js — one Zustand store for everything'),
  P('The application state lives in a single Zustand store — no prop-drilling, no Redux ceremony. It owns four families of state and all the wiring between them:'),
  B([run('Auth', { bold: true }), ' — user, token restore, login/register/logout; ', code('can(action)'), ' mirrors the server capability matrix for UI gating.']),
  B([run('Live picture', { bold: true }), ' — vessels (array + by-MMSI index), alerts, incidents, tasks, overlays, stats, connection state.']),
  B([run('Socket wiring', { bold: true }), ' — a guarded ', code('wireSocket()'), ' registers every listener exactly once (StrictMode-safe), deduplicates inserts by id, and handles the already-connected race. Every server broadcast lands here and becomes a state update.']),
  B([run('UI state & actions', { bold: true }), ' — selected vessel, follow target, active tab, filters, basemap, replay scrubber, admin modal; async actions call the REST client then rely on the socket echo as the source of truth.']),

  H2('3.3  api.js and socket.js'),
  P([code('api.js'), ' is a thin fetch wrapper: same-origin ', code('/api'), ' paths (proxied by Vite in dev, same service in production), automatic ', code('Authorization: Bearer'), ' header from localStorage, and error unwrapping. ', code('socket.js'), ' creates the single shared Socket.IO connection, polling-first with WebSocket upgrade so it also connects behind restrictive proxies.']),

  H2('3.4  lib/ — shared helpers'),
  B([code('colors.js'), ' — classification palette (friendly blue, neutral grey, unknown gold, suspect red), alert/risk labels and colours, zone styling per kind.']),
  B([code('roles.js'), ' — the client-side mirror of the role hierarchy and capability matrix.']),
  B([code('format.js'), ' — coordinate, relative-time and clock formatting.']),
  B([code('sitrep.js'), ' — generates the printable Maritime SITREP: assembles a formatted HTML report of the current picture (summary, dark/high-risk contacts, open alerts, incidents) in a new window and invokes print, so command gets a PDF/paper product in one click.']),

  H2('3.5  Map components'),
  B([run('MapView.jsx', { bold: true }), ' — the stage. React-Leaflet MapContainer with three switchable basemaps (CARTO dark tactical, Esri satellite imagery, Esri ocean chart); zone polygons styled by kind; vessel markers as rotated SVG divIcons (diamonds for navy, arrows for AIS traffic, hollow squares for radar/satellite contacts, pulsing ring when flagged); the selected vessel’s dotted track; a pulsing gold halo (SelectedHighlight) on the selected contact; and FollowController, which zooms to at least level 9 and then pans with the target as it moves — this is what fires when Follow is pressed on an alert.']),
  B([run('MapTools.jsx', { bold: true }), ' — the drawing toolbar. Tools: select/edit, measure (multi-leg distance + bearing, double-click to finish — with de-duplication of the double-click’s own points), range rings (5/10/25/50 NM), rectangle, circle, polygon (area in NM²) and labelled markers. A six-colour palette and line-weight cycle style new drawings. Finished drawings are serialised to small geometry specs and saved as shared overlays: persisted server-side, broadcast to all MOCs, and re-rendered identically on every screen. In Select mode, clicking any drawing opens an edit popup (author/MOC shown) to recolour or delete; Undo removes the newest overlay; Clear-all asks for confirmation because it clears the shared picture.']),
  B([run('VesselDetail.jsx', { bold: true }), ' — the contact card: identity, risk badge, behavioural flags, kinematics, sensor source, last-report age, and Follow / Task / Report actions gated by role.']),
  B([run('ReplayBar.jsx', { bold: true }), ' — track replay: fetches the server’s frame ring buffer and provides play/pause/scrub; the map renders the selected frame instead of the live picture.']),
  B([run('Legend.jsx', { bold: true }), ' — classification key overlay.']),

  H2('3.6  Intelligence panels'),
  B([run('AlertsPanel.jsx', { bold: true }), ' — live threat feed with severity striping, Ack (watchkeeper+) and Resolve (supervisor+), and the Follow crosshair that selects, highlights and slews the map to the contact.']),
  B([run('DarkVesselPanel.jsx', { bold: true }), ' — six detector tiles (Going Dark, Gone Dark, Spoofing, Loitering, STS, Zone Breach) with live counts, plus flagged contacts sorted by risk score with Track and Task-Asset actions.']),
  B([run('CollaborationPanel.jsx', { bold: true }), ' — channel chips (National Ops, Zone F, Intel, VTMIS, SAR, command nets), live presence of other stations, and chat with per-MOC attribution.']),
  B([run('IncidentPanel.jsx', { bold: true }), ' — report an incident and choose which institutions to share it with (the reporter’s own MOC is excluded from the picker); the list shows only incidents shared with your institution; active taskings with status stepping.']),
  B([run('IncidentThread.jsx', { bold: true }), ' — the reactive incident room: full report header, who-it’s-shared-with chips, an emoji reaction bar (toggle on/off), and a continuous chat thread — all synced live to every institution on the share list and persisted.']),
  B([run('AuditPanel.jsx', { bold: true }), ' — the accountability trail (OIC+), colour-coded by action type.']),
  B([run('AdminDashboard.jsx', { bold: true }), ' — director-only user management modal: pending-approval queue, approve / add / change role / disable / delete, with self-protection (you cannot delete your own account).']),
  B([run('Login.jsx / Logo.jsx / TopBar.jsx / Sidebar.jsx / ErrorBoundary.jsx', { bold: true }), ' — sign-in and pending-approval signup; the Ghana Navy crest (with graceful fallback); the command bar (data-source switch, MOC selector, live stat chips, SITREP button, clock, user chip, admin and logout); search/filters/layer toggles and the contact list; and the crash isolation wrapper.']),

  // ================= 4. DATA FLOW =================
  PB(),
  H1('4.  End-to-End Data Flows'),
  H2('4.1  The picture loop (every 4 seconds)'),
  ...CODE([
    'simulator.tick() / live providers ingest    (positions advance)',
    '        ↓',
    'detection.runDetection(io)                  (flags + alert:new broadcasts)',
    '        ↓',
    'risk.applyRisk(vessels)                     (0–100 score per contact)',
    '        ↓',
    'store.pushHistory(frame)                    (replay ring buffer)',
    '        ↓',
    "io.emit('vessels:update', snapshot)         (WebSocket to every MOC)",
    '        ↓',
    'client store updates → React re-renders map, panels, stat chips',
  ]),
  H2('4.2  A collaborative action (example: incident comment)'),
  ...CODE([
    "UI submit → POST /api/incidents/:id/comments   (bearer token)",
    "  server: access check (is your MOC on the share list?)",
    "  → append comment → saveIncident() to Postgres",
    "  → io.emit('incident:update', incident)",
    "every shared MOC's store updates → thread re-renders live",
  ]),
  P('Shared overlays, taskings, alert acknowledgements and admin changes all follow this same pattern: REST write → persist → socket broadcast → all clients converge. The socket echo, not the local optimistic state, is the source of truth.'),

  H2('4.3  What lives where'),
  table([2800, 3200, 3360], ['Data', 'Store', 'Survives restart?'], [
    [['Vessel positions & tracks'], ['In-memory Map (hot, 4 s updates)'], ['No — rebuilt from feeds/sim']],
    [['Replay history'], ['In-memory ring buffer (~450 frames)'], ['No']],
    [['Alerts'], ['In-memory (recent 300–500)'], ['No — regenerated by detection']],
    [['User accounts'], ['PostgreSQL (Neon) — users table'], ['Yes']],
    [['Incidents + threads, taskings'], ['PostgreSQL JSONB documents'], ['Yes']],
    [['Audit log'], ['PostgreSQL JSONB documents'], ['Yes']],
    [['Shared map overlays'], ['PostgreSQL JSONB documents'], ['Yes']],
    [['Chat messages'], ['In-memory (recent), history on channel join'], ['No (by design, radio-net style)']],
  ]),

  // ================= 5. SECURITY =================
  H1('5.  Security Model'),
  B('Transport: HTTPS everywhere in production (Render-terminated TLS); the WebSocket rides the same origin.'),
  B('Credentials: scrypt-hashed salted passwords; opaque bearer tokens; secrets only in environment variables — the repository contains no keys (.env is gitignored).'),
  B('Authorisation: server-enforced role capability matrix on every mutating route; the client hides what you cannot do, the server refuses it regardless.'),
  B('Onboarding: signup → pending → Director approval; accounts can be disabled or deleted; deleting a user invalidates their sessions.'),
  B('Accountability: a persistent audit trail of every privileged action, visible to OIC and above.'),
  B('Data sharing: incidents are visible only to the institutions they are shared with — enforced at the API, not just the UI.'),

  // ================= 6. BUILD & HOSTING =================
  PB(),
  H1('6.  Build System & Hosting'),
  H2('6.1  Scripts (root package.json)'),
  table([3100, 6260], ['Command', 'What it does'], [
    [['npm run install:all'], ['Installs server and client dependencies']],
    [['npm run dev'], ['Runs both dev servers concurrently: API on :4000, Vite client on :5173 with hot reload and /api + socket proxying']],
    [['npm run build'], ['Vite production build of the client into client/dist']],
    [['npm start'], ['Node runs server/src/index.js — which also serves client/dist (production mode)']],
    [['npm run render:build'], ['Host build command: installs both packages (forcing dev deps so Vite exists even under NODE_ENV=production) then builds the client']],
  ], { monoCols: [0] }),
  P(['The server loads ', code('server/.env'), ' automatically in development via ', code('node --env-file-if-exists'), '; in production the same variables come from the host’s environment settings.']),

  H2('6.2  Hosting architecture (Render + Neon + GitHub)'),
  ...CODE([
    'GitHub repo (Derek6110/seawatch-mda)',
    '      │  git push → auto-deploy',
    '      ▼',
    'Render web service  “seawatch”   https://seawatch.onrender.com',
    '   • npm run render:build   (install + Vite build)',
    '   • npm start              (one Node process: UI + API + WebSocket)',
    '   • TLS, health checks, logs, env vars',
    '      │',
    '      ▼',
    'Neon serverless PostgreSQL   (DATABASE_URL)',
    '   users · incidents · tasks · audit · overlays',
  ]),
  P(['The blueprint file ', code('render.yaml'), ' encodes this as infrastructure-as-code: service type web, runtime node, plan free, the two commands above, and environment variables (NODE_VERSION, DATA_SOURCE, and secret slots for AISSTREAM_API_KEY and DATABASE_URL marked ', code('sync: false'), ' so they are entered in the dashboard, never committed). Creating the service was literally: New → Blueprint → pick the repo.']),
  P([run('The iteration loop: ', { bold: true }), 'every ', code('git push'), ' to main triggers Render to rebuild and redeploy automatically — stakeholders keep one URL while the system evolves underneath them.']),

  H2('6.3  Environment variable reference (production)'),
  table([3300, 6060], ['Variable', 'Purpose'], [
    [['DATABASE_URL'], ['Neon Postgres connection string — switches persistence from ephemeral file to durable database']],
    [['DATA_SOURCE'], ['Boot mode: sim | live | hybrid (recommend hybrid so redeploys keep live feeds on)']],
    [['AISSTREAM_API_KEY'], ['AISStream.io live AIS (free)']],
    [['DATADOCKED_API_KEY / _POINTS / _RADIUS_KM / _POLL_SEC'], ['Data Docked live AIS: key, query centres (lat,lon;lat,lon), circle radius ≤ 50 km, poll interval (credit-metered)']],
    [['MARINETRAFFIC_API_KEY / _URL / _POLL_SEC'], ['MarineTraffic live AIS (endpoint is account-specific)']],
    [['GOING_DARK_MINUTES / GONE_DARK_MINUTES'], ['Dark-vessel doctrine tiers (defaults 120 / 180)']],
    [['STS_PROXIMITY_NM / STS_SPEED_KN'], ['STS rule (defaults 0.3 / 1.2)']],
    [['LIVE_BBOX / LIVE_REGION'], ['Live subscription area override (defaults to the Gulf of Guinea)']],
    [['VESSEL_COUNT / TICK_MS / HISTORY_FRAMES / PORT'], ['Fleet size, loop interval, replay depth, listen port']],
  ], { monoCols: [0] }),

  H2('6.4  The Dockerfile (portability)'),
  P(['For any container host (Fly.io, Railway, Cloud Run, or a Navy on-premise/sovereign environment) a two-stage Dockerfile builds the client and ships a slim Node 20 image that runs the same single service; the container honours the host’s ', code('PORT'), '. This is the path to a sovereign deployment: same image, Ghana-controlled infrastructure.']),

  H2('6.5  Running it'),
  ...CODE([
    '# local development',
    'npm run install:all',
    'npm run dev            # client http://localhost:5173, API :4000',
    '',
    '# production smoke test (exactly what Render runs)',
    'npm run render:build && npm start   # everything on http://localhost:4000',
  ]),
  P([run('Live system: ', { bold: true }), code('https://seawatch.onrender.com'), '  ·  demo accounts use the password ', code('seawatch'), ' (director@navy.gh is disabled in production; the private Director account administers the system). Repository: ', code('github.com/Derek6110/seawatch-mda'), '.']),

  new Paragraph({ spacing: { before: 260 }, alignment: AlignmentType.CENTER, children: [run('— end of walkthrough —', { italic: true, color: MUTED })] }),
];

const doc = new Document({
  creator: 'GIG IT SOLUTIONS',
  title: 'SeaWatch — Technical Code Walkthrough',
  styles: {
    default: { document: { run: { font: 'Arial', size: 21, color: '1B2733' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, font: 'Arial', color: NAVYTX }, paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: NAVYTX }, paragraph: { spacing: { before: 220, after: 100 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: 'Arial', color: GOLD }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 440, hanging: 250 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1296, right: 1440, bottom: 1296, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: 9360 }], spacing: { after: 0 },
      children: [run('SeaWatch — Ghana Navy MDA', { color: MUTED, size: 16 }), run('\tTechnical Code Walkthrough', { color: MUTED, size: 16 })],
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: 9360 }], spacing: { before: 0 },
      children: [run('GIG IT SOLUTIONS · SeaWatch technical documentation', { color: MUTED, size: 15 }), new TextRun({ children: ['\tPage ', PageNumber.CURRENT], color: MUTED, size: 16 })],
    })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync('SeaWatch-Code-Walkthrough.docx', buf); console.log('WROTE SeaWatch-Code-Walkthrough.docx (' + buf.length + ' bytes)'); });
