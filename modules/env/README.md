# env

Single source of truth for environment-variable access. Parses `process.env` once at module load through a Zod schema and exports a strongly-typed `env` object — typos and missing required values fail fast at boot.

## Public API

| Export | Source | Use |
|---|---|---|
| `env` | [env.service.ts](env.service.ts) | Typed accessor: `env.DATABASE_URL`, `env.REDIS_PORT` (already a number), etc. |

## Usage

```ts
import { env } from "@/modules/env";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const ttl = env.SESSION_CACHE_TTL; // number, already coerced
```

## Variable groups

`env.service.ts` groups variables in commented sections — extend the matching section when you add a new key:

- Core (`NODE_ENV`, `PORT`, `DEBUG*`)
- Database (`DATABASE_URL` — tek Postgres URL; per-tenant DB isolation `tenant_databases` row'u ile yapılır)
- Redis (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`)
- Auth / Secrets (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `CSRF_SECRET`)
- Session / Token TTLs
- OTP / TOTP / WebAuthn
- Multi-tenancy (`TENANCY_MODE`, `TENANT_WILDCARD_DOMAIN`, …)
- Storage, Payments, AI, Notifications, Webhooks — see schema for the full list

## Rules

- **Never** read `process.env.XXX` directly outside this module. Always go through `env.XXX`. This keeps validation centralised and the `.env.example` file authoritative.
- Required values use `z.string().min(1)`; optional values use `.optional()` or `.default(...)`.
- Use `z.coerce.number()` / `z.coerce.boolean()` for non-string types — env vars arrive as strings.
- When you add a key, update [.env.example](../../.env.example) with a documented placeholder.
- No `next/*`, no `react`.
