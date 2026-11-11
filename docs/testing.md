# Testing

| Layer | Tool | Location | What is covered |
|---|---|---|---|
| Content integrity | Vitest | `shared/tests/` | 5 architectures with full texts; 18 required components; every component has all info-panel fields; architectures have distinct component sets (MacPherson has no upper arm); 6 damage scenarios with valid sim kinds; scenario availability per architecture; quiz answers in range |
| Kinematics | Vitest | `frontend/src/three/models/kinematics.test.ts` | all models build with unique named parts on both sides; link/arm/tie-rod lengths constant over full travel × steering; strut axis passes through the top mount; wheel centre tracks travel; Ackermann; stabilizer twists only with unequal travel; torsion-beam twist; rigid-axle heave/roll/Panhard; exploded view restores exactly |
| Simulation | Vitest | `frontend/src/three/sim/sim.test.ts` | bump compression/rebound within limits; weak damper keeps oscillating (>5× residual energy); rough road excites sides differently; steering sweep; periodicity; tyre stays on road; damage effects only on the right side, scale with params, intensity 0 disables |
| GLB pipeline | Vitest | `frontend/src/three/rig/glbRoundtrip.test.ts` | export each procedural model to GLB → load via GLTFLoader → every part binds by name (no fallbacks) → identical world poses over several frames |
| Mechanic data & models | Vitest | `frontend/src/mechanic/mechanic.test.ts` | 5 architecture-specific hierarchies; every referenced component exists with subcomponents & failures; 3D references exist in the rendered models; required subcomponents; every failure has all six explanations; required specific mechanisms (tie-rod end, strut mount, bushing, shock); steering systems/parts/EPS domains; effort model (assist reduces effort, failures increase it, pump wear at idle, EPS offset pull, seizure prevents return, dead-band); anatomy catalog/parts/failures; diagnostic cases cover all categories with valid references |
| UI | Vitest + Testing Library | `frontend/src/test/` | store logic; explorer: per-architecture component lists, switching type, full info panel, hide/show, damage from component panel, scenario availability, animation controls, steering disabled for rear axles, overview; home cards; quiz completion; 404 page |
| End-to-end | Playwright (Chromium) | `frontend/e2e/` | desktop 1440×900, tablet 820×1180 (touch), mobile Pixel 7: open app → choose suspension → model renders (canvas pixel check) → select component (list and **tap in 3D**) → info → animation, speed, scrub, manual → exploded/labels/reset → hide/show → damage compare → switch type → all 5 render; **fully static (no API/third-party requests except fonts)**; no-WebGL fallback; GLB over HTTP; learn & quiz |

## Running

```bash
npm test
```

```bash
npm run test:e2e
```

- E2E builds the site and serves it with `vite preview` on :4173, using the Chromium bundled with `@playwright/test` 1.63.0 (install once with `cd frontend && npx playwright install chromium`; CI adds `--with-deps`).
- WebGL runs through SwiftShader (software) in headless mode, which is slow; `--workers=2` is a good default.
- Against a deployed site: `cd frontend && E2E_BASE_URL=https://suspension-lab-kappa.vercel.app npx playwright test`.
- Only one viewport: `npx playwright test --project=desktop`.

## Latest results

Environment: Ubuntu 24.04 container, 4 vCPU, Node 22.23, headless Chromium (Playwright 1.63, SwiftShader WebGL).

| Suite | Result |
|---|---|
| shared content | 9 passed |
| frontend unit (incl. Mechanic data/model and dual-mode UI tests) | 73 passed |
| e2e local static build (desktop + tablet + mobile; Consumer + Mechanic + mode switching) | 56 passed, 1 skipped by design (3D tap test on phones, where labels are off by default) |
| e2e against live production (dual mode, 2026-11-11) | 56 passed, 1 skipped by design |

Physical tablets/phones were not available; the tablet/mobile results use Chromium device emulation.
