# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Deep links (`/jelajah/…`) return 404 on refresh | SPA fallback missing on the host | Vercel: keep `vercel.json` at the repo root. Cloudflare Pages/Netlify: `frontend/public/_redirects` must be in the output. Other hosts: rewrite all non-file paths to `/index.html`. |
| Texts changed in `shared/content` but the site didn't change | Content is bundled at build time | Push to `main` (Vercel rebuilds) or run `npm run build` again for other hosts. |
| `npm test` fails after editing content | A required field is empty or an id is misspelled | The failing test names the component/field; every component referenced by a suspension must exist in `components.json`. |
| "Mode tanpa 3D" appears | Browser has WebGL disabled/unsupported (or `?no3d=1`) | Enable hardware acceleration (Chrome → Settings → System), update the browser/GPU driver. All content remains usable in the fallback. |
| 3D is slow / tablet gets hot | Weak GPU, high-DPI screen | The app auto-switches to low quality when FPS drops; force it with `?quality=low`. Hide the wheels (eye icon) to reduce overdraw; close other tabs. |
| Model never finishes "Memuat model 3D…" | JS chunk failed to load (flaky network) | Reload; check Network for failed `assets/*.js`. An error boundary falls back to the non-3D interface if WebGL initialisation throws. |
| GLB not used (procedural still shown) | File missing/404, wrong `VITE_MODEL_BASE_URL`, CORS on the bucket, or node names don't match | Console shows `[model] GLB … unavailable` or `… missing nodes`. Run `npm run glb:validate -w frontend -- file.glb <model>`. |
| Labels overlap on small screens | Many components in little space | Labels are off by default on phones; select a component or enable focus mode to show only its label. |
| `npm run build` fails at `glb:export-reference` | Type error or broken model code | Run `npm run typecheck` and `npm test -w frontend` to locate the model. |
| E2E: `Executable doesn't exist` | Playwright browser not installed for 1.63 | `cd frontend && npx playwright install chromium` |
| E2E timeouts in "all five architectures" | Software WebGL is slow | Use `--workers=1` or `2`; the test has an extended timeout. |
