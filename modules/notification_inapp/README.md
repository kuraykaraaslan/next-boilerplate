# Notification Inapp Module

Real-time in-app notification feed backed by Redis. Stores per-user notifications in a hash (capped, TTL'd), tracks read status in a separate set, streams new items over Redis pub/sub (SSE), and auto-fans-out to push notifications. Fully tenant-scoped: `tenantId` is embedded in every Redis key and channel.

---

## Files

| File | Purpose |
|---|---|
| `notification_inapp.service.ts` | Core: push/broadcast, list, read/unread, delete, Redis storage + pub/sub |
| `notification_inapp.types.ts` | `Notification` (Zod `NotificationSchema`) and `NotificationPayload` |
| `notification_inapp.messages.ts` | `NotificationInAppMessages` enum of message string keys |
| `notification_inapp.service.test.ts` | Service unit tests |

---

## Notification Shape

Validated by `NotificationSchema` (Zod) in `notification_inapp.types.ts`:

```typescript
type Notification = {
  notificationId: string;  // uuid
  title: string;
  message: string;
  path?: string | null;    // link to navigate on click
  isRead: boolean;         // resolved from the read-set at read time
  createdAt: string;       // ISO datetime
};

type NotificationPayload = Pick<Notification, "title" | "message" | "path">;
```

---

## Service / Responsibilities

`NotificationInAppService` (all methods are `static` and take `tenantId` first):

| Method | Responsibility |
|---|---|
| `push(tenantId, userId, data)` | Create a notification, store it, trim to cap, publish to pub/sub, and fire a push notification. Returns the created `Notification`. |
| `pushToUsers(tenantId, userIds[], data)` | `push` to an explicit list of users. |
| `pushToRole(tenantId, role, data)` | Push to every `ACTIVE` `TenantMember` with the given `memberRole` (resolved from the tenant DB). |
| `pushToAdmins(tenantId, data)` | `pushToRole` with role `ADMIN`. |
| `pushToAll(tenantId, data)` | Push to every `ACTIVE` member of the tenant. Single-tenant by design — no cross-tenant broadcast. |
| `getAll(tenantId, userId)` | Read the inbox hash, merge read state from the read-set, return newest-first. |
| `unreadCount(tenantId, userId)` | Count notifications not in the read-set. |
| `markAsRead(tenantId, userId, notificationId)` | Add one id to the read-set. |
| `markAllAsRead(tenantId, userId)` | Add all current ids to the read-set. |
| `deleteOne(tenantId, userId, notificationId)` | Remove one id from both inbox hash and read-set. |
| `clearAll(tenantId, userId)` | Delete the entire inbox hash and read-set. |
| `channel(tenantId, userId)` | Pub/sub channel name for the user (used by the SSE route). |
| `createSubscriber()` | Open a dedicated Redis connection for subscribing (SSE). |

On every `push`, `NotificationPushService.sendToUser(tenantId, userId, { title, body, url })` is invoked fire-and-forget (failures swallowed) so the in-app write never depends on the push pipeline.

---

## Storage

- Inbox hash: `notifications:{tenantId}:{userId}` — one field per notification (keyed by `notificationId`), `7-day` TTL refreshed on each push.
- Read-set: `notifications_read:{tenantId}:{userId}` — set of read `notificationId`s, same TTL. `isRead` is derived from this set at read time, not stored on the notification.
- Pub/sub channel: `notifications:tenant:{tenantId}:user:{userId}` — each push is published here; the SSE route subscribes per connection.
- Cap: the inbox is trimmed to the newest `MAX_PER_USER` (50) entries on each push; the oldest are `HDEL`'d.

---

## API Routes (tenant-scoped, authenticated user)

All routes resolve the caller via `TenantSessionNextService.authenticateTenantByRequest` and act on that user's tenant-scoped inbox. Mutating/listing routes are rate-limited via `Limiter.checkRateLimit`.

| Method | Path | Description |
|---|---|---|
| GET | `/tenant/[tenantId]/api/auth/me/notifications` | List the caller's notifications (newest first). |
| DELETE | `/tenant/[tenantId]/api/auth/me/notifications` | Clear the entire inbox. |
| GET | `/tenant/[tenantId]/api/auth/me/notifications/stream` | SSE stream of new notifications (subscribes to the tenant-scoped channel; `force-dynamic`, Node runtime, keep-alive ping every 25s). |
| PUT | `/tenant/[tenantId]/api/auth/me/notifications/read-all` | Mark all notifications as read. |
| PUT | `/tenant/[tenantId]/api/auth/me/notifications/[notificationId]` | Mark one notification as read. |
| DELETE | `/tenant/[tenantId]/api/auth/me/notifications/[notificationId]` | Remove one notification. |

---

## Sending a Notification

```typescript
import NotificationInAppService from '@/modules/notification_inapp/notification_inapp.service';

// To a single user (tenantId is required and partitions storage + delivery):
await NotificationInAppService.push(tenantId, userId, {
  title: 'Invitation accepted',
  message: 'John Doe joined your workspace.',
  path: `/tenant/${tenantId}/admin/members`,
});

// Broadcast to a role or the whole tenant:
await NotificationInAppService.pushToAdmins(tenantId, {
  title: 'New signup',
  message: 'A new member is awaiting approval.',
});
```

---

## Settings

This module exposes **no per-tenant configurable settings**. Its limits (`MAX_PER_USER`, `TTL`) are hardcoded static globals on the service.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A Redis-backed in-app notification feed (inbox hash, read-set, pub/sub) that is fully tenant-scoped by embedding tenantId in every Redis key and channel, but exposes no per-tenant configurable settings — its limits are hardcoded globals.

### Per-tenant behavior

- `notification_inapp.service.ts` — All Redis storage and delivery is partitioned by tenantId: inbox hash `notifications:{tenantId}:{userId}`, read-set `notifications_read:{tenantId}:{userId}`, and pub/sub channel `notifications:tenant:{tenantId}:user:{userId}` (notifKey/readKey/channel helpers, lines 21-26). The same userId in tenant A can never read tenant B's notifications.
- `notification_inapp.service.ts:pushToRole/pushToAll` — Audience resolution is per-tenant: it opens the tenant DB via tenantDataSourceFor(tenantId) and queries the TenantMember repository filtered by tenantId/memberRole/memberStatus, so broadcasts (pushToRole, pushToAdmins, pushToAll) target only that tenant's active members — there is no cross-tenant broadcast by design.
- `notification_inapp.service.ts:push` — On every push it fires NotificationPushService.sendToUser(tenantId, userId, ...) (line 65), fanning out to the per-tenant push-notification pipeline (which itself resolves provider/keys per tenant).

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Per-user notification retention cap is a hardcoded global of 50 | `notification_inapp.service.ts:MAX_PER_USER` | Defined as `static MAX_PER_USER = 50` (line 28) and applied in push() when trimming the oldest entries (lines 54-60). Identical for every tenant; a higher-tier tenant might warrant a larger inbox. Plausibly a per-tenant setting, but could also be argued as shared infra sizing. | `inAppMaxPerUser` |
| Notification TTL is a hardcoded global of 7 days | `notification_inapp.service.ts:TTL` | Defined as `static TTL = 7 * 24 * 60 * 60` (line 29) and used on every redis.expire for both inbox and read-set (lines 51, 139, 147). Retention duration is uniform across tenants; tenants may want different retention windows, so it is a reasonable per-tenant candidate. | `inAppRetentionSeconds` |

---

## Dependencies

- `@/modules/redis` — storage (hash, set), `expire`, pub/sub, and dedicated subscriber connections.
- `@/modules/db` (`tenantDataSourceFor`) + `@/modules/tenant_member` (`TenantMember`) — audience resolution for role/all broadcasts.
- `@/modules/notification_push` (`NotificationPushService`) — push fan-out on every `push`.
- `@/modules_next/tenant_session` + `@/modules_next/limiter` — auth and rate limiting in the API routes.

Declared in `module.json`: `requires: ["db", "user"]`.
