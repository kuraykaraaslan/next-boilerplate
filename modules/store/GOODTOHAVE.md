# Good to Have — Store

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Multi-Currency and Pricing

### ✅ Multi-Currency Price Lists
**Why:** `StoreProduct.currency` and `StoreBundle.currency` are single strings defaulting to `USD`; there is no model for storing a product's price in multiple currencies simultaneously, forcing tenants to choose one currency for the entire catalog regardless of the countries they sell in.
**Complexity:** High
**Multi-tenant relevance:** Each tenant's store operates in its own market(s); a Turkish tenant needs prices in TRY, a German tenant in EUR, and a global tenant may need both plus USD — all three use the same `StoreProduct.currency` column today with different defaults.
**Multi-country relevance:** E-commerce regulation in many countries (EU Consumer Rights Directive, Turkey TKHK) requires prices displayed in the local currency; a single-currency product catalog cannot comply with this requirement for a multi-country storefront without a currency conversion layer that introduces floating exchange-rate inaccuracies.

### ✅ Per-Country Price Override
**Why:** Even with multi-currency support, market pricing strategy often requires country-specific list prices (e.g., a software subscription priced at $10 USD, €9 EUR, ₺350 TRY based on purchasing power parity, not the exchange rate); there is no entity for per-country price overrides on a product or variant.
**Complexity:** High
**Multi-tenant relevance:** Tenants operating in multiple countries need to set prices independently per country without affecting the global base price; the current single `basePrice`/`currency` model cannot express this.
**Multi-country relevance:** Purchasing power parity pricing is a standard practice for global SaaS (e.g., Loom, Notion, Adobe all offer country-specific pricing); without per-country price overrides, tenants cannot compete in local markets on price.

### ✅ Tax Rate Configuration per Country/Region
**Why:** The store module has no concept of tax (VAT/GST/sales tax); `basePrice` is the only price field, and there are no per-country tax rate settings, tax-inclusive vs. tax-exclusive price flags, or tax line items in bundle pricing.
**Complexity:** High
**Multi-tenant relevance:** Tenants registered in different countries have different VAT obligations; an EU tenant must charge VAT (with the rate depending on the buyer's country under OSS rules), while a US tenant charges state sales tax, and a Turkish tenant charges KDV at 20%.
**Multi-country relevance:** EU VAT One Stop Shop (OSS) rules require charging the buyer's country VAT rate for digital goods; Turkey mandates KDV at 20% on all sales; the absence of a tax model makes the store module non-compliant with standard e-commerce tax law in virtually every market.

### ✅ Promotional Pricing / Discount Campaigns
**Why:** `StoreBundle.discountPercent` exists but `StoreProduct` and `StoreProductVariant` have no equivalent; there is no time-bounded promotional price, coupon code system, or volume discount table for individual products.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant runs its own promotions on its own schedule; discount campaigns must be fully isolated per tenant with no visibility across tenants.
**Multi-country relevance:** Country-specific sales events (Black Friday US, Singles Day TR, Prime Day global) require date-bounded promotional prices activated per country; a promotion activated globally may violate country-specific pricing regulations (e.g., EU Omnibus Directive requires showing the 30-day lowest price alongside a promotional price).

---

## Product Catalog Internationalisation

### ✅ Per-Language Product Name and Description
**Why:** `StoreProduct.name`, `shortDescription`, and `details` are single-language strings; there is no translation model analogous to `DynamicPageTranslation` for product content, meaning a multi-language storefront must either duplicate products or display English content to non-English users.
**Complexity:** High
**Multi-tenant relevance:** Tenants targeting multilingual markets need translated product content without duplicating the underlying product entity (which would split inventory, SEO, and analytics across duplicates).
**Multi-country relevance:** Displaying product names and descriptions in the customer's language is a legal requirement in some markets (France Toubon Law requires French, Quebec language laws, Spanish-language requirements in several Latin American countries) and a strong commercial requirement in all others.

### ✅ Per-Language Category Name and Description
**Why:** `StoreCategory.name` and `description` are single-language strings with no translation table; a translated storefront has no way to show "Dizüstü Bilgisayarlar" to Turkish users and "Laptops" to English users for the same category.
**Complexity:** Medium
**Multi-tenant relevance:** Category hierarchies are shared across a tenant's entire catalog; a translation model on `StoreCategory` benefits all products in that category simultaneously without modifying individual product records.
**Multi-country relevance:** Breadcrumbs, navigation menus, and filter labels all derive from category names; untranslated categories in a localised storefront create a jarring mixed-language UI that undermines trust in non-English markets.

### ✅ Country-Specific Product Availability Flags
**Why:** `StoreProduct.status` is a global enum (`DRAFT`, `ACTIVE`, `ARCHIVED`, `OUT_OF_STOCK`) with no country dimension; a product that is `ACTIVE` in Turkey may be unavailable in Germany due to regulatory reasons (e.g., not CE-certified), but there is no way to express this without duplicating the product.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants in regulated industries (electronics, food, pharma) must restrict product availability by country; the data model needs a `StoreProductAvailability` join table mapping products to permitted countries/regions.
**Multi-country relevance:** EU CE marking requirements, US FCC certification, and country-specific import restrictions all create scenarios where a product is legally available in one country but not another; the catalog must be able to express this without duplicating product data.

---

## Inventory and Logistics

### ✅ Warehouse / Location-Based Inventory
**Why:** `stockQuantity` is a single integer on `StoreProduct` and `StoreProductVariant`; there is no model for inventory split across multiple warehouses or fulfillment centers, which is required to ship orders from the warehouse closest to the customer's country.
**Complexity:** High
**Multi-tenant relevance:** A tenant operating warehouses in Turkey and Germany should show customers in each country the stock count from the nearest warehouse; stock shown from a far warehouse creates false availability signals when cross-border shipping is restricted.
**Multi-country relevance:** Cross-border shipping restrictions (EU customs for non-EU products, Turkey import quotas, UK post-Brexit tariffs) mean that a product "in stock" in Turkey is not necessarily "available" to a customer in Germany; location-aware inventory prevents overselling.

### ✅ Pre-Order and Backorder UX Signals
**Why:** `allowBackorder` is a boolean column but there is no distinction between "backordered with known restock date", "pre-order for an unreleased product", and "unlimited digital download"; all three show the same behaviour to a customer today.
**Complexity:** Low
**Multi-tenant relevance:** Different tenant verticals use these concepts differently: a physical goods tenant needs backorder with restock dates; a digital goods tenant needs unlimited stock; a pre-launch tenant needs pre-order with a countdown.
**Multi-country relevance:** Consumer protection law in several EU member states requires transparent communication of delivery timelines for backordered goods; the distinction between "backordered" and "pre-order" affects the legally required disclosure text shown to customers.

---

## Order and Storefront

### ⏭️ Public Storefront API (Customer-Facing Product Browsing) — DEFERRED (route layer; pricing/localization/availability resolvers now ready via StorePricingService)
**Why:** Every route in the store module requires tenant `ADMIN` role; there is no public or authenticated-customer API for listing products, fetching a product detail page, or browsing categories — the store is catalog-only with no customer-facing surface.
**Complexity:** High
**Multi-tenant relevance:** Each tenant's public storefront must scope product listings to that tenant's `ACTIVE` products, apply that tenant's locale settings (language, currency), and enforce that tenant's regional availability rules.
**Multi-country relevance:** A public product listing API with locale and currency parameters is the foundation of any multi-country storefront; without it, the store module has no path to serving customers in any country.

### ⏭️ Shopping Cart and Order Management — DEFERRED (handled by payment_cart/payment modules; out of catalog scope)
**Why:** The module has no cart, order, or checkout concept; it is a catalog only — products can be browsed by admins but not purchased by customers through the platform.
**Complexity:** High
**Multi-tenant relevance:** Each tenant's orders are isolated; multi-currency, multi-tax, and multi-warehouse logic must all be applied per-tenant at checkout time.
**Multi-country relevance:** Order management must handle country-specific requirements: EU mandatory 14-day right of withdrawal, Turkish 14-day return window (Mesafeli Sözleşmeler Yönetmeliği), US state-level sales tax collection — all triggered by the customer's country.

---

## Catalog Governance

### ✅ Per-Tenant Catalog Limits via Subscription Feature Keys
**Why:** `createCategory`, `createProduct`, `createBundle`, and `addImage` create rows unconditionally with no check against the tenant's subscription plan feature keys; any tenant on any plan can create unlimited catalog entries, bypassing the `tenant_subscription` gating already used by the storage module.
**Complexity:** Low
**Multi-tenant relevance:** Plan-tier catalog limits (e.g., 100 products on Starter, unlimited on Enterprise) are a standard SaaS pricing mechanism; enforcing them at the service layer ensures tenants on lower plans cannot exploit the API to exceed their entitlement.
**Multi-country relevance:** No direct country-specific driver, but markets with high free-tier adoption (emerging markets) are most likely to produce tenants that exploit unlimited catalog creation; limits incentivise upgrades.

### ✅ Product Approval Workflow
**Why:** Products are created with `status=DRAFT` and can be published to `ACTIVE` by any tenant `ADMIN` immediately; there is no editorial review step for tenants that need content moderation before products go live (e.g., a marketplace tenant where multiple sellers submit products).
**Complexity:** Medium
**Multi-tenant relevance:** Marketplace-style tenants need a `PENDING_REVIEW → APPROVED → ACTIVE` workflow; single-brand store tenants can keep the direct DRAFT → ACTIVE flow; the workflow must be per-tenant configurable.
**Multi-country relevance:** Regulated product categories (pharmaceuticals, food, electronics with safety certifications) may require a compliance check before a product is listed publicly; country-specific regulatory review steps can be modelled as intermediate approval states.

### ✅ Duplicate SKU Detection and Enforcement
**Why:** `sku` is a nullable, non-unique column on `StoreProduct` and `StoreProductVariant`; the same SKU can be assigned to multiple products within a tenant, creating ambiguity in order fulfilment, inventory management, and ERP integrations.
**Complexity:** Low
**Multi-tenant relevance:** SKU uniqueness must be enforced per-tenant (a SKU collision in tenant A does not affect tenant B); the constraint belongs at the DB level with a `@Unique(['tenantId', 'sku'])` index once `sku` is required.
**Multi-country relevance:** ERP and logistics systems used in multi-country operations (SAP, Oracle NetSuite) treat SKU as the primary product identifier; duplicate SKUs break warehouse management systems and cross-border fulfilment workflows.

### ✅ Tenant-Configurable Default Currency
**Why:** `StoreProduct.currency` and `StoreBundle.currency` default to hardcoded `'USD'` at the entity level; every tenant creating new products must manually change the currency, and a Turkish tenant who forgets gets USD prices in their TRY storefront.
**Complexity:** Low
**Multi-tenant relevance:** A `storeDefaultCurrency` setting read at product/bundle creation time would default new records to the tenant's configured currency, eliminating the manual step and reducing misconfiguration risk.
**Multi-country relevance:** The default currency is entirely country-determined; a Turkish tenant needs TRY, a German tenant EUR, a US tenant USD — the current hardcoded `USD` default is wrong for every non-US tenant.
