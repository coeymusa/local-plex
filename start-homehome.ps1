# Starts the HomeHome media server (production build).
# Run this, then start the Cloudflare tunnel in another window:
#   cloudflared tunnel run homehome
#
# Usage:  pwsh -File .\start-homehome.ps1
# (Add -Build to rebuild first, after you change code.)

param([switch]$Build)

Set-Location $PSScriptRoot

if ($Build -or -not (Test-Path ".next")) {
  Write-Host "Building..." -ForegroundColor Cyan
  npm run build
}

Write-Host "Starting HomeHome on http://localhost:3000" -ForegroundColor Green
npm run start
