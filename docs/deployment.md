# Production deployment

**Status: deployed.**

| | URL / setting |
|---|---|
| Website (Vercel project `suspension-lab`) | https://suspension-lab-kappa.vercel.app |
| API (Railway project `suspension-lab`, service `api`) | https://api-production-7e05.up.railway.app |
| Database | Railway MySQL 8 (template), private network only |

Both auto-deploy on every push to `main`. The Railway `api` service settings (set on the service, not in a file):
build `npm run build -w backend`, start `node backend/dist/server.js`, **pre-deploy**
`node backend/dist/scripts/dbSetup.js --ensure-schema` (creates tables if missing, then refreshes content
in one transaction), health check `/api/health`, variables `DATABASE_URL=${{MySQL.MYSQL_URL}}`,
`NODE_ENV=production`, `DB_SSL=false` (private network), `PORT=8080`, `TRUST_PROXY=1`, `RATE_LIMIT_MAX=300`,
`CORS_ORIGINS=https://suspension-lab-kappa.vercel.app,https://suspension-lab-hakim223s-projects.vercel.app`.
Vercel env: `VITE_API_URL=https://api-production-7e05.up.railway.app`.

The generic steps below remain valid for re-creating the setup or using other providers.

Recommended topology:

```
Browser (tablet / phone / desktop)
   │ HTTPS
   ├──▶ Frontend: Vercel (or Cloudflare Pages) — static SPA + /models GLB + CDN caching
   └──▶ API: Render web service (or Railway / any Docker host) — Express, HTTPS by the platform
            │ TLS
            └──▶ Managed MySQL 8 (e.g. Aiven, Railway MySQL, DigitalOcean, Cloud SQL, RDS)
```

The frontend keeps working with bundled content if the API or DB is down (badge shows "Data lokal").

## 0. Prerequisites

- Code pushed to a Git repository (GitHub/GitLab) that the hosts can access.
- Node 22 is used everywhere (`.nvmrc`). Do **not** commit `.env` files (they are git-ignored).

## 1. Database (managed MySQL 8)

1. Create a MySQL **8.0** instance in a region close to the workshop (e.g. Singapore/Jakarta).
2. Create database `suspension_lab` (utf8mb4) and an application user with privileges on it only.
   Many providers give you a `mysql://…` connection URI and require TLS.
3. Allow your workstation IP temporarily (for the one-off setup) and the API host's egress.
4. From your workstation, apply schema + content (credentials are read from the environment; nothing is written to disk):

   ```bash
   DATABASE_URL='mysql://USER:PASSWORD@HOST:PORT/suspension_lab' DB_SSL=true npm run db:setup
   ```

   Expected output ends with `Seed applied: [ { s: 5, c: 20, d: 6 } ]`.
   If your provider's CA is not publicly trusted, either add it to Node via `NODE_EXTRA_CA_CERTS=/path/ca.pem` (preferred) or set `DB_SSL_REJECT_UNAUTHORIZED=false`.

## 2. Backend API (Render — recommended)

Option A — Blueprint: Render dashboard → **New → Blueprint** → select the repo. `render.yaml`
creates `suspension-lab-api` (build `npm ci && npm run build -w backend`, start `npm run start -w backend`, health check `/api/health`).

Option B — manual Web Service with the same commands, root directory = repository root.

Set environment variables (Render → Environment; mark secrets as secret):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:PORT/suspension_lab` |
| `DB_SSL` | `true` |
| `CORS_ORIGINS` | your frontend origin(s), e.g. `https://suspension-lab.vercel.app` (comma-separated, no trailing slash) |
| `TRUST_PROXY` | `1` |
| `RATE_LIMIT_MAX` | `120` (raise if many kiosks share one public IP) |

Verify:

```bash
curl -s https://YOUR-API.onrender.com/api/health
```

Expect `{"status":"ok","db":"up",…}`. Then:

```bash
curl -s https://YOUR-API.onrender.com/api/suspensions | head -c 300
```

> Free/starter instances may sleep when idle; the first request can take ~30 s. The frontend falls back
> to bundled data after 4 s, so customers are never blocked. Use a paid always-on instance for the kiosk.

**Railway (current production):** New project → add the MySQL template → add a service from the GitHub repo. In the service settings set *Build* `npm run build -w backend`, *Start* `node backend/dist/server.js`, *Pre-deploy* `node backend/dist/scripts/dbSetup.js --ensure-schema`, *Healthcheck* `/api/health`; variables as in the table above; *Networking → Generate domain* (port 8080). No manual database seeding is needed — the pre-deploy step does it. (Railway's `railway.json` config-as-code is deprecated, so settings live on the service.)
**Docker hosts:** `docker build -f backend/Dockerfile -t suspension-lab-api .` then run with the env vars above (`-p 4000:4000`). *(The Dockerfile was written but not built in the development environment, which had no Docker daemon.)*

## 3. Frontend (Vercel — recommended)

1. Vercel → **Add New → Project** → import the repo. Keep **Root Directory = repository root** — `vercel.json` sets install/build/output (`npm ci`, `npm run build -w frontend`, `frontend/dist`), SPA rewrites, long-term caching for hashed assets and security headers (CSP etc.).
2. Environment variables (Production *and* Preview):

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://YOUR-API.onrender.com` (no trailing slash) |
   | `VITE_MODEL_BASE_URL` | *(optional)* CDN/object-storage base for GLB files, e.g. `https://cdn.example.com/suspension-lab/models` |

   `VITE_*` values are baked in at build time — **redeploy** after changing them.
3. Deploy, then add the final domain to the API's `CORS_ORIGINS` and redeploy the API.

**Cloudflare Pages alternative:** Framework preset *None*; Build command `npm ci && npm run build -w frontend`; Output `frontend/dist`; env `NODE_VERSION=22`, `VITE_API_URL=…`. `frontend/public/_redirects` and `_headers` provide the SPA fallback, caching and security headers.

### Content-Security-Policy note

The CSP allows `connect-src 'self' https:` — the API **must** be served over HTTPS (all recommended
hosts do this automatically). If you put GLB files on another origin they are covered by `https:` too.
`'wasm-unsafe-eval'` is required by the meshopt GLB decoder.

## 4. HTTPS & custom domain

Vercel, Cloudflare Pages and Render issue and renew TLS certificates automatically.
For a custom domain (e.g. `lab.namabengkel.co.id`): add it in the frontend host's *Domains* settings,
create the DNS record it asks for (CNAME to the platform), wait for the certificate, then add
`https://lab.namabengkel.co.id` to `CORS_ORIGINS`. Optionally map `api.namabengkel.co.id` to the API
service the same way.

## 5. Asset storage (optional)

Procedural models need no asset hosting. When you add Blender GLBs (see `asset-pipeline.md`):
either commit them under `frontend/public/models/` (served by Vercel's CDN with 7-day caching via
`vercel.json`) or upload to object storage/CDN (S3 + CloudFront, Cloudflare R2, etc.), enable CORS
`GET` from your frontend origin, serve `Content-Type: model/gltf-binary`, and set `VITE_MODEL_BASE_URL`.

## 6. Production verification checklist

Run after every production deploy:

```bash
curl -fsS https://YOUR-API/api/health
```

```bash
curl -fsS -o /dev/null -w "%{http_code}\n" https://YOUR-API/api/suspensions/macpherson/components
```

```bash
curl -fsS -o /dev/null -w "%{http_code}\n" -H "Origin: https://YOUR-FRONTEND" https://YOUR-API/api/suspensions
```

Run the e2e suite against production (no local server is started when `E2E_BASE_URL` is set):

```bash
cd frontend && E2E_BASE_URL=https://YOUR-FRONTEND npx playwright test
```

Manual checks:

- [ ] Home page loads; badge reads **Online**.
- [ ] Each of the 5 architectures renders; rotate / pinch-zoom / two-finger pan on a tablet.
- [ ] Tap a part → information panel; labels; hide/show; exploded view; reset camera.
- [ ] Play bump / rough road / steering; speed and scrubber; manual sliders.
- [ ] Damage scenario: legend "Kiri: normal / Kanan: disimulasikan rusak"; Normal/Rusak toggle.
- [ ] `https://YOUR-FRONTEND/jelajah/macpherson?model=glb` loads (verifies GLB hosting & CSP).
- [ ] Phone (portrait) layout: bottom tabs and sheets work.
- [ ] Stop the API temporarily → app still works with "Data lokal".

## 7. Waiting-room kiosk setup (Android tablet)

1. Open `https://YOUR-FRONTEND/?kiosk=1` in Chrome → menu → **Add to Home screen**.
2. Android Settings → Security → **App pinning** (screen pinning) to lock the tablet to Chrome.
3. Display → screen timeout: longest / keep awake while charging; keep the tablet on a charger.
4. In kiosk mode the app returns to the home page after 3 minutes without interaction.

## 8. Operations

- **Content updates:** edit `shared/content/*.json` → `npm run db:seed:generate` → commit and push. Vercel rebuilds the site; Railway's pre-deploy step reloads the content into MySQL. The API cache refreshes within 60 s.
- **Rollback:** Vercel/Render keep previous deployments — use *Promote/Rollback* in their dashboards.
- **Logs/monitoring:** Render logs show startup (`database connected` / `UNREACHABLE`) and 5xx errors; add an uptime monitor on `/api/health`.
- **Secrets:** rotate the DB password in the provider and update `DATABASE_URL` on the API host only.
