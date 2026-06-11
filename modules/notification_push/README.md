# Notification Push Module

Web Push notifications using the Web Push API with VAPID keys. Stores browser subscriptions per tenant in the tenant DB and sends push messages to users, roles, or every subscriber in a tenant. VAPID signing is platform-global (env-only).

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `PushSubscription` | `push_subscriptions` | One Web Push endpoint (`endpoint` + `p256dh`/`auth` keys) for one user on one device. |

Lives in the **tenant DB** (has a `tenantId` column). Composite uniques `UQ_push_sub_tenant_endpoint` `(tenantId, endpoint)` and `UQ_push_sub_tenant_user_endpoint` `(tenantId, userId, endpoint)` let the same physical browser endpoint be re-used across the tenants a user belongs to while preventing duplicates within a tenant. `tenantId` and `userId` are both indexed.

---

## Service

`NotificationPushService` (`notification_push.service.ts`) — all methods are static and take `tenantId` as the first argument; every read/write resolves `tenantDataSourceFor(tenantId)`, so subscriptions are isolated per tenant.

| Method | Responsibility |
|---|---|
| `subscribe(tenantId, userId, { endpoint, keys })` | Upsert a subscription. If the endpoint already exists it is re-pointed to `userId`; the previous owner's cache is cleared when ownership moves. |
| `unsubscribe(tenantId, userId)` | Delete all subscriptions for the user in this tenant. |
| `unsubscribeByEndpoint(tenantId, endpoint)` | Delete a single endpoint and clear its owner's cache. |
| `getSubscriptionsForUser(tenantId, userId)` | Fetch a user's subscriptions (Redis-cached, see *Caching*). |
| `sendToUser(tenantId, userId, payload)` | Push to all of a user's devices (uses the cache). |
| `sendToUsers(tenantId, userIds[], payload)` | Push to several users (direct DB read). |
| `sendToRole(tenantId, role, payload)` | Push to every `ACTIVE` `TenantMember` with `memberRole === role` (tenant-scoped roles, not the global `User.userRole`). |
| `sendToAdmins(tenantId, payload)` | Convenience wrapper for `sendToRole(tenantId, 'ADMIN', payload)`. |
| `sendToAll(tenantId, payload)` | Push to every subscriber in the tenant — scoped to one tenant, no cross-tenant broadcast. |

All send variants call `ensureVapid()` (initialises `web-push` VAPID details once per process) and fan out with `Promise.allSettled`. The private `sendToSubscription` removes a subscription on a `410 Gone` / `404 Not Found` response (expired/invalid endpoint) and clears that user's cache; other failures are logged via `Logger`.

Message constants live in `notification_push.messages.ts` (`NotificationPushMessages`: `SUBSCRIBED_SUCCESSFULLY`, `UNSUBSCRIBED_SUCCESSFULLY`, `SUBSCRIPTION_NOT_FOUND`, `PUSH_SENT`, `PUSH_FAILED`, `VAPID_NOT_CONFIGURED`).

---

## Push Payload

```typescript
interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;   // navigate on click
}
```

---

## API Routes

Tenant-scoped, authenticated as the current tenant user (`TenantSessionNextService.authenticateTenantByRequest`) and rate-limited. Both verbs live in one route file.

| Method | Path | Description |
|---|---|---|
| POST | `/tenant/[tenantId]/api/notifications/push/subscribe` | Register a subscription for the current user. Body: `{ endpoint, keys: { p256dh, auth } }` (validated with Zod; `endpoint` must be a URL). |
| DELETE | `/tenant/[tenantId]/api/notifications/push/subscribe` | Remove subscriptions. With `?endpoint=...` removes that single endpoint; without it removes all of the user's subscriptions in this tenant. |

---

## Sending a Push

```typescript
import PushService from '@/modules/notification_push/notification_push.service';

// To a specific user (all their subscribed devices), within a tenant
await PushService.sendToUser(tenantId, userId, {
  title: 'New message',
  body: 'You have a new message from Alice.',
  url: '/messages',
});

// To all ACTIVE members with a given tenant role
await PushService.sendToRole(tenantId, 'ADMIN', {
  title: 'Action required',
  body: 'A new member needs approval.',
});
```

---

## Browser-Side Subscription

On the client, subscribe using the standard `PushManager` API and POST the serialized `PushSubscription` (`{ endpoint, keys: { p256dh, auth } }`) to `POST /tenant/[tenantId]/api/notifications/push/subscribe`. Unsubscribe with `DELETE` on the same path.

---

## Caching

Per-user subscription lists are cached in Redis under `push_subscription:{tenantId}:{userId}` (TTL = `SESSION_CACHE_TTL`, default 1800s, falling back to `60 * 5` only if the env value is unset). Only `getSubscriptionsForUser` / `sendToUser` read from the cache — the transactional hot path. Bulk paths (`sendToUsers`, `sendToRole`, `sendToAll`) read straight from the DB because they aren't repeated lookups.

Invalidation:
- `subscribe` clears cache for the new owner (and the previous owner if the endpoint moves between users)
- `unsubscribe` and `unsubscribeByEndpoint` clear cache
- `410`/`404` cleanup inside `sendToSubscription` (expired browser subscription) clears cache for the affected user

TTL is jittered (`jitter`) and reads are wrapped in in-process single-flight (`singleFlight`).

---

## Settings

This module reads **no per-tenant settings**. VAPID signing is platform-global and configured via env only (see *Tenant Variability*):

| Env var | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key advertised to browsers for subscription. | — |
| `VAPID_PRIVATE_KEY` | VAPID private key used to sign every push. | — |
| `VAPID_CONTACT_EMAIL` | `mailto:` contact sent to push services. | `info@example.com` |
| `SESSION_CACHE_TTL` | Reused as the per-user subscription cache TTL (seconds). | `1800` |

Generate a VAPID key pair with:

```bash
npx web-push generate-vapid-keys
```

Expired subscriptions are cleaned up automatically on send failure (`410 Gone` / `404 Not Found`).

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

notification_push stores and sends Web Push (VAPID) notifications with subscriptions held per real tenant in the tenant DB, but signs with platform-global VAPID credentials and reads no per-tenant settings.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `PushSubscription` | `push_subscriptions` | userId, endpoint, p256dh, auth |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `notification_push.service.ts` — Every read/write resolves tenantDataSourceFor(tenantId), so subscriptions are isolated per tenant; the same browser endpoint registered under tenant A is invisible to tenant B (composite unique on tenantId+endpoint). All send variants (sendToUser, sendToUsers, sendToAll, sendToRole) filter PushSubscription rows by tenantId, so audiences differ per tenant.
- `notification_push.service.ts:sendToRole` — Role broadcast resolves recipients from the tenant-scoped TenantMember table (memberRole + memberStatus='ACTIVE'), so which users receive a role/admin push depends on each tenant's own membership and role assignments rather than a global user role.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| VAPID signing credentials and contact email are globally hardcoded from env (single key pair for the whole platform). | `notification_push.service.ts:ensureVapid / vapidInitialised` | A tenant cannot send push from its own VAPID application identity / sender; all tenants share one key pair and one mailto contact, and ensureVapid() initialises once process-wide with no tenant awareness. notification_mail already declares vapidPublicKey/vapidPrivateKey setting keys that this service never reads, signalling these were meant to be tenant-configurable. | `vapidPrivateKey` |
| No per-tenant on/off switch for push; the service always attempts delivery if global VAPID env is set. | `notification_push.service.ts:ensureVapid (no enabled gate)` | A tenant cannot disable Web Push for its workspace; notification_mail declares a pushNotificationsEnabled key that is never consulted here, so the capability is effectively all-or-nothing at the platform level. | `pushNotificationsEnabled` |
| Admin broadcast role is hardcoded to the literal 'ADMIN'. | `notification_push.service.ts:sendToAdmins` | Which member role should receive admin-level pushes may differ per tenant (e.g. OWNER, MANAGER); the string is fixed in code rather than configurable per tenant. | `pushAdminRole` |
| Push subscription cache TTL is a single global constant derived from SESSION_CACHE_TTL. | `notification_push.service.ts:PUSH_CACHE_TTL` | Tenants with very different subscription churn could benefit from different freshness/caching windows, but the TTL is fixed for all tenants. Likely intentionally global infra tuning, so low priority. | `pushSubscriptionCacheTtl` |

### Platform/root-only settings (not per-tenant)

Configured once at the root tenant; identical for all tenants:

- `VAPID_PRIVATE_KEY` — Platform-wide VAPID private key used to sign every Web Push message (env-only, set once in env.service.ts; never per-tenant).
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — Platform-wide VAPID public key advertised to all browsers for subscription (env-only).
- `VAPID_CONTACT_EMAIL` — mailto: contact identity sent to push services for all tenants (env-only, falls back to info@example.com).
- `SESSION_CACHE_TTL` — Global Redis cache TTL reused for caching per-user push subscriptions (env-only, falls back to 300s).

---

## Dependencies

Requires `db` and `env` (per `module.json`). Also uses `redis` (caching, jitter, single-flight), `logger`, `web-push`, and reads `TenantMember` from `tenant_member` for role broadcasts.
