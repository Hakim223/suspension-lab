# Testing

| Layer | Tool | Location | What is covered |
|---|---|---|---|
| Content integrity | Vitest | `shared/tests/` | 5 architectures with full texts; 18 required components; every component has all info-panel fields; architectures have distinct component sets (MacPherson has no upper arm); 6 damage scenarios with valid sim kinds; scenario availability per architecture; quiz answers in range |
| API | Vitest + Supertest | `backend/tests/api.test.ts` | every endpoint, 404s, slug validation (400), DB-down → 503, health, CORS allow/deny, helmet headers, rate limiting (429), cache de-duplication, env validation |
| Database integration | Vitest + real MySQL | `backend/tests/db.integration.test.ts` | schema + seed apply cleanly; **DB → API objects equal the source JSON exactly** (suspensions, components incl. education rows/includes, scenarios); FK and unique constraints; API end-to-end from MySQL |
| Kinematics | Vitest | `frontend/src/three/models/kinematics.test.ts` | all models build with unique named parts on both sides; link/arm/tie-rod lengths constant over full travel × steering; strut axis passes through the top mount; wheel centre tracks travel; Ackermann; stabilizer twists only with unequal travel; torsion-beam twist; rigid-axle heave/roll/Panhard; exploded view restores exactly |
| Simulation | Vitest | `frontend/src/three/sim/sim.test.ts` | bump compression/rebound within limits; weak damper keeps oscillating (>5× residual energy); rough road excites sides differently; steering sweep; periodicity; tyre stays on road; damage effects only on the right side, scale with params, intensity 0 disables |
| GLB pipeline | Vitest | `frontend/src/three/rig/glbRoundtrip.test.ts` | export each procedural model to GLB → load via GLTFLoader → every part binds by name (no fallbacks) → identical world poses over several frames |
| UI | Vitest + Testing Library | `frontend/src/test/` | store logic; API → local fallback and invalid payload rejection; explorer: per-architecture component lists, switching type, full info panel, hide/show, damage from component panel, scenario availability, animation controls, steering disabled for rear axles, overview; home cards; quiz completion; 404 page |
| End-to-end | Playwright (Chromium) | `frontend/e2e/` | desktop 1440×900, tablet 820×1180 (touch), mobile Pixel 7: open app → choose suspension → model renders (canvas pixel check) → select component (list and **tap in 3D**) → info → run animation, speed, scrub, manual → exploded/labels/reset → hide/show → damage compare → switch type → all 5 render; API-down fallback; live API; no-WebGL fallback; GLB over HTTP; learn & quiz |

## Running

```bash
npm test
```

Runs shared, backend and frontend unit tests. The MySQL integration suite is **skipped** unless a
server is configured (it creates/drops a database named `suspension_lab_test`):

```bash
TEST_DB_HOST=127.0.0.1 TEST_DB_USER=root TEST_DB_PASSWORD=secret npm test -w backend
```

End-to-end (builds the app and serves it with `vite preview` on :4173):

```bash
npm run test:e2e
```

- Uses the Chromium bundled with `@playwright/test` (pinned to 1.63.0); install it once with `npx playwright install chromium` (CI: `--with-deps`).
- WebGL runs through SwiftShader (software) in headless mode, which is slow; `--workers=2` is a good default locally.
- With the API running on `E2E_API_URL` (default `http://localhost:4000`, include `http://localhost:4173` in `CORS_ORIGINS`) the "live API" test runs; otherwise it skips itself.
- Against a deployed site: `E2E_BASE_URL=https://your-site npx playwright test`.
- Only the desktop project: `npx playwright test --project=desktop`.

## Latest local results (development environment)

Environment: Ubuntu 24.04 container, 4 vCPU Xeon 2.1 GHz, Node 22.23, MySQL 8.0.46, headless Chromium (Playwright 1.63, SwiftShader WebGL).

| Suite | Result |
|---|---|
| shared | 9 passed |
| backend (incl. 6 MySQL integration) | 29 passed |
| frontend unit | 52 passed |
| e2e (desktop + tablet + mobile) | 41 passed, 1 skipped by design (3D tap test on phones, where labels are off by default) |
| e2e desktop against `dist` served with production CSP headers | 13 passed, 1 skipped (live-API test: the production CSP correctly blocks a plain-HTTP local API) |

Physical tablets/phones were not available in the development environment; the touch/tablet/mobile
results come from Chromium device emulation. See the manual checklist in `deployment.md`.
