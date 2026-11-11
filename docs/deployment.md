# Production deployment

Suspension Lab is a **fully static website**: `npm run build` produces plain HTML/CSS/JS, images and
GLB files in `frontend/dist`. There is no server, API or database — all content is bundled from
`shared/content/*.json` at build time.

## Current production

| | |
|---|---|
| URL | https://suspension-lab-kappa.vercel.app |
| Host | Vercel project `suspension-lab`, linked to GitHub `Hakim223/suspension-lab` |
| Deploys | Automatically on every push to `main` (preview deployments for other branches/PRs) |
| Environment variables | None required |

`vercel.json` (repo root) defines the install/build/output commands, the SPA fallback (deep links such
as `/jelajah/macpherson` serve `index.html`), long-term caching for hashed assets, 7-day caching for
models/thumbnails/brand images, and security headers (CSP, HSTS is added by Vercel, X-Content-Type-Options,
Referrer-Policy, frame and permissions policies).

## Updating content

Edit `shared/content/*.json` (texts, components, damage scenarios, quiz, glossary) → `npm test` →
commit and push. Vercel rebuilds and publishes within a couple of minutes.

## Re-creating the deployment on Vercel

1. Vercel → **Add New → Project** → import the GitHub repository.
2. Keep **Root Directory = repository root**; no environment variables are needed. Deploy.
3. Optional custom domain: Vercel → Project → Settings → Domains → add e.g. `lab.example.co.id` and create
   the DNS record Vercel shows. HTTPS certificates are issued automatically.

## Other static hosts

Any static host works. Settings:

| Setting | Value |
|---|---|
| Install | `npm ci` |
| Build | `npm run build` |
| Output directory | `frontend/dist` |
| Node | 22 (`.nvmrc`) |
| SPA fallback | rewrite all non-file paths to `/index.html` |

- **Cloudflare Pages:** framework preset *None*, env `NODE_VERSION=22`. `frontend/public/_redirects` and
  `_headers` already provide the SPA fallback, caching and security headers.
- **Netlify:** build `npm run build`, publish `frontend/dist`; `_redirects`/`_headers` are honoured.
- **Plain web server / object storage:** upload `frontend/dist`, configure the `index.html` fallback and
  serve `.glb` as `model/gltf-binary`.

## Optional: external GLB hosting

Models are procedural by default and need no asset hosting. If you later add Blender GLBs
(see `asset-pipeline.md`), either commit them under `frontend/public/models/` or upload them to a CDN,
allow CORS `GET` from the site's origin, and set the build-time variable `VITE_MODEL_BASE_URL`
(Vercel → Settings → Environment Variables, then redeploy). The CSP allows `https:` connections for this.

## Verification after a deploy

```bash
cd frontend && E2E_BASE_URL=https://suspension-lab-kappa.vercel.app npx playwright test
```

Manual checks:

- [ ] Home page shows the Five Degrees Kaki Kaki logo and the five suspension cards.
- [ ] Each architecture renders; rotate / pinch-zoom / two-finger pan on a tablet.
- [ ] Tap a part → information panel; labels; hide/show; exploded view; reset camera.
- [ ] Play bump / rough road / steering; speed and scrubber; manual sliders.
- [ ] Damage scenario: legend "Kiri: normal / Kanan: disimulasikan rusak"; Normal/Rusak toggle.
- [ ] `/jelajah/macpherson?model=glb` loads (verifies GLB hosting and the CSP).
- [ ] Phone (portrait): bottom tabs and sheets work.

## Waiting-room kiosk setup (Android tablet)

1. Open `https://suspension-lab-kappa.vercel.app/?kiosk=1` in Chrome → menu → **Add to Home screen**.
2. Android Settings → Security → **App pinning** to lock the tablet to the app.
3. Display → longest screen timeout; keep the tablet on a charger.
4. In kiosk mode the app returns to the home page after 3 minutes without interaction.

The site works offline after it has loaded once only to the extent the browser cache allows; it does
not install a service worker. Keep the tablet on Wi-Fi.

## Rollback

Vercel keeps every deployment: Project → Deployments → pick a previous one → **Promote to Production**.
