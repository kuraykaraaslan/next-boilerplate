# Good to Have — Tenant Domain Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## DNS & Verification

### Email-Based Domain Ownership Verification (Postmaster / MX)
**Why:** Only TXT and CNAME DNS verification methods exist; some operators cannot add arbitrary TXT records (e.g., domain managed by a registrar control panel that only exposes MX/A records) — email-to-postmaster verification is a widely supported alternative.
**Complexity:** Medium
**Multi-tenant relevance:** Different tenants use different DNS providers with different feature sets; a single verification method will block adoption for some customer segments.
**Multi-country relevance:** Registrars in certain countries (e.g., .tr ccTLD managed by NIC.TR) restrict TXT record creation — an email-based fallback unblocks these markets.

### Multi-Method Verification Status Tracking
**Why:** The entity stores a single `verificationToken` and `verifiedAt`, with no record of which method was used or whether both TXT and CNAME were tried — debugging DNS failures requires guessing.
**Complexity:** Low
**Multi-tenant relevance:** Support teams need to see which verification attempt failed and why, per tenant — a verification log column or child table would allow actionable diagnostics.
**Multi-country relevance:** DNS propagation times vary dramatically by country (China's GFW can delay global propagation by hours) — tracking last-attempted-at per method allows smarter retry cadences.

### Verification Token Rotation Without Losing Domain Row
**Why:** If the 24-hour Redis TTL expires (e.g., the tenant forgot to add the DNS record), the token is gone but the domain row remains `PENDING` with no path to re-verify without deleting and re-creating the domain.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins who miss the 24-hour window are stuck; they need a "re-send / regenerate token" action on an existing `PENDING` domain row.
**Multi-country relevance:** No direct country relevance, but global teams across time zones frequently span the 24-hour window between when a developer adds the DNS record and when a DNS admin verifies it.

## SSL / TLS

### SSL Certificate Issuance Notification
**Why:** `recheckCertificates` updates `sslStatus` in the DB but fires no webhook or email when a cert transitions to `ACTIVE` or `FAILED` — tenant admins discover SSL problems only by checking the admin panel.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's custom domain SSL is an independent lifecycle; a tenant whose cert fails should receive an alert without requiring them to poll a dashboard.
**Multi-country relevance:** Compliance frameworks (PCI-DSS, ISO 27001) require notification SLAs for cert expiry — automated alerting satisfies this without manual monitoring.

### SSL Expiry Warning Threshold Configuration
**Why:** The `EXPIRING_WINDOW_DAYS = 30` constant is hardcoded; operators running Let's Encrypt (90-day certs) may want warnings at 21 days, while operators with commercial certs (1-year) want warnings at 60 days.
**Complexity:** Low
**Multi-tenant relevance:** Per-tenant or per-operator SSL alerting thresholds let high-security tenants get earlier warnings.
**Multi-country relevance:** Regulators in some markets (PCI-DSS in US banking, FIPS in US federal) require specific cert-expiry monitoring SLAs that differ from the 30-day default.

### Wildcard Subdomain SSL Verification via DNS-01 Challenge
**Why:** The platform uses Caddy `on_demand_tls` for per-domain certs, but wildcard certs (`*.tenant.platform.com`) require DNS-01 ACME challenges — there is no service or job that handles wildcard cert provisioning for the built-in subdomain model.
**Complexity:** High
**Multi-tenant relevance:** Multi-tenant platforms serving `{slug}.platform.com` subdomains ideally use a single wildcard cert rather than minting a cert per subdomain, reducing Let's Encrypt rate-limit exposure.
**Multi-country relevance:** Wildcard DNS-01 challenges require the ACME provider to have API access to the DNS zone — different countries use different DNS registrars with different API surfaces.

## Domain Lifecycle & Governance

### Domain Transfer Between Tenants
**Why:** There is no service method to reassign a `VERIFIED`/`ACTIVE` domain from one `tenantId` to another — required when a business restructures or a reseller migrates a customer.
**Complexity:** Medium
**Multi-tenant relevance:** Platform operators managing many tenants regularly need to transfer assets between tenant accounts without going through the full delete-and-reverify cycle.
**Multi-country relevance:** Business mergers and acquisitions require domain asset transfer; the legal requirement to preserve verification history differs by jurisdiction.

### ✅ Domain Blocklist / Reserved Domains
**Why:** There is no mechanism to prevent tenants from claiming domains that should be reserved (e.g., `api.platform.com`, `admin.platform.com`, competitor domains), creating security and brand risks.
**Complexity:** Low
**Multi-tenant relevance:** A tenant claiming `api.{platform-domain}` as a custom domain could intercept platform API traffic in path-based tenancy mode.
**Multi-country relevance:** Country-specific blocklists are needed — e.g., a tenant should not be able to claim a government TLD (.gov.tr, .gov.uk) as their custom domain.

### Subdomain Assignment from Platform-Owned Wildcard Domain
**Why:** `maxSubdomains` caps are enforced, but there is no provisioning service that actually assigns `{slug}.platform.com` subdomains from a pool — the cap is tracked but the actual subdomain registration against the platform's wildcard DNS is manual.
**Complexity:** High
**Multi-tenant relevance:** Fully automated subdomain provisioning (create tenant → get `acme.platform.com` immediately) is a table-stakes feature for SaaS onboarding.
**Multi-country relevance:** Platform-owned wildcard domains need country-specific TLDs (`platform.com.tr`, `platform.co.uk`) — subdomain provisioning must be aware of which base domain to use per region.

## Compliance & Data Governance

### Domain History / Audit Log
**Why:** There is no per-domain change history — when a domain was verified, by whom, what SSL transitions occurred, and when `isPrimary` changed are not audited beyond the generic audit log.
**Complexity:** Low
**Multi-tenant relevance:** Enterprise tenants with change management requirements need a queryable domain history per tenant.
**Multi-country relevance:** eIDAS (EU) and DKIM/DMARC email compliance require verifiable domain ownership history — an audit trail per domain satisfies this.

### HSTS Preloading Status Tracking
**Why:** The SSL observability columns track cert state but not whether the domain is HSTS-preloaded — a domain removed from preloading by a tenant can cause browser compatibility issues for weeks.
**Complexity:** Low
**Multi-tenant relevance:** Enterprise tenants who add HSTS preloading need the platform to warn before they remove a domain row (preload removal takes months to propagate).
**Multi-country relevance:** HSTS preloading is enforced differently across browser vendors; in markets where Chrome dominates (globally ~65%) the risk is universal.
