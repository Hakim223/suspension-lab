# API reference

Base URL: `https://<your-api-host>` (local: `http://localhost:4000`). All endpoints are `GET`, return
JSON, and are read-only. Successful responses are wrapped as `{ "data": ... }`; errors as
`{ "error": { "code": "...", "message": "..." } }` (messages in Indonesian).

## Endpoints

| Method & path | Description | Errors |
|---|---|---|
| `GET /api/health` | `{ status: "ok"|"degraded", db: "up"|"down", time }` — 200 when the DB answers, 503 otherwise. Use as the platform health check. | 503 |
| `GET /api/suspensions` | All architectures (ordered), each with `components[]` links (`componentId`, `roleDescription`, `localName?`, `quantityNote?`, `sortOrder`). | 503 |
| `GET /api/suspensions/:id` | One architecture. | 400, 404, 503 |
| `GET /api/suspensions/:id/components` | Fully resolved components of an architecture, each with a `link` object (architecture-specific role/name). | 400, 404, 503 |
| `GET /api/suspensions/:id/damage-scenarios` | Damage scenarios whose component exists in that architecture. | 400, 404, 503 |
| `GET /api/components` | All component records (function, working principle, location, failure modes, symptoms, consequences, inspection, terms, `includes?`). | 503 |
| `GET /api/components/:id` | One component, plus `usedIn: SuspensionId[]`. | 400, 404, 503 |
| `GET /api/components/:id/damage-scenarios` | Scenarios for a component. | 400, 404, 503 |
| `GET /api/damage-scenarios` | All scenarios. | 503 |
| `GET /api/damage-scenarios/:id` | One scenario (`simulation: { kind, params, recommendedMode }`). | 400, 404, 503 |

Ids are slugs: `^[a-z0-9]+(-[a-z0-9]+)*$`, max 64 chars (e.g. `double-wishbone`, `ball-joint`, `weak-shock`).

Response types are the TypeScript interfaces in [`shared/src/types.ts`](../shared/src/types.ts)
(`SuspensionType`, `SuspensionComponent`, `DamageScenario`).

## Example

```bash
curl -s https://api.example.com/api/components/ball-joint
```

```json
{
  "data": {
    "id": "ball-joint",
    "name": "Ball Joint (Sendi Peluru)",
    "category": "sambungan",
    "function": "Ball joint bekerja seperti sendi bahu manusia: …",
    "symptoms": ["Bunyi 'tok-tok' …", "…"],
    "inspection": ["Mengangkat roda dan menggoyangnya atas-bawah …"],
    "usedIn": ["macpherson", "double-wishbone"]
  }
}
```

## Error codes

| HTTP | `code` | When |
|---|---|---|
| 400 | `INVALID_PARAMETER` | Id is not a valid slug |
| 400 | `BAD_REQUEST` | Malformed JSON body (no endpoints accept bodies today) |
| 403 | `CORS_FORBIDDEN` | Browser `Origin` not in `CORS_ORIGINS` |
| 404 | `NOT_FOUND` | Unknown id or route |
| 429 | `RATE_LIMITED` | More than `RATE_LIMIT_MAX` requests per `RATE_LIMIT_WINDOW_MS` per IP |
| 500 | `INTERNAL_ERROR` | Unexpected error (details only in server logs) |
| 503 | `DATABASE_UNAVAILABLE` | MySQL unreachable / misconfigured |

## Behaviour

- **Caching:** responses carry `Cache-Control: public, max-age=60`; the server caches the content snapshot for 60 s.
- **Rate limiting:** `express-rate-limit`, IETF draft-8 `RateLimit` headers. Behind a proxy set `TRUST_PROXY` (Render/Railway: `1`) so client IPs are correct.
- **CORS:** only `GET`/`OPTIONS`; requests without `Origin` (curl, health checks) are allowed.
- **Security headers:** helmet defaults; `x-powered-by` disabled; JSON body limit 10 kB.

## Environment variables

See [`backend/.env.example`](../backend/.env.example).

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `production` on hosts |
| `PORT` | `4000` | Most hosts inject `PORT` |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated exact origins, e.g. `https://lab.example.com,https://suspension-lab.vercel.app` |
| `DATABASE_URL` | — | `mysql://user:pass@host:3306/db` (takes precedence over `DB_*`) |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | local defaults | Discrete connection settings |
| `DB_SSL` | `false` | `true` for managed MySQL requiring TLS |
| `DB_SSL_REJECT_UNAUTHORIZED` | `true` | Only set `false` if the provider uses a certificate you cannot verify |
| `DB_CONNECTION_LIMIT` | `10` | Pool size |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | `60000` / `120` | Per IP |
| `TRUST_PROXY` | `1` | Number of proxies in front of the app |
