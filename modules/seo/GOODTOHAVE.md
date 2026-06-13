# Good to Have — SEO

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Multilingual and International SEO

### ✅ hreflang Tag Generation
**Why:** The module stores entity-level SEO metadata but produces no `<link rel="alternate" hreflang="...">` tags; without hreflang, Google cannot determine which language/country variant of a page to serve to which audience, causing duplicate-content penalties and misdirected organic traffic.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant declares which languages and locales it serves; the hreflang set must be scoped to that tenant's active translations and must not expose another tenant's URL structure.
**Multi-country relevance:** hreflang is the primary SEO signal for multi-country targeting; missing it means that a page optimised for Germany will also rank (or fail to rank) for Turkey, causing incorrect audience matching across all countries the tenant operates in.

### ✅ Per-Locale Canonical URL Management
**Why:** `canonicalUrl` is a single string stored on the `SeoMeta` row; there is no model for a locale-specific canonical (e.g., `https://example.com/de/produkt` as the canonical for the German version, separate from `https://example.com/en/product`), which is required when the same product exists at locale-specific URLs.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants hosting locale-specific subdomains or path prefixes per country (e.g., `de.tenant.com` vs `en.tenant.com`) need the canonical URL to point to the correct locale root, not a single global URL.
**Multi-country relevance:** Incorrect canonical URLs cause search engines to consolidate ranking signals on the wrong locale's page — a fundamental SEO error for any multi-country deployment.

### ✅ x-default hreflang for Language Chooser Pages
**Why:** When no language-specific page exists for a visitor's locale, search engines need a fallback URL annotated with `hreflang="x-default"`; the module has no concept of a default/language-chooser URL per entity.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's default language (configured in `LOCALIZATION_KEYS.defaultLanguage`) should be the `x-default` target; this is tenant-specific.
**Multi-country relevance:** `x-default` is the correct signal for a global homepage or language-chooser page that serves all countries; without it, search engines may arbitrarily choose which country's version to show as the fallback.

---

## Sitemap Generation

### ✅ Per-Tenant Sitemap XML Generation
**Why:** The setting key `sitemapEnabled` exists in `SEO_KEYS` but there is no route, service, or cron job that generates a `sitemap.xml` for a tenant's published entities (`dynamic_page`, `store_product`, `store_category`, `store_bundle`).
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant needs its own `sitemap.xml` at its canonical URL root (`/tenant/[tenantId]/sitemap.xml`), containing only that tenant's published content with the correct last-modified dates.
**Multi-country relevance:** Search engine crawl budgets are limited; a well-structured sitemap with `<lastmod>` and locale alternate links is the primary mechanism for ensuring all country-specific content variants are crawled and indexed.

### ✅ Sitemap Index for Large Tenants
**Why:** A tenant with thousands of products needs a sitemap index (`sitemap-index.xml`) that splits the sitemap into multiple page-level sitemap files; a single flat `sitemap.xml` exceeding 50,000 URLs or 50 MB is rejected by Google Search Console.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants with large catalogs hit the 50K URL limit quickly; the generation logic must automatically paginate into a sitemap index scoped to the tenant's entity count.
**Multi-country relevance:** Multi-country tenants have multiplied URL counts (one URL per country×locale×entity), making sitemap index support mandatory for any meaningful international catalog.

### ✅ Image Sitemap Extension
**Why:** Product images are not included in any sitemap; Google's Image Sitemap extension (`<image:image>` tags) enables image search indexing, which drives significant traffic for e-commerce products in many markets.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's gallery images (via `media_gallery` module) should be included in that tenant's sitemap only, with `<image:loc>` pointing to the CDN-served URL.
**Multi-country relevance:** Image search is a major product discovery channel in markets like Turkey (Google Görsel), Brazil, and Spain; not including image sitemap entries leaves significant organic traffic on the table in these markets.

---

## Structured Data (Schema.org)

### ✅ JSON-LD Structured Data Generation
**Why:** The module stores metadata fields but generates no `<script type="application/ld+json">` output; structured data is required for Google rich results (product cards, breadcrumbs, FAQ, article) that dramatically improve click-through rates.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's entity type (product, category, bundle, dynamic page) maps to a different Schema.org type (`Product`, `ItemList`, `FAQPage`, `Article`); the generation must be entity-type-aware and scoped to the tenant's data.
**Multi-country relevance:** Rich results eligibility and format differ by country market — Google India supports `Product` rich results differently from Google DE; locale-specific `@language` and `priceCurrency` fields in the JSON-LD are required for correct international rich result rendering.

### ✅ Breadcrumb Structured Data
**Why:** Category hierarchies in the `store` module and nested slugs in `dynamic_page` are not surfaced as `BreadcrumbList` JSON-LD; missing breadcrumb structured data means search engines render generic URL fragments instead of human-readable breadcrumb paths in search results.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's category tree and page hierarchy is different; breadcrumb generation must resolve the per-tenant hierarchy dynamically.
**Multi-country relevance:** Breadcrumbs in search results are displayed in the user's language; structured data must carry the locale-specific labels from the tenant's translated category/page names.

---

## Technical SEO

### ✅ Robots.txt Generation per Tenant
**Why:** The `metaRobots` setting key exists but there is no route that generates a per-tenant `robots.txt` file; without `robots.txt`, search engine crawlers have no guidance on which paths to crawl or avoid for each tenant.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant needs its own `robots.txt` at its root URL, referencing its own sitemap URL and specifying which admin/API paths to disallow.
**Multi-country relevance:** Some country-specific crawlers (Yandex for Russia/CIS, Baidu for China) have specific `User-agent` disallow rules; a generated `robots.txt` can include country-crawler-aware directives.

### ⏭️ Core Web Vitals Tracking per Tenant — DEFERRED (needs client-side RUM beacon; no-mock)
**Why:** The `googleTagId` analytics setting exists but there is no structured mechanism for collecting or surfacing Core Web Vitals (LCP, FID/INP, CLS) per tenant; Core Web Vitals are a direct Google ranking factor.
**Complexity:** High
**Multi-tenant relevance:** A tenant's CWV scores are independent of other tenants; each tenant's admin should see CWV metrics for their own pages without cross-tenant data bleed.
**Multi-country relevance:** CWV scores vary significantly by country due to device profile and network quality differences; a tenant should see CWV broken down by country/region to identify where slow pages are costing them ranking.

### ✅ Google Search Console Property Verification API
**Why:** `googleSearchConsoleId` is stored as a setting key but the platform does not auto-generate the HTML meta verification tag in page `<head>` output or provide DNS TXT / file-based verification flows; tenants must manually handle verification.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant has its own Google Search Console property with a unique verification token; injecting it into the tenant's page `<head>` must be scoped to that tenant only.
**Multi-country relevance:** Tenants operating in multiple countries often create separate Search Console properties per country-specific domain or URL prefix; the module should support storing multiple verification tokens (one per regional property).

---

## Open Graph and Social

### ✅ Per-Locale Open Graph Metadata
**Why:** The current `ogTitle`, `ogDescription`, `ogImageUrl` are single strings on the `SeoMeta` row; there is no locale-specific OG override, so sharing a Turkish product page on WhatsApp shows the English OG title to Turkish users.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants targeting multiple locales need translated OG metadata stored per entity per locale, extending the translation model from `dynamic_page_translations` to the SEO layer.
**Multi-country relevance:** Social sharing is highly locale-dependent; an incorrect-language OG title on a Facebook share dramatically reduces click-through rates from country-specific social feeds.

### ✅ Twitter/X Card Validation and Preview
**Why:** `twitterCard` is stored but there is no server-side validation that the specified card type (`summary`, `summary_large_image`, `app`, `player`) is compatible with the metadata provided (e.g., `summary_large_image` requires `twitterTitle`, `twitterDescription`, and an image URL of minimum dimensions).
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins who configure an invalid Twitter card type get no feedback; the invalid combination silently falls back to a plain link preview, wasting the marketing value of Twitter Cards.
**Multi-country relevance:** Twitter/X usage and card preview rendering varies significantly by country; in markets where X/Twitter is a primary marketing channel (US, Japan, India, Brazil), invalid card configuration has high business impact.
