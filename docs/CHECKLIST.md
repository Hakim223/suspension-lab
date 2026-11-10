# Development checklist

Status legend: ✅ done & verified · ⚠️ done with a documented limitation · ⏳ requires your action (external account/credentials)

## Milestones

| # | Milestone | Status |
|---|---|---|
| M1 | Monorepo, shared typed content, MySQL schema + generated seed, Express API (validation, CORS, rate limit, errors), API + DB integration tests | ✅ |
| M2 | Procedural 3D models for 5 architectures with solved kinematics; rig builder with GLB substitution; kinematic constraint tests | ✅ |
| M3 | Viewer (orbit/zoom/pan/touch, selection, highlight, labels, hide/show, exploded, camera reset/focus), animation engine, damage simulator | ✅ |
| M4 | Indonesian content, explorer/home/learn/quiz pages, responsive desktop/tablet/phone layouts, WebGL fallback, kiosk mode | ✅ |
| M5 | Unit, integration, GLB round-trip and Playwright e2e tests on three viewports; performance work | ✅ |
| M6 | Deployment configs (Vercel, Cloudflare Pages, Render, Docker, CI), documentation | ✅ files · ⏳ actual deploy |

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
| Backend APIs | ✅ | 23 API tests |
| MySQL integration | ✅ | 6 integration tests against MySQL 8.0.46 (exact round-trip) |
| Tests pass | ✅ | see `testing.md` |
| Production build | ✅ | `npm run build` (frontend + backend) |
| Deployment verified | ⏳ | No hosting credentials in the dev environment. Production build verified locally behind production headers. Steps: `deployment.md` |
| Documentation | ✅ | README + `docs/` |

## Known limitations / follow-ups

- ⚠️ Models are procedural illustrations (labelled in UI). Replace with Blender GLBs per `asset-pipeline.md` for higher fidelity.
- ⚠️ Kinematics are planar (front view) for the independent suspensions; caster and real multi-link camber/toe tuning are not modelled. The rigid axle shows roll over-constraint as small link-length changes (bushing compliance).
- ⚠️ The motion model is a qualitative quarter-car response, not a validated vehicle-dynamics model.
- ⚠️ Real-device performance (Android tablet GPU) not measured — record results in `performance.md` after first deployment.
- ⚠️ `backend/Dockerfile` not built (no Docker daemon in the dev environment); Render/Railway use Node buildpacks and don't need it.
- ⚠️ GLB meshopt compression documented but not exercised with a compressed file (gltfpack was not available).
- ✅ Workshop branding: Five Degrees Kaki Kaki name + logo (`frontend/src/config/workshop.ts`, `frontend/public/brand/`). Contact details: add to `WORKSHOP.contact` when available.
- Idea: analytics of which components customers explore (would need a privacy decision).
