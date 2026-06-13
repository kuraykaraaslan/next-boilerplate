# Good to Have — In-App Notifications

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Notification Schema & Typing

### ✅ Notification Type / Category Field
**Why:** Without a `type` field (e.g. `info`, `warning`, `error`, `success`) the UI cannot render contextual icons or color-code notifications; callers embed semantics in free-text which breaks i18n.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's UI shell can apply its own color scheme or icon set per type.
**Multi-country relevance:** Category codes are locale-neutral; translated labels are rendered by the UI layer, keeping the stored payload language-agnostic.

### ✅ Structured Action / CTA Field
**Why:** A `path` string is sufficient for simple navigation but cannot encode external URLs, parameterized actions (confirm/dismiss), or deep-link payloads needed by mobile/PWA consumers.
**Complexity:** Low
**Multi-tenant relevance:** Tenants may have different route structures; an `actions` array with `{ label, url, actionId }` lets each tenant configure its own CTA without changing the service.
**Multi-country relevance:** Action labels can be translated per locale at render time when they are stored as i18n keys rather than human-readable strings.

### ✅ Expiry / Scheduled Delivery Fields
**Why:** Notifications about time-sensitive events (flash sales, meeting reminders) should auto-expire; there is currently no `expiresAt` field and no cleanup beyond the flat 7-day TTL.
**Complexity:** Medium
**Multi-tenant relevance:** Premium tenants could earn longer notification lifetimes; expiry per notification enables per-notification SLA independent of the global TTL.
**Multi-country relevance:** Scheduling delivery at a user's local time (e.g. "notify at 9 AM Europe/Istanbul") requires storing a target delivery time with time-zone metadata.

---

## Retention & Capacity

### ✅ Per-Tenant Configurable Retention Cap and TTL
**Why:** `MAX_PER_USER = 50` and `TTL = 7 days` are hardcoded globals; a higher-tier tenant or enterprise customer may need 200 notifications retained for 30 days.
**Complexity:** Low
**Multi-tenant relevance:** Retention is a natural plan differentiator; reading `inAppMaxPerUser` and `inAppRetentionSeconds` from `SettingService` per tenant makes these plan-gated features without code changes.
**Multi-country relevance:** Regulations in some jurisdictions require notification records to be kept for auditing; a tenant serving those markets could increase retention rather than relying on the audit log alone.

### Persistent / Database-Backed Inbox Option
**Why:** Redis is ephemeral — data is lost on a cold flush, and the 7-day TTL silently discards older notifications. Critical compliance notifications disappear with no recovery path.
**Complexity:** High
**Multi-tenant relevance:** Each tenant's inbox can be stored in its own DB schema (already the pattern for other tenant entities), giving true durability and enabling cross-device sync.
**Multi-country relevance:** Data-residency rules in the EU (GDPR) or Turkey (KVKK) require knowing where personal data is stored; DB-backed storage makes the data location deterministic, unlike Redis.

---

## Delivery Controls & User Preferences

### ✅ Per-User Notification Preference / Opt-Out
**Why:** Users have no way to mute specific notification types or opt out of in-app notifications entirely; silence must be implemented by callers today.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant may expose different notification categories to users; preference keys must be namespaced `{tenantId}:{userId}:{category}` to avoid cross-tenant leakage.
**Multi-country relevance:** GDPR Article 21 grants users the right to object to processing; an opt-out mechanism backed by per-user preferences supports compliance without legal ambiguity.

### ✅ Push Fan-Out Toggle per Notification
**Why:** Every `push()` always fires a Web Push notification via `NotificationPushService`. Some in-app notifications are low-priority (activity feed items) and should not also trigger a browser push.
**Complexity:** Low
**Multi-tenant relevance:** Tenant plan or feature flags could gate push fan-out so lower-tier tenants do not generate push traffic they haven't paid for.
**Multi-country relevance:** Some users in high-latency regions prefer not to receive push on slow connections; an explicit opt-in/opt-out on the notification payload supports this without changing the service.

### ✅ Quiet Hours / Do-Not-Disturb Awareness
**Why:** Notifications published via pub/sub are delivered immediately regardless of user locale or time of day; there is no mechanism to delay non-urgent notifications outside the user's waking hours.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admins may want to restrict broadcast windows (e.g. no midnight pushes for their workforce product).
**Multi-country relevance:** A user in Tokyo and a user in New York share the same notification timestamp; quiet-hours logic requires storing and respecting each user's IANA time zone.

---

## Localization / i18n

### Localized Notification Payload
**Why:** `title` and `message` are stored as plain strings in the tenant's active language at push time; users who later switch language see stale translations.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant-level locale settings should determine the default notification language, with per-user override.
**Multi-country relevance:** A platform deployed across multiple countries must push notifications in each user's preferred locale; storing i18n keys with interpolation parameters instead of resolved strings allows deferred rendering.

---

## Observability & Admin

### Delivery Audit Integration (Write to notification_log)
**Why:** The entity comment on `notification_log` marks `inapp` log writes as "future"; currently no row is written when an in-app notification is pushed, so the unified audit log is incomplete.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's admin dashboard already queries `notification_log` by channel; adding `inapp` rows gives admins a unified delivery history without a separate UI.
**Multi-country relevance:** Regulatory audit trails (GDPR, LGPD) require provable delivery records; a database row is more reliable than ephemeral Redis state.

### Tenant-Level Notification Analytics
**Why:** There is no aggregated view of delivery volume, unread rates, or read latency per tenant; platform operators cannot see which tenants are heavy consumers or which notifications go unread.
**Complexity:** Medium
**Multi-tenant relevance:** Per-tenant metrics are the core deliverable; isolating counters by `tenantId` in a time-series store or the existing `tenant_usage` table makes billing and capacity planning possible.
**Multi-country relevance:** Analytics can reveal regional patterns (e.g. low read rates in a specific country), enabling A/B testing of notification copy per locale.

---

## Real-Time & Scalability

### SSE Fan-Out via Redis Pub/Sub at Scale
**Why:** Each SSE connection holds a dedicated Redis subscriber connection; at 10,000 concurrent users this creates 10,000 Redis connections, which is unsustainable.
**Complexity:** High
**Multi-tenant relevance:** High-volume tenants can crowd out smaller tenants' subscriber connections; a multiplexed fan-out layer (one connection per server instance, dispatching internally) isolates resource consumption.
**Multi-country relevance:** Geographically distributed deployments need regional Redis clusters; the current single-channel model assumes one Redis instance.

### WebSocket / Long-Poll Fallback
**Why:** SSE is not supported in all corporate proxy environments and has limited support in some older browsers common in certain markets; users behind strict firewalls silently miss real-time updates.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants often operate behind restrictive proxies; offering a long-poll fallback ensures all tenant users receive notifications.
**Multi-country relevance:** Certain regional networks block SSE; a transport negotiation layer (SSE → long-poll) improves reliability in markets like China or behind corporate NATs.
