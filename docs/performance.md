# Performance & accessibility

## Targets and assumptions

Primary device: **mid-range Android tablet** in a waiting room (e.g. 10–11" 1920×1200, Mali-G57/Adreno 610-class GPU, 4 GB RAM, Chrome stable), on workshop Wi-Fi.
Secondary: recent iOS/Android phones (Safari/Chrome), desktop Chrome/Edge/Firefox/Safari.

| Metric | Target | How it is met |
|---|---|---|
| Home page JS (gzip) | < 150 kB | 108 kB measured (React + router + content); 3D code is route-split |
| Explorer extra JS (gzip) | < 400 kB | ≈ 330 kB (three 209 kB, R3F/drei 90 kB, viewer + page 29 kB) |
| Time to interactive 3D (tablet, Wi-Fi) | < 3 s warm cache, < 6 s cold | lazy chunks, procedural models (no model download), hashed assets cached 1 year |
| Frame rate | ≥ 45 fps typical, ≥ 30 fps worst case | 10–31k triangles, 50–121 meshes after merging; kinematics 0.12–0.36 ms/frame on a 2.1 GHz Xeon core (≈ 1–3 ms expected on a tablet CPU); adaptive quality |
| Memory | < 250 MB tab | no textures; geometry/material disposal on model switch |
| Touch targets | ≥ 44 × 44 px | `min-h-11`/`w-11` buttons, 22 px slider thumbs |
| Body text | ≥ 14 px (15–16 px panels) | Tailwind tokens; no text below 11.5 px (chips only) |

Measured in the development container (headless, software WebGL) — real-device frame rates were not
measurable there; validate on the target tablet using Chrome DevTools remote debugging
(Performance panel) or `chrome://tracing`, and record results here.

## Techniques used

- **Route and vendor splitting** (`vite.config.ts` → `codeSplitting` groups): React vendor, three core, R3F/drei, viewer.
- **No per-frame React renders:** `useFrame` mutates objects; UI readouts update via a throttled external store (~12 Hz); highlight state recomputed only on selection changes.
- **In-place geometry updates:** springs regenerate vertices in a preallocated buffer; road strips update positions in place.
- **Draw-call reduction:** `three/rig/optimize.ts` merges static sub-meshes per material within each part (≈ 45 % fewer meshes).
- **Adaptive quality:** drei `PerformanceMonitor` → on sustained FPS decline the canvas drops to DPR 1 and disables shadow maps and contact shadows; `?quality=low` forces it. DPR is capped at 1.75.
- **Resource disposal:** `SuspensionModel.dispose()` frees geometries/materials when switching architecture or replacing procedural parts with a GLB; the PMREM environment texture is disposed on unmount.
- **No network-fetched HDRIs/fonts in the 3D path:** environment lighting uses three's built-in `RoomEnvironment`. (UI fonts load from Google Fonts with system fallbacks.)
- **Compressed GLB support** via bundled meshopt decoder.
- **Caching:** hashed assets immutable for a year; models/thumbnails 7 days; API responses 60 s.

## Accessibility

- All controls are real `<button>`/`<input>` elements with Indonesian `aria-label`s; toggles expose `aria-pressed`, mode selectors use `role="radiogroup"`, tabs use `role="tab"`/`aria-selected`.
- Visible focus ring (`:focus-visible`, cyan). Esc closes bottom sheets.
- High-contrast palette (light text on graphite/navy, cyan accent); status never relies on colour alone (legend text "normal"/"rusak", severity chips with words).
- `prefers-reduced-motion` reduces UI transitions.
- **Non-WebGL fallback**: if WebGL is unavailable or the 3D viewer throws, a card-based interface keeps all educational content usable.
- Language is set to Indonesian (`<html lang="id">`).
