# Architecture

## Overview

Suspension Lab is a **static single-page application**. There is no server, API or database.

```
shared/content/*.json  (Indonesian content, single source of truth, validated by tests)
        │  imported at build time
        ▼
frontend (Vite SPA) ──── npm run build ────▶ frontend/dist (static files) ──▶ any static host / CDN
  data/contentStore      bundled content, exposed through useContent(selector)
  pages, features, components (Tailwind)
  state/labStore (zustand)
  three/ (3D engine, lazy-loaded)
```

### Key decisions

| Decision | Why |
|---|---|
| **Fully static, content bundled at build time** | The content is fixed educational material, so a database adds cost, latency and failure points without benefit. The site works on any static host, loads instantly and cannot "lose" its data source. (An earlier version had an Express + MySQL API; it was removed as unnecessary.) |
| **Content lives in `shared/content/*.json` with TS types** | Non-developers can edit texts in one place; `shared/tests` enforce that every field required by the UI is present. |
| **3D models are procedural, but built through a name-based part system** | No licensed CAD assets were available. Every part is a named node (`R_Lower_Arm`, `C_Stabilizer_Bar` …) so a Blender GLB with the same names replaces them without code changes (verified by an automated round-trip test). |
| **Kinematics are solved, not keyframed** | Each frame, joint positions are solved from geometric constraints (rigid link lengths, strut axis through top mount, tie-rod length). Mechanically impossible poses cannot appear. |
| **Per-frame work bypasses React** | `useFrame` mutates three.js objects; the timeline UI is throttled to ~12 Hz via an external store; highlight state re-applies only when selection changes. |
| **zustand** for UI state | Tiny, selector-based subscriptions avoid re-renders; it is already a dependency of R3F. |
| **3D code is route-split** | The home page loads ≈108 kB gz; three.js/R3F (≈330 kB gz) load only on `/jelajah/*`. |

## Frontend structure

```
src/
├── App.tsx                    routes (lazy pages), kiosk idle reset
├── data/contentStore.ts       bundled content + useContent(selector)
├── state/labStore.ts          selection, hidden parts, exploded, labels, mode/speed/manual, damage
├── hooks/                     useSuspension (resolve per-architecture components), useTimeline,
│                              useSuspensionModel (procedural → optional GLB), useSimClock, useMediaQuery
├── three/
│   ├── rig/types.ts           RigFrame, PartDef, SuspensionModel contracts
│   ├── rig/builder.ts         ModelBuilder: part registry, L/R mirroring, GLB lookup, explode, base pose
│   ├── rig/parts.ts           procedural geometry (beams, bushings, ball joints, in-place SpringGeometry, wheel, hub)
│   ├── rig/math.ts            robust root finder, circle intersection, RigidPose
│   ├── rig/visualState.ts     highlight / ghost / hide / damage tint
│   ├── rig/optimize.ts        merges static sub-meshes per material (≈45 % fewer draw calls)
│   ├── rig/glbSource.ts       GLTFLoader (+ meshopt) → PartSource
│   ├── rig/glbExport.ts       procedural → reference GLB
│   ├── models/*.ts            one file per architecture: geometry constants, pure solver, builder
│   ├── models/common.ts       shared assemblies: wheel+hub, stabilizer bar (twist), rack & tie rods, shocks
│   ├── models/registry.ts     modelKey → builder, optional GLB, camera framing
│   └── sim/                   timeline (quarter-car response), damageEffects, clock
├── components/viewer/         SuspensionViewer (Canvas, lights, camera), SuspensionRig (frame loop, picking),
│                              ComponentLabels (de-cluttered DOM overlay), RoadSurface, ViewerHost (lazy, fallback)
└── pages/, features/, components/{layout,ui,component-info,simulation}
```

### Coordinate system & conventions

- Metres, **Y up**, **X outboard to the right**, **Z forward**. Ground at Y = 0. Wheel radius 0.31 m, half-track 0.76 m.
- Each architecture authors the **right corner** (`R_*` parts) in corner-local coordinates; the left corner is the *same* builder inside a group with `scale.x = -1` (mirror). Parts that span both sides are `C_*`.
- A rotation about X is unchanged by the X-mirror, so stabilizer and torsion-beam angles are shared between sides; steering angles flip sign in the mirrored corner.
- Rigid parts are authored in their **design (ride-height) pose** with their origin at a natural pivot; the driver applies `position = pose.apply(restPosition)`, `quaternion = pose.q * restQuaternion`.
- Stretchable parts (rods, links, springs) are authored **pivot-at-base, unit length along +Y** and spanned between two points each frame.

### Kinematics per architecture

| Model | Solved quantities | Exact constraints | Simplifications |
|---|---|---|---|
| MacPherson | lower-arm angle θ (from wheel travel), knuckle rotation φ (strut axis must pass through top mount), steer angle δ (tie-rod length) , stabilizer arm angle β (link length) | arm length, tie-rod length, strut-through-mount, link length | planar (front view) arm motion, no caster |
| Double wishbone | θ_lower, upper ball joint by circle intersection, δ, β | both arm lengths, knuckle ball-joint spacing, tie-rod, link | planar arms, no caster |
| Multi-link | as SLA with split links | **every** link length (links share effective pivot lines) | real multi-link non-parallel link tuning not modelled |
| Torsion beam | each trailing-arm angle α; beam segments interpolate α → visible twist | arm geometry | beam twist drawn by interpolation (not FE) |
| Rigid axle | heave: Newton solve of fore/aft + pitch from both link pairs; roll from travel difference; lateral shift from Panhard length | Panhard length always; link lengths in heave | 4-link + Panhard is over-constrained in roll; link-length change (< 12 mm, tested) represents bushing deflection |

Steering is **rack-driven**: the rack moves and each knuckle's steer angle is solved so the tie rod keeps its length — Ackermann (inner wheel turns more) and bump-steer emerge from the geometry and are covered by tests.

### Motion & damage model

`three/sim/timeline.ts` precomputes one periodic cycle (240 Hz) per side of a base-excited single-DOF body:
`z_b'' = −ω²(z_b − r) − 2ζω(z_b' − r')`, body frequency 1.3 Hz, travel = `r − z_b` clamped to ±85 mm.
Viewed from the chassis, the road moves by `−z_b`, so the tyre stays on the road strip. Damping ratio
0.4 (normal) vs. 0.07 (weak shock, scaled by the intensity slider).

`three/sim/damageEffects.ts` turns a scenario's `params` (from `damage-scenarios.json`) into illustrative offsets —
pivot shift, ball-joint gap, mount sag/shift, link play, toe wobble — applied **only to the right side**,
so the left side is always a healthy reference.

### Modelling honesty

- The UI permanently shows "Model ilustratif — bukan CAD rekayasa".
- Damage panels state that the visual is exaggerated and not a diagnosis; every symptom list carries the
  notice that symptoms can come from other components.
- Proportions are representative of passenger cars, not of a specific vehicle.

## Extension guide

### Add a new component

1. Add an entry to `shared/content/components.json` (all fields required; tests enforce non-empty lists).
2. Reference it from one or more architectures in `shared/content/suspensions.json` (`components[]` with `roleDescription`).
3. Give it geometry: in the relevant `frontend/src/three/models/<arch>.ts`, `b.addPair('My_Part', 'my-component-id', [explode x,y,z], () => factory())` and pose it in the driver.
4. `npm test`.

### Add a new damage scenario

1. Add to `shared/content/damage-scenarios.json` with `componentId`, texts, and `simulation: { kind, params, recommendedMode }`.
2. Reuse an existing `kind` (only params change) **or** add a new kind to `DAMAGE_SIM_KINDS` (`shared/src/types.ts`) and implement it in `frontend/src/three/sim/damageEffects.ts` (return offsets; the model drivers already consume `CornerDamage`).
3. It automatically appears for every architecture that contains the component.
4. Run `npm test`.

### Add a new suspension architecture

1. Add the id to `SUSPENSION_IDS` and an entry to `suspensions.json` (`modelKey`, components, texts).
2. Create `frontend/src/three/models/<name>.ts`: geometry constants (right corner), a **pure solver** function (testable), and `build<Name>(source?: PartSource)` using `ModelBuilder` (`addPair`/`add`, then `finish(driver)`).
3. Register it in `models/registry.ts` with camera framing.
4. Add constraint tests in `models/kinematics.test.ts` (link lengths constant, wheel centre tracks travel).
5. Optionally render a thumbnail to `frontend/public/thumbs/<id>.webp`.

### Replace a procedural model with a Blender GLB

1. `npm run glb:expected -w frontend -- macpherson` lists the node names to model (R_ and C_ only).
2. Model in Blender following [asset-pipeline.md](asset-pipeline.md), export GLB.
3. `npm run glb:validate -w frontend -- path/to/file.glb macpherson`.
4. Copy to `frontend/public/models/` (or upload to your CDN and set `VITE_MODEL_BASE_URL`).
5. In `models/registry.ts` set `glb: 'macpherson.glb'` on the entry. Missing nodes fall back to procedural parts and are logged.
