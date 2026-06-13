# Good to Have — Notification Mail

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Per-Tenant Branding & Identity

### ✅ Per-Tenant Sender Identity (From Email / Name)
**Why:** `MAIL_FROM` is a static global built from `env.MAIL_FROM`/`APPLICATION_NAME`; the `fromEmail` and `fromName` settings keys exist and are seeded per tenant but are never read, so every tenant sends mail from the same platform address.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant should appear as the sender of its own emails (e.g. "Acme Corp <noreply@acme.example>") rather than the platform brand; this is the most common white-label requirement.
**Multi-country relevance:** Some countries require the sender domain to match a locally registered brand (e.g. consumer protection laws); per-tenant From identity lets each tenant configure a compliant sender address.

### ✅ Per-Tenant Mail Provider Selection
**Why:** `DEFAULT_PROVIDER` is set once from `env.MAIL_PROVIDER`; the `mailProvider` setting key is declared and seeded per tenant but `getProvider()` never calls `SettingService.getValue(tenantId, 'mailProvider')`, so tenant admin selections have no effect.
**Complexity:** Low
**Multi-tenant relevance:** Different tenants may have existing contracts with different providers (SendGrid vs SES); reading the per-tenant `mailProvider` setting before the env default respects each tenant's explicit choice.
**Multi-country relevance:** Providers have different regional latencies and compliance certifications; EU tenants may mandate EU-hosted SES or Mailgun-EU while US tenants use us-east-1 SES.

### Per-Tenant Branding Template Variables (App Name, Links, Support Email)
**Why:** `getBaseTemplateVars()` builds all template variables from static env-derived constants, so every tenant's emails show the same app name, logo, and support address regardless of their own brand settings.
**Complexity:** Medium
**Multi-tenant relevance:** White-label SaaS requires each tenant's emails to look like they come from the tenant's product, not the underlying platform.
**Multi-country relevance:** Support email addresses, privacy policy links, and terms links differ by country of operation; per-tenant vars allow each deployment region to embed its own legal URLs.

### Per-Tenant Admin Notification Recipient
**Why:** `sendContactFormAdminEmail` routes all contact submissions to `env.INFORM_MAIL` — a single platform-wide address; the `adminNotificationEmail` setting key exists but is not read.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant should receive its own users' contact messages; routing all tenants' contact form submissions to one inbox leaks cross-tenant user data.
**Multi-country relevance:** Tenants operating in different countries may have local support teams; per-tenant admin email enables regional routing of support requests.

---

## Localization / i18n

### Multi-Language Email Templates
**Why:** All EJS templates are English-only; there is no mechanism to select a template variant or interpolate translated strings based on recipient locale or tenant locale setting.
**Complexity:** High
**Multi-tenant relevance:** Tenants serving non-English markets need localized transactional emails; a per-tenant default locale with per-user override is the minimum viable i18n strategy.
**Multi-country relevance:** EU law (ePrivacy Directive) and some national consumer protection regulations require communications in the recipient's language; sending English-only OTP emails to German users creates legal and UX risk.

### RTL Layout Support in Email Templates
**Why:** The `email_layout.ejs` has no `dir="rtl"` support; Arabic, Hebrew, Farsi, and Urdu users receive email with text flowing left-to-right, which is visually broken and reduces click-through.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants serving MENA or Israeli markets need RTL email as a baseline; a per-tenant `locale` setting that includes directionality covers the requirement.
**Multi-country relevance:** Arabic-speaking markets span 22+ countries; RTL support is a market-entry prerequisite for any platform targeting the Middle East or North Africa.

### Locale-Aware Date and Number Formatting in Templates
**Why:** Template variables such as `loginTime`, `expiryDays`, and invoice amounts are passed as pre-formatted strings with no locale awareness; a German user sees "June 11, 2026" instead of "11. Juni 2026".
**Complexity:** Low
**Multi-tenant relevance:** Tenants can expose a locale setting; the template-var builder can format dates/numbers using `Intl.DateTimeFormat` with the tenant's locale code before injecting into templates.
**Multi-country relevance:** Currency, decimal separator, and date order conventions differ per country; hard-coded English formatting alienates non-English markets.

---

## Reliability & Failover

### ✅ Automatic Provider Failover with Configurable Priority Order
**Why:** `getProvider()` walks `PROVIDER_MAP` insertion order on failure, which is arbitrary; there is no per-tenant priority list or health-aware selection, so failover may choose a provider worse than the one that failed.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant may have different provider contracts; a configurable priority list (e.g. `ses → sendgrid → smtp`) per tenant ensures failover respects cost and reliability preferences.
**Multi-country relevance:** Regional provider outages (SES us-east-1 degradation) should trigger failover to a healthy regional provider, not necessarily the first in a static map.

### ✅ BullMQ Retry Policy with Exponential Back-off
**Why:** The `mailQueue` worker has no explicit `attempts`, `backoff`, or `removeOnFail` configuration; a single transient provider error permanently fails the job with no retry.
**Complexity:** Low
**Multi-tenant relevance:** High-SLA tenants may require guaranteed delivery with configurable retry limits; lower-tier tenants can use the default single attempt.
**Multi-country relevance:** Some regional mail providers (especially in emerging markets) have higher transient failure rates; automatic retries with back-off reduce manual intervention.

### Dead Letter Queue / Permanent Failure Handling
**Why:** Failed jobs have no dead-letter destination; there is no mechanism to inspect, requeue, or alert on permanently failed mail jobs beyond `Logger.error` in the `failed` worker event.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants expect a way to replay dropped transactional emails (e.g. a missed invoice); a dead-letter queue per tenant is the standard pattern.
**Multi-country relevance:** Delivery failures in certain markets (e.g. corporate mail filters in Japan or South Korea) tend to be systematic; surfacing them in a dead-letter queue enables bulk-replay after provider reconfiguration.

### SMTP Transporter Cache Invalidation
**Why:** `SMTPProvider` caches one nodemailer transporter per tenant forever; if a tenant updates their SMTP credentials via `SettingService`, the stale transporter continues to use old credentials until the process restarts.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins regularly rotate credentials; stale cached transporters cause silent delivery failures with no error until restart.
**Multi-country relevance:** Tenants migrating between regional SMTP servers (e.g. from a US relay to an EU-hosted relay for GDPR compliance) cannot self-serve without operator intervention.

---

## Template Management

### Missing Contact Form Templates
**Why:** `sendContactFormAdminEmail` and `sendContactFormUserEmail` reference `contact_form_admin.ejs` and `contact_form_user.ejs`, which do not exist in `templates/`; these helpers fail at render time in production.
**Complexity:** Low
**Multi-tenant relevance:** Contact form notifications are a basic tenant feature used by most SaaS products; the missing templates block any tenant that enables the contact module.
**Multi-country relevance:** Contact form auto-replies are legally required in some jurisdictions (e.g. Germany's consumer communication laws); the missing templates create compliance risk.

### Per-Tenant Custom Email Template Override
**Why:** Templates are global EJS files on disk; a tenant cannot override the welcome email body or the invoice layout without changing shared files that affect all tenants.
**Complexity:** High
**Multi-tenant relevance:** White-label tenants want their own email copy, logo placement, and color scheme without operator involvement; a DB-backed template override per tenant (keyed by `tenantId + templateName`) enables self-service customization.
**Multi-country relevance:** Legal disclaimers, unsubscribe language, and footer content must vary by country; DB-backed templates let each tenant (or the platform for a region) maintain compliant copy independently.

### Template Preview / Test Send Route
**Why:** There is no route to render a template with sample data and preview it or send a test copy to a given address; developers and tenant admins must modify production flows to verify template changes.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins updating email settings (provider switch, From address change) need to send a test email from within the admin UI without triggering a real event.
**Multi-country relevance:** Template authors working on localized variants need to preview RTL or non-Latin character rendering before publishing; a test-send route with locale override parameter enables this.

---

## Compliance & GDPR

### Unsubscribe Link / Opt-Out Mechanism
**Why:** None of the email templates include an unsubscribe link; commercial and marketing emails without opt-out mechanisms are illegal in the EU (ePrivacy Directive), US (CAN-SPAM), Canada (CASL), and Australia (Spam Act).
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant manages its own subscriber list; unsubscribe state must be tenant-scoped and honored before enqueuing, not just at the template level.
**Multi-country relevance:** Opt-out requirements and the definition of "commercial email" differ by country; a generic one-click unsubscribe token mechanism is the minimum safe default for multi-country deployment.

### Bounce / Complaint Webhook Handler
**Why:** Providers (SES, SendGrid, Mailgun) send webhook callbacks for hard bounces, spam complaints, and unsubscribes; without handlers these events are ignored, leading to continued sends to invalid addresses and ISP reputation damage.
**Complexity:** Medium
**Multi-tenant relevance:** Bounce rates are per-tenant (tenant A's bad list does not damage tenant B's sender reputation); handling bounces per tenant keeps each tenant's reputation independent.
**Multi-country relevance:** ISPs in different countries have different bounce and spam thresholds; EU providers (Mailgun EU, SES eu-west-1) may send different webhook formats requiring region-aware handlers.

### Email Quota Overage Handling and Notification
**Why:** When a tenant exceeds `feature_email_monthly_quota` the `sendMail` call is silently swallowed by a `catch` in the enqueue path, and the tenant receives no warning that their emails are being dropped.
**Complexity:** Low
**Multi-tenant relevance:** Tenants need to know when they are near or at quota so they can upgrade their plan; silent dropping damages trust and causes missed transactional emails.
**Multi-country relevance:** Quota enforcement ensures fair use across all tenants globally; over-consuming tenants in one region should not silently degrade service.

### `smtpEncryption` Setting Wire-Up
**Why:** The `smtpEncryption` key is declared in `EmailSettingKeySchema` and visible in the settings UI but is never read by `smtp.provider.ts`, which only reads `smtpSecure`; a tenant configuring `smtpEncryption` has no effect.
**Complexity:** Low
**Multi-tenant relevance:** SMTP encryption mode is a per-tenant SMTP configuration concern; wiring it in or removing the dead key prevents misleading tenant admins.
**Multi-country relevance:** Some regional SMTP relays mandate STARTTLS vs TLS vs SSL explicitly; without this setting being honored, tenants using those regional relays cannot connect.
