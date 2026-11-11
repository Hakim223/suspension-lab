# Suspension Lab

A fully static, interactive 3D automotive suspension education website for customers of **Five Degrees Kaki Kaki** — in Bahasa Indonesia. Branding lives in `frontend/src/config/workshop.ts` and `frontend/public/brand/`.
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
| Stack | React 19 · Vite 8 · TypeScript · Tailwind 4 · three.js r187 · React Three Fiber 9 · drei 10 · GSAP · Lucide — static site, no backend or database |

## Repository layout

```
suspension-lab/
├── shared/                 # Single source of truth: TS types + Indonesian content JSON
│   ├── content/            #   suspensions, components, damage-scenarios, quiz, glossary
│   └── src/                #   types.ts, index.ts (typed accessors), content tests
├── frontend/               # React app
│   ├── src/three/          #   3D engine: rig builder, kinematics models, sim timeline, GLB loader
│   ├── src/components/     #   layout, viewer, component-info, simulation, ui
│   ├── src/features/       #   suspension-selector, component-explorer, damage-simulator, quiz
│   ├── src/{pages,hooks,state,data}/
│   ├── e2e/                #   Playwright tests (desktop / tablet / mobile)
│   └── scripts/glb-tools.ts#   reference-GLB export, GLB validation
├── tools/blender/          # Blender → GLB export/validation helper
├── docs/                   # architecture, deployment, asset pipeline, testing, troubleshooting, checklist
├── vercel.json · .github/workflows/ci.yml
```

## Quick start (local development)

Requirements: **Node.js ≥ 20.19 (22 recommended)** and npm 10. No database or server is needed.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. All content is bundled from `shared/content/*.json` at build time;
to change texts, edit those JSON files (the content tests check that every required field is filled).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build → `frontend/dist` (plain static files) |
| `npm run preview` | Serve the production build locally |
| `npm test` | Content integrity tests + frontend unit tests (kinematics, simulation, GLB pipeline, UI) |
| `npm run test:e2e` | Playwright end-to-end tests on desktop, tablet and mobile viewports |
| `npm run typecheck` | TypeScript across all workspaces |
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
- [3D asset pipeline & Blender → GLB guide](docs/asset-pipeline.md)
- [Testing](docs/testing.md)
- [Performance & accessibility](docs/performance.md)
- [Production deployment](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Development checklist & status](docs/CHECKLIST.md)

## Deployment status

**Live:** https://suspension-lab-kappa.vercel.app — a static site on Vercel that redeploys automatically
on every push to `main`. It can be hosted on any static host (Cloudflare Pages, Netlify, GitHub Pages, S3);
see [docs/deployment.md](docs/deployment.md).
