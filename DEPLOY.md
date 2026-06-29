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
