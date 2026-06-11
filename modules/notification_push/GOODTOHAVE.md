# Good to Have — Notification Push

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Per-Tenant VAPID Configuration

### Per-Tenant VAPID Keys
**Why:** A single platform-wide VAPID key pair signs every Web Push for every tenant; the `vapidPublicKey`/`vapidPrivateKey` setting keys are declared in `notification_mail.setting.keys.ts` but never read by this module, so no tenant can send push from its own application identity.
**Complexity:** Medium
**Multi-tenant relevance:** VAPID identity is the sender identity for Web Push; white-label tenants appear to their users as the platform, not their own brand — the same problem mail has with the shared From address.
**Multi-country relevance:** Some enterprise deployments require push notifications to originate from a domain controlled by the tenant's legal entity; per-tenant VAPID keys are the only way to satisfy this.

### Per-Tenant Push Notifications Enable/Disable Toggle
**Why:** Push delivery always attempts as long as global VAPID env vars are set; the `pushNotificationsEnabled` setting key is declared but never consulted, so tenants cannot disable Web Push for their workspace.
**Complexity:** Low
**Multi-tenant relevance:** Some tenants (e.g. B2B SaaS for corporate environments where push is blocked by IT policy) need a hard disable switch so the service does not log hundreds of delivery errors for their users.
**Multi-country relevance:** Corporate IT policies in certain countries (Germany, Japan) often block Web Push at the network level; a per-tenant disable flag prevents phantom errors and usage noise.

---

## Delivery Tracking & Reliability

### Audit Log Integration (Write to notification_log)
**Why:** The `notification_log` entity comment marks `push` as "future"; no `NotificationLogService.log()` call exists in this module, so push delivery attempts are invisible in the unified audit log.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admin dashboards already query the `notification_log` table by channel; adding `push` rows gives a complete delivery picture without a separate UI component.
**Multi-country relevance:** Audit completeness matters for compliance in regulated markets; a gap in the audit log for push events creates a documentation hole for GDPR Data Protection Impact Assessments.

### BullMQ Queue for Push Delivery (Async Fanout)
**Why:** `sendToAll` and `sendToRole` fan out with `Promise.allSettled` synchronously inside the request/inapp call path; for a tenant with 10,000 subscribers this blocks the caller for seconds.
**Complexity:** Medium
**Multi-tenant relevance:** Large tenants with many subscribers should not degrade smaller tenants' real-time notification delivery; async queuing decouples fanout volume from send latency.
**Multi-country relevance:** Push endpoints in different regions have variable response times; synchronous fanout in mixed-geography deployments creates unpredictable latency spikes.

### Subscription Health / Token Staleness Report
**Why:** Expired push endpoints are cleaned up lazily on send failure (410/404); there is no proactive scan or admin report showing the percentage of stale subscriptions per tenant.
**Complexity:** Low
**Multi-tenant relevance:** A tenant with 90% stale subscriptions wastes quota and generates log noise; a periodic staleness report per tenant enables proactive cleanup.
**Multi-country relevance:** Browser push token expiry rates differ by platform (Chrome, Firefox, Safari) and country (iOS market share vs Android); regional staleness trends inform infrastructure decisions.

---

## Notification Payload

### Rich Notification Payload Fields
**Why:** `PushPayload` only supports `{ title, body, icon?, url? }`; the Web Push API supports `badge`, `image`, `actions` (interactive buttons), `vibrate`, `tag` (deduplication), and `requireInteraction`.
**Complexity:** Low
**Multi-tenant relevance:** Different tenant verticals (e-commerce vs productivity) need different notification styles; action buttons on push can replace a separate in-app step.
**Multi-country relevance:** Some locales have cultural expectations around notification style (badge count conventions differ between iOS/Android markets); extensible payload fields allow market-specific tuning.

### Notification Deduplication via `tag`
**Why:** There is no deduplication mechanism; if `push()` fires twice for the same event (e.g. due to a BullMQ retry), the user sees two identical push notifications.
**Complexity:** Low
**Multi-tenant relevance:** Idempotent push delivery is especially important for tenant-wide broadcasts where a retry of `sendToAll` would spam all users.
**Multi-country relevance:** Network instability in certain regions causes more frequent retries; deduplication protects users in those markets from notification spam.

---

## User Control & Consent

### Granular Per-Category Subscription Preferences
**Why:** A user either has a push subscription or does not; there is no way to subscribe to "security alerts" but not "marketing updates"; all push notifications share one subscription record.
**Complexity:** Medium
**Multi-tenant relevance:** Different tenants offer different notification categories; a tenant admin should be able to define categories, and users should opt in per category.
**Multi-country relevance:** GDPR and ePrivacy Directive require explicit, granular consent for marketing communications; a category-level subscription model ensures non-marketing alerts (security, OTP) can still be delivered to users who declined marketing push.

### Explicit Push Permission / Consent Recording
**Why:** The `subscribe` endpoint upserts a `PushSubscription` row but records no user consent timestamp or consent context (which page, what was shown); this is unverifiable if a user disputes receiving push.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant has its own consent flow; recording `consentedAt`, `consentContext`, and `userAgent` per subscription lets tenants demonstrate per-tenant consent.
**Multi-country relevance:** GDPR Recital 32 requires consent to be "freely given, specific, informed, and unambiguous"; a stored consent record with timestamp and context is the evidence requirement.

### Quiet Hours / Time-Zone-Aware Delivery
**Why:** Push notifications are sent immediately regardless of user locale or time of day; a broadcast at 23:00 UTC hits Japanese users at 08:00 local time but Turkish users at 02:00 AM.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admins for workforce tools need to control broadcast windows to avoid disturbing employees outside business hours.
**Multi-country relevance:** A user's IANA time zone is needed to compute local time; storing and respecting `user.timezone` (e.g. from the user profile) before delivering is the minimal multi-country courtesy.

---

## Security

### Subscription Ownership Verification
**Why:** The `subscribe` endpoint trusts the `userId` from the session but does not verify the `endpoint` URL is a legitimate push service; a malicious client could register arbitrary endpoints to probe for valid push subscriptions.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's subscription table is isolated but the endpoint format is not validated; a per-tenant allowlist of known push service domains (fcm.googleapis.com, mozilla.com, etc.) is a low-cost hardening step.
**Multi-country relevance:** Some regions have country-specific push infrastructure (Huawei Push for China); validating against known push service domains helps detect spoofed endpoints.

### Push Subscription Limit per User
**Why:** There is no cap on how many `PushSubscription` rows a single user can create; a user could subscribe the same browser endpoint repeatedly, accumulating unlimited rows.
**Complexity:** Low
**Multi-tenant relevance:** Tenants hosting power-users with many devices benefit from an upper bound (e.g. 20 subscriptions per user per tenant) to prevent DB bloat.
**Multi-country relevance:** Mobile-first markets with high device turnover (users changing phones frequently) can generate many orphaned subscriptions; a per-user cap combined with LRU eviction keeps the table manageable.

---

## Observability

### Push Delivery Success Rate Metrics per Tenant
**Why:** There is no aggregated view of push delivery success vs failure rates per tenant; logging individual errors via `Logger` is not queryable for trend analysis.
**Complexity:** Medium
**Multi-tenant relevance:** Platform operators need to know which tenants have poor push delivery (e.g. 80% expired subscriptions) to proactively offer guidance or flag for cleanup.
**Multi-country relevance:** Push success rates differ by country due to browser distribution and network conditions; country-level metrics help identify deployment regions that need alternative channels.

### VAPID Contact Email per Tenant
**Why:** The `mailto:` contact sent to push services is hardcoded from `env.VAPID_CONTACT_EMAIL` (defaulting to `info@example.com`); push services use this to contact the sender on deliverability issues, so it should point to a real address.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant or the platform operator should have a monitored address registered; a single fallback pointing to `info@example.com` means deliverability notices go unread.
**Multi-country relevance:** Push service abuse reports go to the `mailto:` contact; in multi-country deployments with regional support teams, routing abuse notices to the right team requires a per-region or per-tenant contact address.
