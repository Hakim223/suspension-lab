# Suspension Lab

Interactive 3D automotive suspension education platform for customers of **Five Degrees Kaki Kaki** — in Bahasa Indonesia. Branding lives in `frontend/src/config/workshop.ts` and `frontend/public/brand/`.
Customers can rotate and explode five suspension architectures, tap any component to learn what it
does and how it fails, watch constrained mechanical animations, and compare normal vs. damaged
components side by side.

> **Honesty notes.** The 3D models are *illustrative procedural models* (clearly labelled in the UI),
> not engineering CAD of any vehicle. Damage simulations are exaggerated visual explanations, not
> diagnostic measurements. The motion model is a simple quarter-car teaching aid, not a validated
> vehicle-dynamics simulation. See [docs/architecture.md](docs/architecture.md#modelling-honesty).

| | |
|---|---|
| Architectures | MacPherson strut · Double wishbone · Torsion beam · Multi-link · Rigid axle (4-link + Panhard) |
| Components | 20 component types (18 required + axle housing + wheel), each with function, working principle, location, failure modes, symptoms, consequences, inspection, glossary |
| Damage scenarios | Worn bushing · Ball-joint play · Weak shock · Loose stabilizer link · Worn strut mount · Worn tie-rod end |
| Viewer | Orbit/zoom/pan (mouse + touch), tap-to-select, highlight + focus mode, labels with leader lines, hide/show, exploded view, camera reset/zoom-to-part |
| Animation | Speed hump, rough road (stabilizer/beam twist), steering (rack-driven, Ackermann emerges), manual sliders; play/pause/reset/speed/scrub |
| Stack | React 19 · Vite 8 · TypeScript · Tailwind 4 · three.js r187 · React Three Fiber 9 · drei 10 · GSAP · Lucide · Express 5 · MySQL 8 |

## Repository layout

```
suspension-lab/
├── shared/                 # Single source of truth: TS types + Indonesian content JSON
│   ├── content/            #   suspensions, components, damage-scenarios, quiz, glossary
│   └── src/                #   types.ts, index.ts (typed accessors), content tests
├── backend/                # Express REST API (MySQL), validation, CORS, rate limiting
│   └── src/{config,routes,controllers,services,models,middleware}/, app.ts, server.ts
├── frontend/               # React app
│   ├── src/three/          #   3D engine: rig builder, kinematics models, sim timeline, GLB loader
│   ├── src/components/     #   layout, viewer, component-info, simulation, ui
│   ├── src/features/       #   suspension-selector, component-explorer, damage-simulator, quiz
│   ├── src/{pages,hooks,state,data}/
│   ├── e2e/                #   Playwright tests (desktop / tablet / mobile)
│   └── scripts/glb-tools.ts#   reference-GLB export, GLB validation
├── database/               # schema.sql, seed.sql (generated from shared/content)
├── scripts/                # generate-seed.ts
├── tools/blender/          # Blender → GLB export/validation helper
├── docs/                   # architecture, deployment, asset pipeline, API, testing, troubleshooting, checklist
├── vercel.json · render.yaml (Render alternative) · backend/Dockerfile · .github/workflows/ci.yml
```

## Quick start (local development)

Requirements: **Node.js ≥ 20.19 (22 recommended)**, npm 10, MySQL 8.0 (optional — the frontend works without it).

```bash
npm install
```

Frontend only (uses bundled content, no backend needed):

```bash
npm run dev
```

Open http://localhost:5173.

### With the API and MySQL

1. Create a database and user (example, adjust names/passwords):

   ```sql
   CREATE DATABASE suspension_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'suspension_lab'@'localhost' IDENTIFIED BY 'choose-a-password';
   GRANT ALL ON suspension_lab.* TO 'suspension_lab'@'localhost';
   ```

2. Configure the backend:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Edit `backend/.env` (DB credentials, `CORS_ORIGINS`).

3. Create tables and load content:

   ```bash
   npm run db:setup
   ```

4. Start the API (port 4000):

   ```bash
   npm run dev:api
   ```

5. Point the frontend at it and start it:

   ```bash
   echo "VITE_API_URL=http://localhost:4000" > frontend/.env.local
   ```

   ```bash
   npm run dev
   ```

The top-right badge shows **Online** (content from API) or **Data lokal** (bundled fallback).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `npm run dev:api` | Frontend dev server / API with auto-reload |
| `npm test` | Shared content tests, backend API tests (+ MySQL integration when `TEST_DB_HOST` is set), frontend unit tests |
| `npm run test:e2e` | Playwright end-to-end tests on desktop, tablet and mobile viewports |
| `npm run typecheck` | TypeScript across all workspaces |
| `npm run build` | Production builds of frontend (`frontend/dist`) and backend (`backend/dist`) |
| `npm run db:seed:generate` | Regenerate `database/seed.sql` from `shared/content/*.json` |
| `npm run db:setup` | Apply schema + seed to the configured DB (`-- --seed-only`, `-- --create-db`) |
| `npm run glb:expected -w frontend -- <model>` | List GLB node names a model expects |
| `npm run glb:validate -w frontend -- <file.glb> <model>` | Validate a Blender export |
| `npm run glb:export-reference -w frontend` | Export procedural models as reference GLB templates |

## Useful URLs / modes

- `/` home · `/jelajah/<id>` 3D explorer · `/belajar` basics & glossary · `/kuis` quiz
- `?kiosk=1` — waiting-room kiosk mode: after 3 min idle the app returns to the home page (persisted for the browser session; `?kiosk=0` to turn off)
- `?no3d=1` — force the non-WebGL fallback interface
- `?quality=low` — force low-quality rendering (no shadows, DPR 1)
- `?model=glb` — load models through the GLB pipeline (reference assets generated at build) to verify asset hosting

## Documentation

- [Architecture & extension guide](docs/architecture.md) — data flow, 3D engine, kinematics, how to add an architecture / component / damage scenario / GLB model
- [API reference](docs/api.md)
- [3D asset pipeline & Blender → GLB guide](docs/asset-pipeline.md)
- [Testing](docs/testing.md)
- [Performance & accessibility](docs/performance.md)
- [Production deployment](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Development checklist & status](docs/CHECKLIST.md)

## Deployment status

**Live:** https://suspension-lab-kappa.vercel.app (API: https://api-production-7e05.up.railway.app).
Vercel (frontend) and Railway (API + MySQL) redeploy automatically on every push to `main`.
Details and the verification checklist are in [docs/deployment.md](docs/deployment.md).
