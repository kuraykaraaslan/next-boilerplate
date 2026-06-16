# Feature Flags

- **id:** `feature_flags`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/feature_flags/`
- **tags:** platform, feature-flags, rollout, experimentation
- **icon:** `fas fa-toggle-on`
- **hasNextLayer:** true

Tenant-scoped feature flags with master switch, deterministic percentage rollout, attribute-based targeting rules, and per-subject (user/segment) overrides. Read-through cached for hot-path evaluation; every write is audit-logged.

## Dependencies

- **requires:** `db`, `env`, `redis`, `common`, `audit_log`

## Services

- `feature_flags.service.ts`

## DTOs

- `feature_flags.dto.ts`

## Entities

- `feature_flag.entity.ts`
- `feature_flag_override.entity.ts`

## Enums

- `feature_flags.enums.ts`

## Message keys

- `feature_flags.messages.ts`

## TypeORM entities

- `FeatureFlag` (system) — `modules/feature_flags/server/entities/feature_flag.entity.ts`
- `FeatureFlagOverride` (system) — `modules/feature_flags/server/entities/feature_flag_override.entity.ts`

## Next layer (modules_next/) surface

- `feature_flags/ui/feature-flag-columns.component` _(ui, client)_
- `feature_flags/ui/feature-flags.page` _(ui, client)_

## README

# feature_flags

Tenant-scoped **feature flags** — gate features, run percentage rollouts, target
by attribute, and pin per-user/segment overrides. Framework-agnostic
(`modules/` layer); the Next bindings (admin UI + API routes) live under
`app/` and `modules_next/`.

## What it does

A flag is identified by a stable `key` (e.g. `new-checkout`). Evaluation against
a context follows a strict precedence:

1. **Master switch** — `enabled = false` → off for everyone.
2. **Override** — an explicit per-subject decision (a `user` id, or a
   `segment` like `plan:pro`) wins next.
3. **Targeting rule** — the first matching attribute rule decides
   (`eq`/`neq`/`in`/`nin`/`contains`).
4. **Percentage rollout** — a deterministic SHA-256 bucket of `(key, subject)`
   in `[0,100)` compared against `rolloutPercentage`. Raising the percentage
   only ever *adds* subjects; nobody flips back off.

Unknown keys evaluate to **off** (`not_found`) — a missing flag is never
silently on.

## Public API

```ts
import { FeatureFlagsService } from "@/modules/feature_flags";

// Evaluate one flag for a request context
const { enabled } = await FeatureFlagsService.evaluate(tenantId, "new-checkout", {
  userId,
  attributes: { plan: "pro", country: "TR" },
});

// Bootstrap a whole client at once
const map = await FeatureFlagsService.evaluateAll(tenantId, { userId });

// Admin CRUD
await FeatureFlagsService.create(tenantId, { key: "new-checkout", name: "New checkout", enabled: true, rolloutPercentage: 10 }, actorId);
await FeatureFlagsService.update(tenantId, "new-checkout", { rolloutPercentage: 50 }, actorId);
await FeatureFlagsService.setOverride(tenantId, "new-checkout", { subjectType: "user", subjectId, enabled: true }, actorId);
```

The pure evaluator is exported for unit use / edge contexts:
`evaluateFlag(flag, overrides, ctx)`, `rolloutBucket(key, subject)`,
`ruleMatches(rule, ctx)`.

## Entities

| Entity | Table | Notes |
|---|---|---|
| `FeatureFlag` | `feature_flags` | Unique `(tenantId, key)`. Holds master switch, rollout %, JSON targeting rules. |
| `FeatureFlagOverride` | `feature_flag_overrides` | Unique `(tenantId, flagKey, subjectType, subjectId)`. |

## Caching

The full per-tenant flag-set (flags + overrides) is cached in Redis under
`feature_flags:{tenantId}` (`TENANT_CACHE_TTL`, default 5 min, jittered) and
invalidated on every write, so hot-path `evaluate()` stays a single GET.

## Dependencies

`db`, `env`, `redis`, `common`, `audit_log`.

## HTTP surface

- `GET/POST /tenant/{tenantId}/api/feature-flags` — list / create (admin)
- `GET/PATCH/DELETE /tenant/{tenantId}/api/feature-flags/{key}` — read / update / delete (admin)
- `GET/POST /tenant/{tenantId}/api/feature-flags/{key}/overrides` — list / upsert override (admin)
- `DELETE /tenant/{tenantId}/api/feature-flags/{key}/overrides/{overrideId}` — remove override (admin)
- `POST /tenant/{tenantId}/api/feature-flags/evaluate` — evaluate one or all flags for a context (authenticated)

Admin UI: `/tenant/{tenantId}/admin/feature-flags`.
