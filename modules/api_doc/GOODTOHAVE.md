# Good to Have — API Documentation Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

---

## Live Spec Generation

### Runtime OpenAPI Spec from Actual Routes
**Why:** Both `SYSTEM_SPEC` and `TENANT_SPEC` are static mock objects in `ui/mockSpec.ts`; they drift from the real API surface the moment any route changes, making the documentation unreliable as a contract.
**Complexity:** High
**Multi-tenant relevance:** Different tenants may have different feature flags active (e.g. only some tenants have the AI module or SCIM); the spec shown to a tenant should reflect that tenant's actual available endpoints.
**Multi-country relevance:** Country-specific route variations (e.g. local tax endpoints, GDPR data-export endpoints) must be reflected accurately per-region.

### Tenant-Scoped Spec Generation (Per-Feature-Flag)
**Why:** Today both tenant variants share one hardcoded spec; a tenant without the `feature_api_keys` plan entitlement still sees API-key endpoints in their documentation.
**Complexity:** Medium
**Multi-tenant relevance:** Hiding endpoints a tenant cannot access reduces confusion and prevents speculative access attempts on locked features.
**Multi-country relevance:** Country-specific regulatory endpoints (e.g. GDPR right-to-erasure, local invoice APIs) should only appear in the spec for the relevant tenant's region.

---

## Versioning & Changelog

### API Version Selection in the UI
**Why:** The `ServerSelector` component exists but there is no API versioning model; the documentation shows a single current version with no way to view or compare previous versions.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants pin their integrations to a specific API version; they need to access historical documentation to understand what changed between versions they have deployed.
**Multi-country relevance:** Regional regulatory requirements (e.g. PSD2 in the EU, Open Banking in the UK) impose versioned API mandates that must be documented separately per region.

### Machine-Readable Changelog Endpoint
**Why:** There is no `GET /api/changelog` or `GET /api/openapi.json` endpoint exposing the spec as structured data, preventing SDK generators, linters, and partner integrations from consuming it programmatically.
**Complexity:** Medium
**Multi-tenant relevance:** Large tenants running their own integration pipelines need to detect breaking changes automatically per version they are subscribed to.
**Multi-country relevance:** Cross-border integrations rely on stable, versioned machine-readable specs to adapt to local regulatory API changes without manual monitoring.

---

## Authentication & Access Control

### Require Tenant Authentication to View Docs
**Why:** The docs pages rely on session authentication at the page level, but there is no mechanism to optionally publish a public-facing spec (e.g. for developer portals) while keeping internal routes private.
**Complexity:** Low
**Multi-tenant relevance:** Some tenants operate a developer-facing product and need to expose their API spec publicly; others need it locked behind authentication — this should be a per-tenant setting.
**Multi-country relevance:** Public API documentation may be subject to export-control restrictions (e.g. US EAR) for certain categories of technology; access gating supports compliance.

### API Key — Try It Out Integration
**Why:** The UI renders code samples but there is no interactive "Try it out" panel that lets authenticated users test live endpoints directly from the docs (Swagger UI–style).
**Complexity:** High
**Multi-tenant relevance:** Tenant developers benefit enormously from testing against their own tenant's live data with their own API key without leaving the documentation page.
**Multi-country relevance:** A try-it-out panel should route requests through the correct regional base URL so users in different countries test against the right server.

---

## Localization & Internationalization

### Translated API Documentation
**Why:** All description strings, operation summaries, and error messages in the spec are English-only; non-English-speaking developer teams working on integrations have no localized documentation.
**Complexity:** High
**Multi-tenant relevance:** Tenant-specific documentation can be localized to that tenant's primary locale, improving adoption among non-English developer teams.
**Multi-country relevance:** Markets such as Japan, France, Brazil, and Germany have strong developer ecosystems with preference for native-language technical documentation; localization is a meaningful adoption lever.

### Right-to-Left (RTL) Layout Support
**Why:** The documentation UI uses a standard left-to-right layout; RTL languages (Arabic, Hebrew, Farsi) used in Middle-Eastern markets break the visual structure.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants serving RTL-speaking end users may have developer teams reading the docs in RTL locales.
**Multi-country relevance:** Saudi Arabia, UAE, Israel, and Iran are commercially significant markets where RTL is the default reading direction.

---

## Schema & Code Samples

### Per-Language SDK Code Sample Generation
**Why:** Code samples are static strings in `mockSpec.ts`; they do not update when the schema changes and are limited to a fixed set of languages hardcoded at authoring time.
**Complexity:** High
**Multi-tenant relevance:** Tenants using different stacks (Python, Ruby, PHP, Java) need accurate generated code samples reflecting their tenant's actual API key and base URL.
**Multi-country relevance:** Language preference for SDK examples varies significantly by region (PHP dominant in Eastern Europe, Python in APAC, Java in enterprise markets).

### Schema Diff / Breaking-Change Detector
**Why:** There is no tooling to compare two spec versions and surface breaking changes (removed fields, changed types, narrowed enums), leaving consumers unaware of API evolution.
**Complexity:** High
**Multi-tenant relevance:** Tenants integrating deeply need automated notification when a breaking change affects an endpoint they consume.
**Multi-country relevance:** Cross-border integrations are typically maintained by remote teams who cannot monitor changelog pages manually; automated diffing enables asynchronous notification.

---

## Search & Navigation

### Full-Text Search Across Endpoints
**Why:** The current UI renders tag-grouped collapsible sections; there is no search box to jump directly to an endpoint by name, path, or description — unusable at scale once the API surface grows.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants with many custom endpoints (via plugins or extensions) need search to navigate their full spec quickly.
**Multi-country relevance:** Not directly country-specific, but critical for large regional deployments where the spec grows to hundreds of endpoints.

### Permalink / Deep-Link to Specific Endpoint
**Why:** Collapsible section state is local; there is no URL hash or query-param mechanism to share a link that opens the docs at a specific operation, making it impossible to link to a particular endpoint in a support ticket or changelog.
**Complexity:** Low
**Multi-tenant relevance:** Support teams at large tenants reference specific endpoints in internal tickets; deep-links make collaboration across teams and timezones efficient.
**Multi-country relevance:** Geographically distributed teams working asynchronously across time zones rely on shareable deep-links to avoid repeated context-setting in communication.

---

## Tenant Customization

### Tenant-Branded Documentation Page
**Why:** The `ApiDocsPage` renders with platform branding; tenant admins cannot customize the logo, primary color, or page title to match their own brand when sharing docs with their own developers.
**Complexity:** Low
**Multi-tenant relevance:** White-label SaaS products require that all user-facing surfaces, including developer documentation, carry the tenant's brand rather than the platform's.
**Multi-country relevance:** Brand consistency requirements differ by market; local tenant branding helps meet regional partner and enterprise procurement criteria.

### Custom Base URL per Tenant
**Why:** The `Server` object in both spec variants hardcodes a single base URL; tenants with custom domains should see their own domain as the API server in code samples and the server selector.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant has its own subdomain or custom domain; code samples with the wrong base URL create confusion and incorrect copy-paste integrations.
**Multi-country relevance:** Regional deployments (EU data-residency clusters, APAC nodes) use different base URLs; the server list must reflect the tenant's applicable regional endpoint.
