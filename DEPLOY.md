# Deploying HomeHome to watch.example.com (Synology + Route 53)

The whole app runs on your **Synology NAS** (Intel "+" model) in Container
Manager. Synology's **built-in reverse proxy** terminates HTTPS for `watch.example.com`
and forwards to the app. **Route 53** points the domain at your home IP. No
Cloudflare, no extra services.

```
Julia → https://watch.example.com → (Route 53 → your home IP) → router :443 → Synology reverse proxy → homehome :3000 → /volume1/Videos
```

> Exposure note: this puts your home IP behind the domain and opens port 443.
> You're fine with that (one viewer). The hardening section below keeps it sane.

## What's already done ✅

- App built and hardened: password gate (`your-password`), Secure cookie over
  HTTPS, login rate-limiting, path-traversal protection.
- Docker image builds and runs (validated locally).
- Library handles your 6,431 files: server-side search + pagination, cached scan.
- Deploy files: `Dockerfile`, `docker-compose.yml`, `.env.docker.example`.

## Steps you do on the NAS / router / Route 53

### 1. Run the app container

1. Copy this folder to the Synology (e.g. `/volume1/docker/homehome`) via File
   Station.
2. Create `.env` next to `docker-compose.yml` (copy `.env.docker.example`):
   ```ini
   APP_PASSWORD=your-password
   TMDB_API_KEY=          # optional
   ```
   Confirm the `/volume1/Videos` path in `docker-compose.yml` matches your share.
3. Container Manager → **Project → Create** → point at the folder → Build + run.
   The app is now live **inside the LAN** at `http://<nas-ip>:3000`. Open it from
   another device on your network to confirm before exposing it.

### 2. Point the domain at home (Route 53) — ✅ DONE

Created via the AWS CLI: an **A record** `watch.example.com` → `YOUR_HOME_IP`
(TTL 300) in your hosted zone. Confirm it resolves on public DNS before moving on.

⚠️ **Dynamic IP:** most home connections rotate their public IP, which would
break this record. A **DDNS sidecar is included** (`ddns` service in
`docker-compose.yml`, script in `ddns/update-route53.sh`) — it checks your public
IP every 5 min and updates the A record only when it changes. Validated locally
(one-shot run reported "no change" against the live record).

To enable it:
1. In AWS IAM, create a **dedicated user** with only `ddns/iam-policy.json`
   attached (least privilege — it can touch only this one hosted zone). Generate
   an access key.
2. Put that key in the NAS `.env`:
   ```ini
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   ```
3. It starts automatically with the project (`restart: unless-stopped`). Check
   it with `docker logs homehome-ddns`.

(If you'd rather not store an AWS key on the NAS, the alternative is Synology
**Control Panel → External Access → DDNS** + a CNAME — but that needs a Synology
DDNS hostname, not a bare A record.)

### 3. Open the port (router)

On your Fritz!Box: forward external **TCP 443** → the NAS IP, port **443**.

### 4. HTTPS + reverse proxy (Synology)

1. **Control Panel → Login Portal → Advanced → Reverse Proxy → Create:**
   - Source: `https://watch.example.com:443`
   - Destination: `http://localhost:3000`
   - Enable **HSTS**, and under Custom Header use **"Create → WebSocket"** (so
     streaming/long requests pass cleanly).
2. **Control Panel → Security → Certificate:** add a **Let's Encrypt** cert for
   `watch.example.com`, then set it as the cert for the reverse-proxy entry. (Let's
   Encrypt validation needs port 443 reachable — step 3 done first.)

Visit **https://watch.example.com** → `your-password` login → your library. 🎉

## Hardening (do these — you're on the public internet now)

- **Control Panel → Security → Protection:** enable **Auto Block** (lock out IPs
  after N failed logins) and **DoS protection**.
- **Firewall:** allow 443; the app's own login rate-limiter is a second layer.
- **DSM accounts:** keep your *admin* DSM login strong + 2FA. Note the app's
  `your-password` gate is separate from DSM — DSM admin should never share it.
- Consider a longer `APP_PASSWORD` than `your-password` since it's the only thing
  in front of 6,431 files on the open internet.

## Updating later

Copy changed files to the NAS → Container Manager project → **Build** again
(or `docker compose up -d --build` over SSH).
