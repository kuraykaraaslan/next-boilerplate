# Email Notifications

- **id:** `notification_mail`
- **tier:** notifications
- **version:** 1.0.0
- **dir:** `modules/notification_mail/`
- **tags:** notifications, email
- **icon:** `fas fa-envelope`
- **hasNextLayer:** false

Pluggable email sender (SMTP, SES, Mailgun, Postmark, Resend, SendGrid). EJS templates. BullMQ-backed queue.

## Dependencies

- **requires:** `redis`, `env`, `setting`

## Services

- `notification_mail.account-templates.service.ts`
- `notification_mail.service.ts`
- `notification_mail.templates.service.ts`

## Setting keys

- `notification_mail.setting.keys.ts`

## README

# Notification Mail Module

Queue-backed transactional email service. Renders EJS templates and delivers them through six pluggable providers (SMTP, SendGrid, Mailgun, AWS SES, Postmark, Resend), resolving each provider's credentials per-tenant from `SettingService` with `env` fallback, and gating sends per-tenant via subscription feature/quota checks. Supports both queued (BullMQ) and direct sending.

---

## Files

| File | Purpose |
|---|---|
| `notification_mail.service.ts` | `MailService` core: feature gating, queue + worker, template rendering, provider selection |
| `notification_mail.templates.service.ts` | `MailTemplatesService` — invoice + auth/OTP email helpers |
| `notification_mail.account-templates.service.ts` | `MailAccountTemplatesService` — account/security + tenant-invitation/contact email helpers |
| `notification_mail.template-vars.ts` | `getBaseTemplateVars()` shared by both template services |
| `notification_mail.setting.keys.ts` | `EmailSettingKeySchema` / `NotificationSettingKeySchema` setting-key constants |
| `providers/base.provider.ts` | Abstract `BaseMailProvider` contract (`sendMail`, `isConfigured`) + `MailOptions` / `MailResult` types |
| `providers/smtp.provider.ts` | SMTP via Nodemailer (per-tenant cached transporter) |
| `providers/sendgrid.provider.ts` | SendGrid HTTP API |
| `providers/mailgun.provider.ts` | Mailgun HTTP API (US/EU region) |
| `providers/ses.provider.ts` | AWS SES via signed (SigV4) HTTP request |
| `providers/postmark.provider.ts` | Postmark HTTP API (per-tenant cached client) |
| `providers/resend.provider.ts` | Resend HTTP API (per-tenant cached client) |
| `templates/*.ejs` | Email bodies (see *Templates*) |
| `templates/layouts/email_layout.ejs` | Outer HTML layout |
| `templates/partials/email_header.ejs`, `email_footer.ejs` | Shared header/footer partials |

This module has **no entities or tables of its own**. Delivery audit rows are written to `NotificationLog` (via `notification_log`) and the monthly send counter lives in `TenantUsage` (via `tenant_usage`).

---

## Services / Responsibilities

`MailService` (default export, static class):

- **Feature gating** — `assertMailFeatureAccess(tenantId)` asserts the tenant's active plan grants `feature_email_send` and is below `feature_email_monthly_quota` (compared against `TenantUsage.emailSends`). The root tenant is short-circuited and exempt. Re-asserted at both the enqueue (`sendMail` / `sendMailDirect`) and worker (`_sendMail`) boundaries so a long-queued job cannot bypass a plan downgrade.
- **Queue + worker** — BullMQ queue `mailQueue` with a worker at concurrency 5. `sendMail(...)` enqueues a job; the worker calls `_sendMail`.
- **Direct send** — `sendMailDirect(...)` bypasses the queue for urgent mail (still gated).
- **Provider selection** — `getProvider(tenantId, providerName?)` returns the requested (or `DEFAULT_PROVIDER`) provider only if `isConfigured(tenantId)`; otherwise it iterates `PROVIDER_MAP` and falls back to the first provider with credentials configured for that tenant. `listProviders(tenantId)` returns the configured/unconfigured status of every provider.
- **Template rendering** — `renderTemplate(name, data)` renders the body EJS, the header/footer partials, then wraps them in `layouts/email_layout.ejs`. `getBaseTemplateVars()` (in `notification_mail.template-vars.ts`) supplies the shared template variables (app name, frontend links, support email).

**Per-event helpers** (typed wrappers that render a template and enqueue; each catches and logs its own errors so a mail failure never throws into the caller) are split across two services:

- `MailTemplatesService` (`notification_mail.templates.service.ts`): `sendInvoiceIssuedEmail`, `sendInvoicePaidEmail`, `sendInvoicePaymentFailedEmail`, `sendWelcomeEmail`, `sendNewLoginEmail`, `sendForgotPasswordEmail`, `sendPasswordResetSuccessEmail`, `sendOTPEmail`, `sendOTPEnabledEmail`, `sendOTPDisabledEmail`.
- `MailAccountTemplatesService` (`notification_mail.account-templates.service.ts`): `sendEmailChangedEmail`, `sendVerifyEmail`, `sendPasswordChangedEmail`, `sendSuspiciousActivityEmail`, `sendNewDeviceAlertEmail`, `sendTenantInvitationEmail`, `sendContactFormAdminEmail`, `sendContactFormUserEmail`.

---

## Sending an Email

```typescript
import MailService from '@/modules/notification_mail/notification_mail.service';

// Queue (recommended) — worker resolves the tenant's provider config when it runs
await MailService.sendMail(tenantId, 'user@example.com', 'Welcome!', html);

// Direct (urgent) — returns the MailResult
const result = await MailService.sendMailDirect(tenantId, 'user@example.com', 'Subject', html);

// Or use a typed per-event helper (renders the template for you)
await MailTemplatesService.sendWelcomeEmail({ tenantId, email: 'user@example.com', name: 'Alice' });
```

---

## Providers

Six providers behind the `BaseMailProvider` contract, registered in `PROVIDER_MAP`: `smtp`, `sendgrid`, `mailgun`, `ses`, `postmark`, `resend`.

- The starting provider is `DEFAULT_PROVIDER`, taken from `env.MAIL_PROVIDER` (fallback `smtp`).
- Each provider resolves its credentials per-tenant from `SettingService.getValue(tenantId, ...)` with an `env.*` fallback (see *Settings* and *Tenant Variability*), so different tenants can send through different provider accounts/regions.
- If the selected provider is not configured for a tenant, `getProvider` falls back to the first configured provider for that tenant.

> Note: the per-tenant `mailProvider` setting key exists but is **not** read by the service today — provider choice is driven by `env.MAIL_PROVIDER` plus the credential-presence fallback loop (see *Tenant Variability → Candidates*).

---

## Templates

EJS templates under `templates/`. Each is rendered inside `layouts/email_layout.ejs` with the `partials/email_header.ejs` and `partials/email_footer.ejs` partials.

| Template | Used by |
|---|---|
| `welcome.ejs` | `sendWelcomeEmail` |
| `new_login.ejs` | `sendNewLoginEmail` |
| `forgot_password.ejs` | `sendForgotPasswordEmail` |
| `password_reset.ejs` | `sendPasswordResetSuccessEmail` |
| `password_changed.ejs` | `sendPasswordChangedEmail` |
| `verify_email.ejs` | `sendVerifyEmail` |
| `otp.ejs` | `sendOTPEmail` |
| `otp_enabled.ejs` | `sendOTPEnabledEmail` |
| `otp_disabled.ejs` | `sendOTPDisabledEmail` |
| `email_change.ejs` | `sendEmailChangedEmail` |
| `new_device_alert.ejs` | `sendNewDeviceAlertEmail` |
| `suspicious_activity.ejs` | `sendSuspiciousActivityEmail` |
| `tenant_invitation.ejs` | `sendTenantInvitationEmail` |
| `invoice_issued.ejs` | `sendInvoiceIssuedEmail` |
| `invoice_paid.ejs` | `sendInvoicePaidEmail` |
| `invoice_payment_failed.ejs` | `sendInvoicePaymentFailedEmail` |

> `sendContactFormAdminEmail` / `sendContactFormUserEmail` reference `contact_form_admin.ejs` / `contact_form_user.ejs`, which are **not** present in `templates/`. Those helpers will fail at render time until the templates are added.

### Adding a New Template

1. Create `templates/<name>.ejs`.
2. Render it via `MailService.renderTemplate('<name>.ejs', { ...getBaseTemplateVars(), ...data })` (import `getBaseTemplateVars` from `notification_mail.template-vars`).
3. Enqueue with `MailService.sendMail(tenantId, to, subject, html)` (or add a typed helper).

---

## Settings

All keys are read **per-tenant** via `SettingService.getValue(tenantId, ...)` with an `env.*` fallback so the platform works out of the box. Defined in `notification_mail.setting.keys.ts` (`EmailSettingKeySchema` → `EMAIL_KEYS`).

| Group | Keys |
|---|---|
| Routing / sender | `mailProvider`, `fromEmail`, `fromName` |
| SMTP | `smtpHost`, `smtpPort`, `smtpUsername`, `smtpPassword`, `smtpEncryption`, `smtpSecure` |
| SendGrid | `sendgridApiKey` |
| Mailgun | `mailgunApiKey`, `mailgunDomain`, `mailgunRegion` |
| AWS SES | `awsSesAccessKeyId`, `awsSesSecretAccessKey`, `awsSesRegion` |
| Postmark | `postmarkApiKey` |
| Resend | `resendApiKey` |

A second enum, `NotificationSettingKeySchema` (`NOTIFICATION_KEYS`), declares system-level notification keys (`pushNotificationsEnabled`, `vapidPublicKey`, `vapidPrivateKey`, `emailOnNewUser`, `emailOnNewComment`, `emailOnNewOrder`, `emailOnNewContact`, `slackWebhookUrl`, `slackNotificationsEnabled`, `adminNotificationEmail`). These are not consumed by `MailService`.

> The `mailProvider`, `fromEmail`, `fromName`, and `smtpEncryption` keys are **declared but not yet read** by the service/providers — see *Tenant Variability → Candidates*.

---

## Usage tracking & audit

`_sendMail` (the BullMQ worker target) records every delivery attempt:

- On `result.success === true`:
  - `TenantUsageService.incrementEmailSends(tenantId, 1)` → updates the monthly `emailSends` quota counter.
  - `NotificationLogService.log(tenantId, 'mail', to, 'sent', { subject, provider, providerMessageId })` → audit row.
- On provider error / `result.success === false`:
  - `NotificationLogService.log(tenantId, 'mail', to, 'failed', { subject, provider, error })` → audit row.

Audit/usage writes are best-effort and never block mail delivery.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A queue-backed transactional email module that sends templated mail through six pluggable providers, resolving each provider's credentials per-tenant from SettingService (with env fallback) and gating sends per-tenant via subscription feature/quota checks.

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `smtpHost` | string | — | tenant | SMTP server hostname; falls back to env.SMTP_HOST when unset | `smtp.provider.ts` |
| `smtpPort` | number | `587` | tenant | SMTP port; falls back to env.SMTP_PORT (587) | `smtp.provider.ts` |
| `smtpUsername` | string | — | tenant | SMTP auth username; falls back to env.SMTP_USER | `smtp.provider.ts` |
| `smtpPassword` | string | — | tenant | SMTP auth password; falls back to env.SMTP_PASS | `smtp.provider.ts` |
| `smtpSecure` | boolean | — | tenant | Whether SMTP uses TLS ('true'); also forced true when port is 465; falls back to env.SMTP_SECURE | `smtp.provider.ts` |
| `sendgridApiKey` | string | — | tenant | SendGrid API key for this tenant; falls back to env.SENDGRID_API_KEY | `sendgrid.provider.ts` |
| `mailgunApiKey` | string | — | tenant | Mailgun API key; falls back to env.MAILGUN_API_KEY | `mailgun.provider.ts` |
| `mailgunDomain` | string | — | tenant | Mailgun sending domain; falls back to env.MAILGUN_DOMAIN | `mailgun.provider.ts` |
| `mailgunRegion` | string | `us` | tenant | Mailgun region ('us'\|'eu') selecting the API base URL; falls back to env.MAILGUN_REGION | `mailgun.provider.ts` |
| `awsSesAccessKeyId` | string | — | tenant | AWS SES access key id; falls back to env.AWS_SES_ACCESS_KEY_ID/AWS_ACCESS_KEY_ID | `ses.provider.ts` |
| `awsSesSecretAccessKey` | string | — | tenant | AWS SES secret access key; falls back to env.AWS_SES_SECRET_ACCESS_KEY/AWS_SECRET_ACCESS_KEY | `ses.provider.ts` |
| `awsSesRegion` | string | `us-east-1` | tenant | AWS SES region forming the SES endpoint and SigV4 scope; falls back to env.AWS_SES_REGION/AWS_REGION | `ses.provider.ts` |
| `postmarkApiKey` | string | — | tenant | Postmark server token; falls back to env.POSTMARK_API_KEY | `postmark.provider.ts` |
| `resendApiKey` | string | — | tenant | Resend API key; falls back to env.RESEND_API_KEY | `resend.provider.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant).*

### Per-tenant behavior

- `smtp.provider.ts:resolveCreds/getTransporter` — Each tenant gets its own nodemailer transporter built from its own SMTP host/port/user/pass/secure settings; transporters are cached per tenantId so credentials never cross tenants.
- `sendgrid.provider.ts / mailgun.provider.ts / ses.provider.ts / postmark.provider.ts / resend.provider.ts:resolveCreds/getApiKey` — Each HTTP-API provider resolves its credentials (and Mailgun region / SES region base URL) from the requesting tenant's settings, so mail for different tenants is sent through different provider accounts/regions.
- `notification_mail.service.ts:getProvider` — Provider selection is tenant-aware: the requested/default provider is used only if provider.isConfigured(tenantId) is true; otherwise it iterates PROVIDER_MAP and falls back to the first provider that has credentials configured for THAT tenant, so the effective sending provider can differ per tenant.
- `notification_mail.service.ts:listProviders` — Returns per-tenant configured/unconfigured status for every provider by calling provider.isConfigured(tenantId).
- `notification_mail.service.ts:assertMailFeatureAccess` — Outbound email is gated per tenant: requires the tenant's active plan to grant feature_email_send and stay under feature_email_monthly_quota (compared against TenantUsage.emailSends for that tenant). Root tenant is short-circuited and exempt. Re-asserted at both enqueue and worker boundaries.
- `notification_mail.service.ts:_sendMail` — On success increments TenantUsage.emailSends for the sending tenant and writes a per-tenant NotificationLog row (status sent/failed + provider + providerMessageId), so usage counters and delivery logs are isolated per tenant.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Sender identity (From email + name) is taken globally from env, not from the per-tenant fromEmail/fromName settings that already exist and are seeded per tenant. | `notification_mail.service.ts:MAIL_FROM (used in _sendMail options.from)` | MAIL_FROM is a static built from env.MAIL_FROM/APPLICATION_NAME and passed as options.from for every tenant, so all tenants send as the same address. The keys 'fromEmail' and 'fromName' are declared in notification_mail.setting.keys.ts and seeded per-tenant in setting.seed.ts but are never read by the service or any provider — clear gap; sender identity should be resolved per tenant. | `fromEmail` |
| Default mail provider is chosen globally from env.MAIL_PROVIDER instead of the per-tenant mailProvider setting. | `notification_mail.service.ts:DEFAULT_PROVIDER (used by getProvider when no provider arg is passed)` | getProvider falls back to DEFAULT_PROVIDER = env.MAIL_PROVIDER for all tenants. A 'mailProvider' key is declared in the keys file and seeded per-tenant, but the service never reads SettingService.getValue(tenantId,'mailProvider'); a tenant cannot pick its preferred provider — only the credential-presence fallback loop effectively decides. | `mailProvider` |
| Application/frontend branding used in every email (app name, login/reset/privacy/terms links, support email) is global env-derived, not per-tenant. | `notification_mail.service.ts:getBaseTemplateVars (APPLICATION_NAME, FRONTEND_URL, FRONTEND_*_PATH, FRONTEND_SUPPORT_EMAIL)` | All template variables come from static env-based fields, so every tenant's emails show the same brand name, base URL and support address. In a multi-tenant SaaS these are natural per-tenant branding values; today they cannot vary per tenant. | `emailSupportEmail` |
| Contact-form admin recipient is a single global env address shared by all tenants. | `notification_mail.service.ts:INFORM_MAIL (used in sendContactFormAdminEmail)` | sendContactFormAdminEmail sends to MailService.INFORM_MAIL = env.INFORM_MAIL for every tenant, so all tenants' contact submissions go to one platform inbox. The 'adminNotificationEmail' key already exists in the keys file but is unused here; the recipient should plausibly be per tenant. | `adminNotificationEmail` |
| SMTP encryption mode setting is declared but never applied. | `notification_mail.setting.keys.ts:smtpEncryption (declared) vs smtp.provider.ts:resolveCreds` | 'smtpEncryption' is part of EmailSettingKeySchema but the SMTP provider only reads 'smtpSecure'; smtpEncryption (e.g. tls/ssl/starttls) is never resolved, so a tenant configuring it has no effect — either wire it in or drop the key. | `smtpEncryption` |

---

## Dependencies

- `redis` — BullMQ connection (`mailQueue`).
- `env` — provider credential fallbacks and frontend/branding template variables.
- `setting` — per-tenant provider credential resolution (`SettingService.getValue`).
- `tenant_subscription` / `tenant_usage` — feature gating and the monthly `emailSends` quota counter.
- `notification_log` — per-tenant delivery audit rows.
