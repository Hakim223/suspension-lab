# Development checklist

Status legend: ✅ done & verified · ⚠️ done with a documented limitation · ⏳ requires your action (external account/credentials)

## Milestones

| # | Milestone | Status |
|---|---|---|
| M1 | Monorepo, shared typed content with integrity tests | ✅ |
| M2 | Procedural 3D models for 5 architectures with solved kinematics; rig builder with GLB substitution; kinematic constraint tests | ✅ |
| M3 | Viewer (orbit/zoom/pan/touch, selection, highlight, labels, hide/show, exploded, camera reset/focus), animation engine, damage simulator | ✅ |
| M4 | Indonesian content, explorer/home/learn/quiz pages, responsive desktop/tablet/phone layouts, WebGL fallback, kiosk mode | ✅ |
| M5 | Unit, GLB round-trip and Playwright e2e tests on three viewports; performance work | ✅ |
| M6 | Static deployment on Vercel, CI, documentation | ✅ |
| M7 | Simplified to a fully static site: Express API, MySQL, seed tooling and server deploy files removed (content was already bundled) | ✅ |
| M8 | Dual mode: landing page, Consumer Mode preserved at `/consumer`, Mechanic Mode (`/mechanic`): architecture workbench with per-mechanism failure simulation, steering module (mechanical/HPS/EPS), component anatomy, diagnostic training; session-preserving mode switch | ✅ |

## Definition of done

| Requirement | Status | Evidence |
|---|---|---|
| All five architectures accessible | ✅ | e2e "all five architectures render" (canvas pixel check) |
| Independently selectable components per model | ✅ | kinematics test (unique named parts), e2e tap-in-3D, list selection |
| Component information works | ✅ | unit + e2e (all 7 info sections) |
| Rotate, zoom, pan | ✅ | OrbitControls (mouse + touch: 1-finger rotate, pinch zoom, 2-finger pan); manual check on desktop; touch via emulation only ⚠️ |
| Exploded view | ✅ | unit (returns exactly), e2e toggle |
| Mechanical animations | ✅ | bump / rough / steer / manual; constraint tests; e2e play/scrub/manual |
| Damage scenarios (6) | ✅ | content + sim tests; e2e compare normal/damaged |
| Indonesian educational content | ✅ | 5 architectures, 20 components, 6 scenarios, glossary, quiz |
| Responsive layouts | ✅ | e2e desktop 1440×900, tablet 820×1180, Pixel 7; screenshots reviewed |
| Backend / database | — | Removed by decision: the site is fully static (e2e verifies no API requests are made) |
| Tests pass | ✅ | see `testing.md` |
| Production build | ✅ | `npm run build` → `frontend/dist` |
| Deployment verified | ✅ | Live static site at https://suspension-lab-kappa.vercel.app; e2e suite against production: 38 passed, 1 skipped by design |
| Documentation | ✅ | README + `docs/` |

## Known limitations / follow-ups

- ⚠️ Models are procedural illustrations (labelled in UI). Replace with Blender GLBs per `asset-pipeline.md` for higher fidelity.
- ⚠️ Kinematics are planar (front view) for the independent suspensions; caster and real multi-link camber/toe tuning are not modelled. The rigid axle shows roll over-constraint as small link-length changes (bushing compliance).
- ⚠️ The motion model is a qualitative quarter-car response, not a validated vehicle-dynamics model.
- ⚠️ Real-device performance (Android tablet GPU) not measured — record results in `performance.md` after first deployment.
- ⚠️ GLB meshopt compression documented but not exercised with a compressed file (gltfpack was not available).
- ✅ Workshop branding: Five Degrees Kaki Kaki name + logo (`frontend/src/config/workshop.ts`, `frontend/public/brand/`). Contact details: add to `WORKSHOP.contact` when available.
- ⚠️ Mechanic 3D simulation uses the same planar kinematic models as Consumer Mode; failures that change rotation about a part's own axis (e.g. spring wind-up from a seized strut bearing) or produce forces/noise only are explained rather than animated.
- ⚠️ Anatomy models are simplified procedural constructions (no manufacturer CAD); the steering schematic is a top-view diagram, not to scale.
- Idea: analytics of which components customers explore (would need a privacy decision).
