# HomeHome — your own self-hosted media server

A DIY alternative to Plex/Jellyfin. It scans a folder of video files, shows them
in a web library, and streams them to your browser. Built with Next.js 16 +
TypeScript + Tailwind. **It runs at home on a box that can see your NAS** — not on
a cloud host, because the cloud can't reach into your house to read the files.
For this setup it runs on the Synology NAS itself (Docker), with Synology's
reverse proxy + Let's Encrypt terminating HTTPS and Route 53 pointing the domain
at home (see `DEPLOY.md`).

## Roadmap

- **Phase 1 ✅ Foundation** — list files, stream MP4 with seek support, basic UI.
- **Phase 2 ✅ Metadata + polish** — TMDB posters/titles/overviews, search, resume
  ("Continue watching"), and an optional password login.
- **Phase 4 ✅ Transcoding** — ffmpeg on-the-fly (HLS) for `.mkv`/HEVC etc. The
  player auto-detects codecs and only transcodes when the browser can't direct-play.
- **Perf ✅ Large libraries** — server-side search + pagination (60/page) with a
  cached NAS scan, so 6,000+ files stay fast.
- **Phase 3 ◐ Public deploy** — Dockerized for Synology Container Manager, fronted
  by Synology reverse proxy + Let's Encrypt, with Route 53 → home IP. Image builds
  & runs; remaining steps are on the NAS/router/Route 53 (see `DEPLOY.md`).

## Optional setup (Phase 2)

Both are off by default and the app works without them — set them in `.env.local`:

- **Posters & descriptions:** get a free TMDB v3 key at
  <https://www.themoviedb.org/settings/api>, set `TMDB_API_KEY=...`, restart, then
  click **"↻ Match metadata"** on the home page. It matches filenames to TMDB and
  caches results in `.data/homehome.db` (SQLite).
- **Password protection:** set `APP_PASSWORD=...`. Every page (and the video
  streams) then requires login. Leave unset to run open on a trusted LAN.

Resume positions are saved automatically as you watch (no setup needed).

## Deploy (the real thing)

Production runs in Docker on the Synology NAS, published via Cloudflare Tunnel.
**See [`DEPLOY.md`](./DEPLOY.md)** for the full step-by-step.

## Run it locally (development)

```bash
npm install
npm run dev            # http://localhost:3000
```

Out of the box it scans the local `./media` folder (sample video included). For a
local production build: `npm run build && npm start` (or `pwsh -File ./start-homehome.ps1`).

Point it at the NAS during local dev with `.env.local` (copy from `.env.example`):

```ini
MEDIA_DIR=\\YOUR-NAS\Videos
APP_PASSWORD=change-me
# TMDB_API_KEY=...                 # optional, for posters
# QUIZ_LOLLIPOP=... QUIZ_PASTA=... QUIZ_NYC=... QUIZ_GREATNESS=10   # quiz answers
```

If the page is empty, open `\\YOUR-NAS` in Explorer to confirm the share name.

## How it works

- `lib/config.ts` — where media lives + which extensions are browser-playable.
- `lib/library.ts` — recursively scans `MEDIA_DIR`, turns each file into an item
  with an opaque id. Ids are validated against path-traversal before any read.
  with an opaque id. Ids are validated against path-traversal before any read.
  `scanLibraryCached()` caches the (slow, over-SMB) file walk for 60s.
- `lib/catalog.ts` — joins the file scan with TMDB metadata + resume progress
  (both local SQLite); `searchCatalog()` does server-side search + pagination.
- `lib/ffmpeg.ts` — `ffprobe` codec detection + on-demand HLS segment transcoding.
- `app/api/stream/[id]` — direct file stream with HTTP `Range` (`206`).
- `app/api/hls/[id]/[seg]` — playlist + per-segment ffmpeg transcode for files
  the browser can't direct-play.
- `app/api/library` — paginated/searchable JSON used by the grid.
- `proxy.ts` — password gate (Next 16 middleware) protecting every route.

## Security notes

- File ids are validated to stay inside `MEDIA_DIR` — crafted ids that try to
  escape (e.g. `../../`) are rejected with `400`.
- Optional password login (`APP_PASSWORD`) via signed httpOnly cookie, Secure
  over HTTPS, with login rate-limiting. It protects the video streams too.
- For public exposure, the Cloudflare Tunnel keeps the NAS itself unreachable
  except through Cloudflare. See `DEPLOY.md` for the remaining hardening options.
