# Sharing SeaWatch with stakeholders

## Current shareable link (Cloudflare quick tunnel)
A clean, no-warning-page public URL that works while your PC and the tunnel are running.

- Sign-in for testers: they **Sign Up** → wait for approval → you approve them in the
  **Admin dashboard** (Users icon, top-right) while signed in as `director@navy.gh` / `seawatch`.

### Relaunch with one command
```powershell
cd C:\Users\safe\Documents\trident-mda
powershell -ExecutionPolicy Bypass -File .\share.ps1
```
This starts the backend (:4000), the frontend (:5173), and the tunnel, then prints the URL.

> The quick-tunnel URL stays the same while the tunnel process runs. It changes if the
> PC reboots or the tunnel is restarted. For a URL that NEVER changes, see below.

---

## Upgrading to a permanent, fixed URL (e.g. seawatch.navy.mil.gh)

A Cloudflare **named tunnel** gives a fixed custom address with no warning page — but it
requires the domain to be on a Cloudflare account you control. This is a Navy IT /
network-authority step. Two ways:

### Option A — the domain is on Cloudflare (cleanest)
Once `navy.mil.gh` (or any domain you control) is added to a Cloudflare account:
```powershell
cd C:\Users\safe\Documents\trident-mda
.\tools\cloudflared.exe tunnel login            # authorize the domain in the browser
.\tools\cloudflared.exe tunnel create seawatch  # creates tunnel + credentials
.\tools\cloudflared.exe tunnel route dns seawatch seawatch.navy.mil.gh
```
Create `tools\cloudflared-config.yml`:
```yaml
tunnel: seawatch
credentials-file: C:\Users\safe\.cloudflared\<TUNNEL-UUID>.json
ingress:
  - hostname: seawatch.navy.mil.gh
    service: http://localhost:5173
  - service: http_status:404
```
Run it (and install as a service to survive reboots):
```powershell
.\tools\cloudflared.exe tunnel --config .\tools\cloudflared-config.yml run seawatch
```

### Option B — domain DNS is managed elsewhere (not Cloudflare)
Navy IT adds a CNAME on their DNS:
```
seawatch.navy.mil.gh  CNAME  <TUNNEL-UUID>.cfargotunnel.com
```
(You get `<TUNNEL-UUID>` from `cloudflared tunnel create seawatch`.)

---

## For unattended testing (PC can be off): deploy instead
For stakeholders to test anytime without your machine running, deploy the build to a host
(Render / Railway / Fly.io). The client builds with `npm run build`; the backend serves the
API + sockets. Ask and this can be set up with auto-deploy on each push.
