# Good to Have — Tenant Member Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Role & Permission Model

### Custom Roles / Role-Based Access Control (RBAC) Beyond OWNER/ADMIN/USER
**Why:** The three-role hierarchy (`OWNER > ADMIN > USER`) is hardcoded and identical for every tenant; operators building vertical SaaS (e.g., a healthcare platform) need custom roles like `BILLING_MANAGER`, `READ_ONLY_AUDITOR`, or `SUPPORT_AGENT`.
**Complexity:** High
**Multi-tenant relevance:** Different tenants have different org structures — a 500-person enterprise tenant needs a finer-grained permission model than a 3-person startup on the same platform.
**Multi-country relevance:** Regulated industries in many countries (healthcare in Germany, finance in UK) require role segregation that maps to specific compliance frameworks (HIPAA minimum necessary, FCA Senior Managers Regime) — a fixed 3-role model cannot satisfy these requirements.

### Permission Scopes / Fine-Grained Resource ACLs
**Why:** Role checks are binary (`hasRole`) against the hierarchy — there is no way to grant a user `ADMIN` on billing but `USER` on team management within the same tenant.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants need departmental isolation within their own tenant; a billing manager should not have access to member management screens.
**Multi-country relevance:** GDPR Art. 25 (data minimization) requires limiting access to personal data on a need-to-know basis — coarse-grained role checks cannot satisfy this at the resource level.

### `defaultMemberRole` Setting Wired to Registration Route
**Why:** The `defaultMemberRole` setting is declared in `tenant_member.settings.fields.ts`, shown in the UI, and documented in the README, but the registration route only fetches `allowSelfRegistration` — the configured value is always `undefined` and silently falls back to `USER`.
**Complexity:** Low
**Multi-tenant relevance:** A tenant that configures `defaultMemberRole: ADMIN` expects new self-registering users to join as admins; the broken wiring means this setting has no effect, surprising tenant admins.
**Multi-country relevance:** No direct country relevance, but this is a data integrity / trust issue — if the UI shows a configurable setting that does nothing, operators lose confidence in the platform's correctness.

## Member Lifecycle

### Member Suspension with Reason and Duration
**Why:** `memberStatus` can be `SUSPENDED` but `update` accepts no reason field and no automatic reinstatement date — suspension is manual and opaque with no audit trail of why it was applied.
**Complexity:** Low
**Multi-tenant relevance:** Enterprise HR processes require suspension to carry a reason (e.g., "on leave", "under investigation") and an expected reinstatement date for workforce management integrations.
**Multi-country relevance:** German Works Council law (§ 87 BetrVG) and French labor law require documented justification for access suspension; a reason field allows the platform to generate a compliant audit record.

### Member Last-Active Tracking
**Why:** The `TenantMember` entity has no `lastActiveAt` column — there is no way to identify dormant members for automated seat reclamation, compliance-driven access reviews, or licence optimization.
**Complexity:** Low
**Multi-tenant relevance:** SaaS platforms with per-seat billing need to identify unused seats; tenant admins want to see who has not logged in for 90+ days to reclaim those seats.
**Multi-country relevance:** ISO 27001 A.9.2.5 (review of user access rights) and SOC 2 CC6.2 require periodic access reviews — last-active data enables automated flagging of dormant accounts.

### Membership Transfer to Another User (Ownership Transfer)
**Why:** There is no service method to atomically transfer `OWNER` membership from one user to another — the only workaround is promoting the new user to OWNER and then demoting the old one, which requires two API calls and leaves a window where there are two owners.
**Complexity:** Low
**Multi-tenant relevance:** Founding member leaves the company, new CEO must take over the tenant — a single atomic transfer operation is safer than a multi-step workaround.
**Multi-country relevance:** Business succession in regulated industries (e.g., financial services in EU under MiFID II) requires an auditable record of who holds the controlling role at any point in time.

### Re-Invite Soft-Deleted Members
**Why:** `delete` soft-deletes the member row with `deletedAt`, but the `(tenantId, userId)` unique constraint blocks re-adding the same user without first hard-deleting the old row — there is no `restore` path.
**Complexity:** Low
**Multi-tenant relevance:** A user who leaves a tenant and later rejoins (contractor re-engagement, employee return) cannot be re-added without operator intervention to clean up the deleted row.
**Multi-country relevance:** No direct country relevance.

## SCIM & Directory Sync

### SCIM 2.0 PATCH Support (Partial Group Member Updates)
**Why:** `externalId` is stored on `TenantMember` (for SCIM correlation) but there is no SCIM 2.0 endpoint that handles `PATCH /Groups/{id}` to add/remove individual members — full group replacement is not practical for large enterprise directories.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants using Okta/Azure AD/Google Workspace for directory sync need PATCH operations to stay in sync without replacing the entire group on every change.
**Multi-country relevance:** Enterprise SCIM integrations are mandatory in US federal (FedRAMP), EU banking (EBA guidelines), and Japanese government tenants — all expect standards-compliant SCIM 2.0.

### SCIM-Triggered Role Mapping from IdP Groups
**Why:** SCIM provisioning sets `externalId` but there is no mapping from IdP groups (e.g., Okta group "Platform Admins") to tenant roles (`ADMIN`) — all SCIM-provisioned members land as `USER` regardless of their IdP group membership.
**Complexity:** Medium
**Multi-tenant relevance:** Each enterprise tenant maps its own IdP groups to platform roles differently; a per-tenant group-to-role mapping configuration is needed.
**Multi-country relevance:** DORA (EU Digital Operational Resilience Act) and UK FCA operational resilience requirements mandate automated identity lifecycle management — SCIM role mapping is a prerequisite.

## Search & Analytics

### Member Search on Name (Not Just Email)
**Why:** `getByTenantId` searches user email via `ILike` in the system DB but does not search `firstName` or `lastName` — tenant admins looking for "John Smith" must know his email address.
**Complexity:** Low
**Multi-tenant relevance:** Member management UX is worse in tenants with large user bases where admins do not know employee emails by heart.
**Multi-country relevance:** In markets where given names are not unique (common in East Asia), searching by full name (kanji + reading) is the primary lookup method — email-only search creates friction.

### Member Activity Export for Access Reviews
**Why:** There is no endpoint to export the full member list with last-active, role, and status as CSV — periodic access reviews (ISO 27001, SOC 2) must be done manually by downloading the paginated member list.
**Complexity:** Low
**Multi-tenant relevance:** Enterprise tenants with compliance obligations need a one-click member audit export for their quarterly access reviews.
**Multi-country relevance:** SOC 2 CC6.2 and ISO 27001 A.9.2.5 require periodic formal access reviews — a structured CSV export makes this auditable and reproducible across all countries where tenants operate.
