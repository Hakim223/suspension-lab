# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Badge shows **Data lokal** in production | API unreachable, CORS rejected, or CSP blocked the request | Open DevTools → Console/Network. `CORS_FORBIDDEN` → add the exact frontend origin to `CORS_ORIGINS` (scheme + host, no trailing slash) and redeploy the API. CSP error → the API must be `https://`. Check `VITE_API_URL` was set **before** the build. |
| `/api/health` returns `503 {"db":"down"}` | DB credentials/host wrong, TLS required, IP not allowed | Check `DATABASE_URL`/`DB_*`, set `DB_SSL=true` for managed MySQL, allow the API host in the DB firewall. Server logs print `database UNREACHABLE` at startup. |
| `ER_NO_SUCH_TABLE` / 503 after deploying | Schema not applied | `DATABASE_URL=… DB_SSL=true npm run db:setup` |
| `self-signed certificate in certificate chain` | Provider CA not in Node's trust store | `NODE_EXTRA_CA_CERTS=/path/ca.pem` (preferred) or `DB_SSL_REJECT_UNAUTHORIZED=false` |
| `429 RATE_LIMITED` in the workshop | Several kiosks share one public IP | Raise `RATE_LIMIT_MAX`; verify `TRUST_PROXY` matches the number of proxies |
| Deep links (`/jelajah/…`) return 404 on refresh | SPA fallback missing | Vercel: keep `vercel.json` at repo root. Cloudflare Pages: `frontend/public/_redirects` must be in the output. Other hosts: rewrite all non-file paths to `/index.html`. |
| "Mode tanpa 3D" appears | Browser has WebGL disabled/unsupported (or `?no3d=1`) | Enable hardware acceleration (Chrome → Settings → System), update the browser/GPU driver. All content remains usable in the fallback. |
| 3D is slow / tablet gets hot | Weak GPU, high-DPI screen | The app auto-switches to low quality when FPS drops; force it with `?quality=low`. Hide the wheels (eye icon) to reduce overdraw; close other tabs. |
| Model never finishes "Memuat model 3D…" | JS chunk failed to load (flaky network/CDN) | Reload; check Network for failed `assets/*.js`. The page has an error boundary that falls back to the non-3D interface if WebGL initialisation throws. |
| GLB not used (procedural still shown) | File missing/404, wrong `VITE_MODEL_BASE_URL`, CORS on the bucket, or node names don't match | Console shows `[model] GLB … unavailable` or `… missing nodes`. Run `npm run glb:validate -w frontend -- file.glb <model>`. |
| Labels overlap on small screens | Many components in little space | Labels are off by default on phones; select a component or enable focus mode to show only its label. |
| `npm run build` fails at `glb:export-reference` | Type error or broken model code | Run `npm run typecheck` and `npm test -w frontend` to locate the model. |
| E2E: `Executable doesn't exist` | Playwright browser not installed for 1.63 | `cd frontend && npx playwright install chromium` |
| E2E timeouts in "all five architectures" | Software WebGL is slow | Use `--workers=1` or `2`; the test has an extended timeout. |
| Seed out of date in CI | Content JSON edited without regenerating | `npm run db:seed:generate` and commit `database/seed.sql` |
