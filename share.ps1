# SeaWatch — one-command launch + public share link.
# Starts the backend, the frontend, and a Cloudflare tunnel, then prints the URL.
# Usage:  powershell -ExecutionPolicy Bypass -File .\share.ps1

$ErrorActionPreference = 'SilentlyContinue'
$root = $PSScriptRoot
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

function Listening($port) { [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) }

# 1. Backend (:4000)
if (-not (Listening 4000)) {
  Write-Host "Starting backend on :4000..."
  Start-Process node -ArgumentList "--env-file-if-exists=.env","src/index.js" -WorkingDirectory "$root\server" -WindowStyle Hidden
  Start-Sleep -Seconds 3
} else { Write-Host "Backend already running (:4000)" }

# 2. Frontend (:5173)
if (-not (Listening 5173)) {
  Write-Host "Starting frontend on :5173..."
  Start-Process node -ArgumentList "node_modules/vite/bin/vite.js","--host" -WorkingDirectory "$root\client" -WindowStyle Hidden
  Start-Sleep -Seconds 5
} else { Write-Host "Frontend already running (:5173)" }

# 3. Cloudflare tunnel
$cf = "$root\tools\cloudflared.exe"
$log = "$root\tools\tunnel.log"
if (Test-Path $log) { Remove-Item $log -Force }
Write-Host "Starting public tunnel..."
Start-Process $cf -ArgumentList "tunnel","--no-autoupdate","--url","http://localhost:5173" -WindowStyle Hidden -RedirectStandardError $log -RedirectStandardOutput "$root\tools\tunnel.out.log"

# 4. Wait for and print the URL
$url = $null
for ($i = 0; $i -lt 20 -and -not $url; $i++) {
  Start-Sleep -Seconds 1
  $txt = (Get-Content $log -Raw -ErrorAction SilentlyContinue)
  $m = [regex]::Match($txt, 'https://[a-z0-9-]+\.trycloudflare\.com')
  if ($m.Success) { $url = $m.Value }
}
Write-Host ""
if ($url) {
  Write-Host "==================================================================="
  Write-Host "  SeaWatch is live and shareable at:"
  Write-Host "  $url"
  Write-Host "  (sign in: director@navy.gh / seawatch)"
  Write-Host "==================================================================="
} else {
  Write-Host "Tunnel started but URL not detected yet — check tools\tunnel.log"
}
