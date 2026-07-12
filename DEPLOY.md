# Deploying SeaWatch (URL that works even when your PC is off)

The app is packaged as **one service**: the Node server serves the API, the live
WebSocket, and the built UI behind a single URL. No CORS, no proxy, no tunnel.

It's been verified locally in this single-service mode.

---

## Option A — Render (free, no credit card) ✅ recommended

1. Put this project in a Git repo and push to GitHub (see "Git" below).
2. Go to <https://render.com> → sign up (free) → **New ► Blueprint**.
3. Select your repo. Render reads `render.yaml` and provisions the service.
4. (Optional) In the service's **Environment**, set `AISSTREAM_API_KEY` to enable
   the live feed; leave it unset to run in Simulation.
5. Deploy. You get a permanent URL like **`https://seawatch.onrender.com`**.

Notes on the free plan:
- The service sleeps after ~15 min idle and cold-starts (~50s) on the next visit.

### Persistent accounts (Postgres) — recommended before circulating
Accounts persist when `DATABASE_URL` is set; otherwise they use ephemeral file
storage and self-service signups are lost on redeploy. The app auto-creates its
`users` table on first boot. Use a free **non-expiring** Postgres:

1. Create a free project at **https://neon.tech** (no card; doesn't expire).
2. Copy its connection string (looks like
   `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).
3. In your Render service → **Environment** → add `DATABASE_URL` = that string → Save.
4. Render redeploys; on boot you'll see `Accounts store: PostgreSQL (persistent)`.
   The 5 demo accounts are seeded once; from then on, signups/approvals survive
   every redeploy.

> Render's own free Postgres works too (New ► Postgres), but it expires after ~30
> days; Neon's free tier is persistent, so it's the better fit here.

## Live AIS providers

SeaWatch can ingest live AIS from either or both providers; any that are
configured feed the same picture. Switch Simulation ⇄ Live in the top bar.

**AISStream.io** (WebSocket, free tier) — set `AISSTREAM_API_KEY`.

**MarineTraffic** (polling REST API, paid subscription):

| Variable | Purpose |
|----------|---------|
| `MARINETRAFFIC_API_KEY` | Your MarineTraffic API key. A Gulf-of-Guinea area URL is built from it automatically. |
| `MARINETRAFFIC_URL` | *(recommended)* Paste the **exact** endpoint from your MarineTraffic product (e.g. "Vessel Positions in a Predefined Area"). Overrides the auto-built URL. Must return `protocol:jsono`. |
| `MARINETRAFFIC_POLL_SEC` | Poll interval in seconds (default `120`). **Match your plan's allowed call frequency** — polling faster than your plan permits can incur extra credit charges or `429` rate-limiting. |
| `MARINETRAFFIC_SPEED_TENTHS` | `true` (default) if the feed reports `SPEED` in tenths of a knot; set `false` if your product returns knots directly. |

Set these in the same place as `DATABASE_URL` (Render → Environment). With a key
set, `Live` mode shows a `marinetraffic` provider in `/api/stats`. Because the
API is paid and account-specific, confirm the field format (especially speed
units) against your first live response.

**Data Docked** (polling REST, credit-metered — https://datadocked.com):

| Variable | Purpose |
|----------|---------|
| `DATADOCKED_API_KEY` | Your Data Docked API key (sent as the `x-api-key` header). |
| `DATADOCKED_POINTS` | Query centres `"lat,lon;lat,lon"` — each polled as a ≤50 km circle. Default: one point over the Tema/Accra approach. Add more for wider coverage (**each point = one credited call per cycle**). |
| `DATADOCKED_RADIUS_KM` | Circle radius, max `50` (default 50). |
| `DATADOCKED_POLL_SEC` | Poll interval (default `300` = 5 min). **Data Docked charges credits per call**, so a long interval + few points conserves credits; the provider auto-pauses when it hits `"Not enough credits"`. |
| `DATADOCKED_SPEED_TENTHS` | `true` (default) — speed is reported in tenths of a knot. |

Verified against Ghana's waters (real vessels near Tema, Lomé, Takoradi). Aids to
navigation (MMSI starting `99`) are filtered out automatically.

## Option B — Any Docker host (Fly.io, Railway, Cloud Run)
A `Dockerfile` is included. Example (Fly.io):
```bash
fly launch --no-deploy      # generates fly.toml
fly secrets set AISSTREAM_API_KEY=your_key   # optional
fly deploy
```
The container reads `PORT` from the host automatically.

## Option C — I deploy it for you
If you create an account on a host and give me a deploy **token** (e.g. a Render
API key, a Railway token, or a Fly token), I can run the deploy from here — same
as you handed me the AISStream key.

---

## Git (first push)
This repo is already initialised and committed. To push to GitHub:
```bash
gh repo create seawatch-mda --private --source . --push      # with GitHub CLI
# — or —
git remote add origin https://github.com/<you>/seawatch-mda.git
git push -u origin main
```
`.env`, `node_modules`, `tools/`, and user data are gitignored.

---

## Local production smoke test
```bash
npm run render:build   # installs deps + builds the client
npm start              # serves everything on http://localhost:4000
```

---

## Biometric 2FA (WebAuthn / FIDO2)
SeaWatch offers a fingerprint / face second factor via the WebAuthn platform
authenticator (Windows Hello, Touch ID, Face ID, Android biometric). It needs
**no configuration and no keys** — it works out of the box on any HTTPS origin.

- **Enrolment** is offered right after signup (and the account can enrol before a
  director approves it). Once a user has enrolled, the biometric is **required**
  after the password at every sign-in.
- **HTTPS is mandatory** for WebAuthn. The Render deployment is HTTPS, so it works
  in production; `localhost` is exempt for local development.
- **Persistence:** enrolled credentials (public keys only — no biometric data ever
  reaches the server) are stored in the `users.credentials` JSONB column, added
  automatically to any existing Postgres `users` table on boot (`ADD COLUMN IF NOT
  EXISTS`). No migration step is required.
- **Device-bound by design:** a credential only signs in from the device it was
  enrolled on. If a user loses/replaces a device, a **Director** clears their
  enrolment with **Reset 2FA** in Administration → User Accounts; the user then
  re-enrols on next signup/login.
