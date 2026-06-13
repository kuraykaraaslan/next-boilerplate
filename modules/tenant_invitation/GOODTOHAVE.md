# Good to Have — Tenant Invitation Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Invitation UX & Delivery

### Bulk Invite (CSV Upload)
**Why:** The `send` method accepts a single email; an admin onboarding a 50-person team must make 50 sequential API calls — there is no bulk invite endpoint or CSV import.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants migrating from a competitor platform need to mass-invite their existing users; single-at-a-time invites create unacceptable onboarding friction.
**Multi-country relevance:** No direct country relevance, but enterprise sales in markets like DACH and Japan expect feature parity with established competitors that all offer CSV bulk invite.

### ✅ Invitation Resend / Refresh Without Revoke-and-Reinvite
**Why:** Refreshing a pending invite requires revoking it and sending a new one (two webhooks, a new token, a new email); there is no `resend(invitationId)` method that rotates the token and resends the email in one atomic operation.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins regularly need to resend invite emails when the original email went to spam — making them revoke and recreate causes confusion for both the admin and the invitee.
**Multi-country relevance:** Email deliverability problems are more prevalent in certain markets (Russia, China, parts of MENA) where ISP filtering causes higher spam-folder rates — a frictionless resend reduces support tickets in these markets.

### Invitation Link Deep-Link to a Specific Onboarding Flow
**Why:** The invite accept URL is hardcoded to the generic token accept path — there is no way to carry additional context (e.g., which team to join, which project to open) through the invite link into the post-accept redirect.
**Complexity:** Low
**Multi-tenant relevance:** Product-led growth features (e.g., "join this project") require carrying intent through the invite link; the current token-only design does not support this.
**Multi-country relevance:** No direct country relevance.

### Pending Invitation Count in Feature Gate
**Why:** The `MAX_INVITATIONS` feature key exists in `FEATURE_KEYS` but the `send` route asserts `MAX_MEMBERS` (active member count), not `MAX_INVITATIONS` (pending invite count) — a tenant could send 1,000 pending invites while only having 5 active members, bypassing the intent of an invitation cap.
**Complexity:** Low
**Multi-tenant relevance:** Invitation caps are a billing signal — a plan with `max_members: 10` should also cap pending invites to prevent circumventing seat limits by leaving invites perpetually pending.
**Multi-country relevance:** No direct country relevance.

## Security

### ✅ Invitation TTL Wired to Per-Tenant Setting
**Why:** `INVITATION_TTL_SECONDS` is a global env variable (7-day default); the README documents an `invitationTtlSeconds` per-tenant setting but the service never reads it — high-security tenants cannot enforce shorter invite windows.
**Complexity:** Low
**Multi-tenant relevance:** Financial-services tenants typically require invitation links to expire within 24 hours; the current global 7-day TTL fails their security policy.
**Multi-country relevance:** EU NIS2 Directive and financial-sector DORA regulation in the EU require organizations to enforce strict access-grant timelines — a configurable TTL lets tenants self-certify compliance.

### Invitation Delivery Confirmation (Bounce / Delivery Receipt Tracking)
**Why:** `send` returns a `rawToken` and delegates emailing to `MailService.sendTenantInvitationEmail`, but there is no feedback loop — if the email bounces, the invitation stays `PENDING` forever with no indication of delivery failure.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admins managing large teams need to know which invitations were delivered vs. bounced so they can resend or contact the invitee through another channel.
**Multi-country relevance:** Email bounce rates are higher in markets where business email providers filter aggressively (Russia's Yandex, China's QQ/163, many enterprise filters in MENA) — delivery status tracking is critical for these markets.

### TOTP / Magic Link as Invitation Claim Method
**Why:** Accepting an invitation requires a JWT-authenticated user session — an invitee who has not yet registered must create an account first, navigate away, and then accept; there is no magic-link-style claim flow that creates the account and accepts the invite in one step.
**Complexity:** High
**Multi-tenant relevance:** Tenant onboarding conversion is maximized when the invite-to-member flow is a single click; multi-step flows with account creation in the middle have high drop-off rates.
**Multi-country relevance:** In markets where email is the primary identity credential (Japan, Korea), magic-link onboarding is the norm and reduces friction vs. password-based registration.

## Localization

### Invitation Email Locale Follows Tenant or Invitee Language
**Why:** The invitation email sent by `MailService` presumably uses the platform's default locale — there is no mechanism to select the email template language based on the tenant's `language` setting or the invitee's browser preference.
**Complexity:** Medium
**Multi-tenant relevance:** A tenant operating in Turkey needs invitation emails in Turkish; a tenant operating in Germany needs them in German — a single-locale email template is incompatible with white-label multi-country deployments.
**Multi-country relevance:** Turkish law (Law No. 6698 KVKK) and German law (BDSG) both require communications with data subjects to be in a language they can understand — sending a GDPR-adjacent invitation in English to a Turkish user is legally risky.

### ✅ Invitation Role Options Restricted by Tenant's Allowed Roles
**Why:** `memberRole` on invitations accepts any value from `TenantMemberRoleEnum` — but if a tenant is configured to only have `USER` and `ADMIN` (not `OWNER`), there is no validation preventing an admin from sending an `OWNER` invitation.
**Complexity:** Low
**Multi-tenant relevance:** Tenants with custom role policies need the invitation flow to respect their configured allowed-role list.
**Multi-country relevance:** No direct country relevance.

## Governance & Audit

### ✅ Invitation Expiry Sweep Job
**Why:** Expired invitations (past `expiresAt`) remain in status `PENDING` in the database indefinitely — there is no background job that transitions them to `EXPIRED`, so the invitation list shows stale rows and counts are inaccurate.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins viewing pending invites see a list polluted with month-old expired invites; accurate counts are needed for the `MAX_INVITATIONS` feature gate.
**Multi-country relevance:** GDPR Art. 5(1)(e) storage limitation requires that data (including personal data like email addresses on expired invites) is not kept longer than necessary — an expiry sweep that deletes or anonymizes old rows satisfies this.

### Invitation Activity in Tenant Export
**Why:** `tenant_export` exports members and audit logs but does not explicitly include invitation history — `DECLINED` and `REVOKED` invitations that predated a member's join are part of the tenant's operational history and should be exportable.
**Complexity:** Low
**Multi-tenant relevance:** Tenants migrating to another platform need their full invitation history to reconstruct who was invited, when, and with what role.
**Multi-country relevance:** GDPR Art. 20 data portability covers all personal data processed by the controller — email addresses stored on invitation rows count as personal data and must be included in exports.
