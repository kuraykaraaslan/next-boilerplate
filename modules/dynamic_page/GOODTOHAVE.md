# Good to Have — Dynamic Page

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Multilingual Content

### Automatic Language Fallback Chain
**Why:** When a visitor requests a page in `fr-CA` and no French-Canadian translation exists, the renderer currently returns the base page with no fallback logic, silently showing the default-language content with no indication to the user or SEO signals that a fallback occurred.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant may configure a different language fallback priority (e.g., `fr-CA → fr → en` for a Quebec tenant vs. `de-AT → de → en` for an Austrian tenant).
**Multi-country relevance:** Critical for markets where a country has multiple official languages or regional dialects; without a fallback chain, missing translations produce a degraded experience instead of a graceful downgrade.

### Language-Aware Sitemap Generation
**Why:** The module currently has no sitemap output; adding multilingual sitemap support with `<xhtml:link rel="alternate" hreflang="...">` tags is required for Google to index translated versions of pages.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's sitemap must include only that tenant's published pages and their declared translations.
**Multi-country relevance:** Without hreflang entries in the sitemap, search engines cannot associate translated pages with their target locales, directly harming organic traffic in non-English markets.

### Per-Language SEO Metadata on Translations
**Why:** The `DynamicPageTranslation` entity stores translated `title`, `description`, and `sections`, but has no `metadata` (OpenGraph, Twitter card, canonical URL, keywords) column — the base page's `metadata` is reused for all translations, meaning OG images and canonical URLs are not language-specific.
**Complexity:** Low
**Multi-tenant relevance:** Any tenant targeting multiple locales needs translated OG titles and descriptions for social sharing to render correctly in each language.
**Multi-country relevance:** Canonical URLs for translated pages must point to the locale-specific URL; a shared canonical across languages causes duplicate-content penalties in search engines.

---

## Content Governance

### Page Approval Workflow / Review State
**Why:** The current status enum (`DRAFT → PUBLISHED → ARCHIVED`) has no review step. In regulated or brand-sensitive tenants, content must pass an editorial review before going live.
**Complexity:** Medium
**Multi-tenant relevance:** Different tenants have different editorial maturity; a small startup tenant may keep the two-step flow while an enterprise tenant needs a `PENDING_REVIEW → APPROVED → PUBLISHED` pipeline.
**Multi-country relevance:** Some markets (financial services EU, healthcare US) have regulatory requirements mandating content approval trails before public publication.

### Page Scheduling (Publish At / Expire At)
**Why:** There is no `publishedAt` or `expiresAt` timestamp on `DynamicPage`; tenants cannot schedule a page to go live at midnight for a campaign launch or automatically archive a time-limited promotional page.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant has different marketing calendars; scheduling per-tenant allows coordinated global launches without manual intervention.
**Multi-country relevance:** Promotions tied to country-specific holidays (Black Friday US vs. Singles Day TR) require time-zone-aware scheduling, which a global timestamp pair enables.

### Page Version History / Audit Trail
**Why:** There is no versioning on `DynamicPage.sections` or `metadata`; a mistaken publish overwrites the previous live content with no rollback path.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants with multiple editors need a history of who changed what and the ability to revert, without affecting other tenants' content history.
**Multi-country relevance:** Regulatory markets (GDPR, Turkish KVKK) may require an audit trail of what content was public at a given time, especially for legally binding terms-and-conditions pages.

---

## Block System

### Per-Tenant Block Import / Export
**Why:** Tenants cannot export their block library as a JSON bundle or import blocks from a marketplace/template set; every block must be created from scratch via the admin UI.
**Complexity:** Medium
**Multi-tenant relevance:** Platform operators need a way to ship a pre-built block library to new tenants on provisioning, and tenant admins need a way to migrate blocks across staging and production tenant environments.
**Multi-country relevance:** Country-specific block templates (GDPR cookie consent block, VAT disclaimer block for EU) can be distributed to the relevant tenant cohort without duplicating effort.

### Block Access Control (Role-Restricted Blocks)
**Why:** All blocks in a tenant's library are available to all editors with `ADMIN` role; there is no way to restrict certain high-risk blocks (e.g., custom HTML/script blocks) to a super-admin role only.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants with non-technical content editors need to prevent accidental use of raw HTML/JS blocks that could break the page or introduce XSS.
**Multi-country relevance:** Some markets require content separation by business unit; role-restricted blocks enforce that, e.g., legal-disclaimer blocks can only be placed by the compliance team.

### Server-Side Block Data Resolution
**Why:** The `serverHandler` field exists on `CreateBlockDTO` but there is no runtime mechanism to resolve it; dynamic blocks (e.g., a block showing live product prices or a weather widget for a specific city) cannot fetch data server-side at render time.
**Complexity:** High
**Multi-tenant relevance:** Each tenant's dynamic blocks should call that tenant's own data sources, scoped by `tenantId`.
**Multi-country relevance:** Country-specific data sources (currency rates, local news feeds, regional store inventory) require per-request server-side resolution with country/locale context.

---

## Performance and Delivery

### Configurable Cache TTL per Page
**Why:** `SLUG_TTL` is a single hardcoded constant (3600s); a frequently-updated FAQ page needs a shorter TTL while a static about-us page can tolerate 24 hours, but both use the same Redis TTL today.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins should be able to set a cache TTL per page (or per page status) to control how quickly changes propagate to the public renderer.
**Multi-country relevance:** Pages serving rapidly-changing country-specific content (exchange rates, legal notices) need near-zero TTLs, while static pages in the same tenant benefit from long caching.

### CDN-Friendly Cache Invalidation Webhooks
**Why:** The module invalidates its internal Redis cache on page update, but does not signal any CDN (Cloudflare, AWS CloudFront) to purge the edge cache for the affected URL slug.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant may have a different CDN configuration or custom domain; the invalidation webhook must be scoped to the tenant's CDN zone.
**Multi-country relevance:** Edge caches in different geographic regions must all be purged when a page targeting that region is updated, or visitors in that country continue seeing stale content.

---

## Access and Visibility

### Per-Page Audience Targeting (Country / Language / Role)
**Why:** Published pages are visible to all visitors with no visibility rules; there is no way to show a page only to visitors from a specific country, logged-in users, or users with a specific subscription tier.
**Complexity:** High
**Multi-tenant relevance:** Tenants in different verticals need different access rules — a B2B SaaS tenant may want gated content visible only to authenticated members, while a public marketing tenant has no gating.
**Multi-country relevance:** Legal terms, pricing pages, and product availability differ by country; showing a German pricing page to a US visitor (or vice versa) creates compliance and UX issues.

### Password-Protected Pages
**Why:** There is no mechanism to require a page-level passphrase before rendering, which is a common requirement for pre-launch teaser pages, VIP content, or document-sharing with a specific audience.
**Complexity:** Low
**Multi-tenant relevance:** Per-tenant feature-flag or subscription tier can gate whether tenants can create password-protected pages.
**Multi-country relevance:** Some markets use password-protected pages for distributor-only pricing that varies by country, avoiding public exposure of country-specific pricing.
