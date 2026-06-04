# notification_mail — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** notification_mail.service.ts, notification_mail.account-templates.service.ts, notification_mail.templates.service.ts
> **Overall grade:** C · **Findings:** 0c / 1h / 5m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| notification_mail.service.ts | 291 | Core tenant-aware dispatcher: per-tenant provider resolution + fallback (SMTP/SES/Mailgun/Postmark/Resend/SendGrid), BullMQ queue/worker, billing+quota feature gate, usage increment + NotificationLog side-effects, EJS template render. |
| notification_mail.account-templates.service.ts | 242 | Renders + dispatches account/security, tenant-invitation, and contact-form email templates via MailService. |
| notification_mail.templates.service.ts | 268 | Renders + dispatches invoice, welcome, login, password, and OTP email templates via MailService. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `throw new Error` inside a service** — `sendOTPEmail` throws `new Error("OTP token is required")` instead of `AppError`; a route handler cannot derive an HTTP status from a raw Error. (Here it is immediately caught by the method's own try/catch and only logged, so the throw is dead-ended — but it is still the wrong primitive and a rule violation.) Evidence: `modules/notification_mail/notification_mail.templates.service.ts:213`. Rule: `error-handling-and-app-error.md`. Fix: `throw new AppError("OTP token is required", 400, ErrorCode.VALIDATION)` from `@/modules/common/app-error`, or validate at the caller before dispatch.

### 🟡 Medium
- **[Dimension 3 — Error handling] Tracking side-effects are NOT actually swallowed, contradicting the docstring** — The docstring at `notification_mail.service.ts:213` states "Tracking failures are swallowed so they never break mail delivery", but `TenantUsageService.incrementEmailSends` (line 249) and the `NotificationLogService.log` calls (lines 250, 256) are not wrapped in try/catch. If a usage-counter or log write throws, it rejects `_sendMail` and fails the worker job even though the email was already delivered — the opposite of the documented contract. Evidence: `modules/notification_mail/notification_mail.service.ts:248-261`. Rule: `error-handling-and-app-error.md`. Fix: wrap each non-critical tracking call in a try/catch that logs and continues.
- **[Dimension 3 — Error handling] Queued `sendMail` silently discards the feature-gate denial** — `sendMail` wraps `assertMailFeatureAccess` + `QUEUE.add` in a try/catch that only logs; a genuine feature/quota denial from the gate is reduced to a log line and the caller gets a resolved `Promise<void>` with no signal the mail was rejected. The direct path (`sendMailDirect`/`_sendMail`) does propagate, so behaviour is inconsistent. Evidence: `modules/notification_mail/notification_mail.service.ts:182-189`. Rule: `error-handling-and-app-error.md`. Fix: let the gate rejection propagate (or rethrow as AppError); only swallow genuine enqueue/transport failures.
- **[Dimension 4 — Messages pattern] Hardcoded user-facing subject strings** — every email subject is an inline literal in the template services (e.g. `"Verify Your Email"`, `"Your Password Was Changed"`, `` `You've been invited to join ${tenantName}` ``, `` `Invoice ${invoice.invoiceNumber} — ...` ``). No `notification_mail.messages.ts` source exists. Evidence: `modules/notification_mail/notification_mail.account-templates.service.ts:17,44,66,99,136,169,209,231`; `modules/notification_mail/notification_mail.templates.service.ts:20,41,65,87,120,151,186,214,234,253`. Rule: `module-messages-pattern.md`. Fix: move subjects into a `notification_mail.messages.ts` const-object/enum and reference them.
- **[Dimension 8 — Service composition] No facade over the three sibling services** — `MailService`, `MailAccountTemplatesService`, and `MailTemplatesService` are three independent default exports; `template-vars.ts` and both template services cross-import the core `MailService` directly rather than going through a single module facade. Callers must know which of the three to import. Evidence: `modules/notification_mail/notification_mail.account-templates.service.ts:3`; `modules/notification_mail/notification_mail.templates.service.ts:2`; `modules/notification_mail/notification_mail.template-vars.ts:1`. Rule: `service-composition-pattern.md`. Fix: expose a single module facade that re-exports the template send-methods and hides the dispatcher.
- **[Dimension 12 — Security hardening] No outbound rate limiting or recipient validation at dispatch entrypoints** — `sendMail` / `sendMailDirect` accept arbitrary `to`/`subject`/`html` and dispatch without a per-tenant outbound limiter (the quota gate is explicitly non-atomic/best-effort, service.ts:155-156) and without basic recipient-shape validation. This is a risky outbound operation (spam/abuse surface), and invitation/OTP tokens are also placed into link query strings unvalidated. Evidence: `modules/notification_mail/notification_mail.service.ts:175-203`; `modules/notification_mail/notification_mail.account-templates.service.ts:45-46,172-175`. Rule: `security-hardening.md`, `secure-api-and-input-validation.md`. Fix: add a per-tenant outbound limiter and validate the recipient as an email before enqueue; EJS auto-escapes `<%=` by default — confirm templates avoid unescaped `<%-` for user-controlled fields.

### 🔵 Low
- **[Dimension 2 — Boundary validation] No Safe*Schema and untyped invoice payload** — services accept loosely-typed `Record<string, unknown>` (`invoice`) rendered straight into a template, and consume `provider.sendMail(...)` `MailResult` without a Safe* schema. Output is mostly `void`/`MailResult`, so impact is low. Evidence: `modules/notification_mail/notification_mail.templates.service.ts:17,38,59`; `modules/notification_mail/notification_mail.service.ts:200-263`. Rule: `validation-philosophy.md`. Fix: type `invoice` with a narrow render-DTO; add a Safe schema if these become route-facing.
- **[Dimension 11 — Logging] Recipient PII in log lines** — error/info logs include the recipient address and subject, e.g. `MAIL sendMail ERROR: ${to} ${subject} ...`. No secrets/tokens are logged, but recipient email is PII. Evidence: `modules/notification_mail/notification_mail.service.ts:187`; provider `providers/smtp.provider.ts:85`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: redact/hash the recipient in log lines if PII-minimisation is in scope.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | All three are static-only classes, single default export, never instantiated; idempotent static init block guards the worker. |
| 2 | Boundary validation | ⚠️ | No Zod safeParse / Safe* schema; untyped `Record<string, unknown>` invoice; provider `MailResult` consumed unvalidated. |
| 3 | Error handling | ❌ | Raw `throw new Error` at templates.service.ts:213; tracking side-effects not actually swallowed (docstring mismatch); queued path discards gate denial. |
| 4 | Messages pattern | ⚠️ | All email subjects hardcoded inline; no `notification_mail.messages.ts`. Log text is operator-facing (not flaggable). |
| 5 | DB access & entity ownership | — | No direct DB access; persistence delegated to NotificationLogService / TenantUsageService / providers. No raw SQL. |
| 6 | Multi-tenancy | ✅ | `tenantId` threaded through every dispatch, queue job, provider call, gate, usage, and log; root tenant short-circuited in gate. |
| 7 | Authorization / RBAC | ⚠️ | No resource ownership check; authz enforced at route layer; in-service defense-in-depth feature/quota gate present (deviation from authorization-and-rbac.md). |
| 8 | Service composition & boundaries | ⚠️ | Three sibling default exports, no module facade; template services + template-vars cross-import core MailService directly. Cross-module deps do use `@/` alias + facades. |
| 9 | Caching | — | No hot read path owned here; SMTP transporter map is a local optimization, not Redis cache. N/A. |
| 10 | Secrets & config | ✅ | All config/secrets via `@/modules/env` (incl. `env.MAIL_PROVIDER`); no `process.env.X` in any service. |
| 11 | Logging & audit | ⚠️ | Send/fail outcomes logged to NotificationLog fire-and-forget; recipient email PII appears in log lines; no secret/credential leakage. |
| 12 | Security hardening | ⚠️ | EJS auto-escapes by default, but no outbound rate limiter and no recipient/token validation at the boundary; quota gate explicitly non-atomic. |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/dot-suffixed files, PascalCase classes, `.service.ts` suffix, providers under `providers/`. |

## Recommendations
1. Replace the raw `throw new Error("OTP token is required")` (templates.service.ts:213) with `AppError(..., 400, ErrorCode.VALIDATION)`, or validate at the caller. (High)
2. Wrap `incrementEmailSends` + the `NotificationLogService.log` calls in `_sendMail` in try/catch so tracking failures truly never break delivery — make the code match its docstring (service.ts:248-261). (Medium)
3. Stop swallowing the feature-gate denial in the queued `sendMail` path; let it propagate (ideally as AppError 402/403) so callers learn the mail was rejected (service.ts:182-189). (Medium)
4. Add `notification_mail.messages.ts` and move all hardcoded email subjects into it. (Medium)
5. Introduce a single module facade exposing the template send-methods and hiding the dispatcher; remove direct cross-imports of `MailService` from the template services. (Medium)
6. Add a per-tenant outbound rate limiter and validate the recipient address before enqueue; audit EJS templates for unescaped `<%-` on user-controlled fields. (Medium)
7. Redact/hash recipient email in log lines if PII minimisation is in scope. (Low)

## References
- Rules: `error-handling-and-app-error.md`, `module-messages-pattern.md`, `service-composition-pattern.md`, `security-hardening.md`, `secure-api-and-input-validation.md`, `validation-philosophy.md`, `logging-monitoring-and-audit-trails.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md`, `env-and-config.md`, `code-structure-ts-master.md`, `naming-conventions.md` · Source: `modules/notification_mail/notification_mail.service.ts`, `modules/notification_mail/notification_mail.account-templates.service.ts`, `modules/notification_mail/notification_mail.templates.service.ts` (context: `providers/base.provider.ts`, `providers/smtp.provider.ts`, `notification_mail.template-vars.ts`)
