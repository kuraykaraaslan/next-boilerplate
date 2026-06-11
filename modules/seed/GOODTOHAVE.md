# Good to Have — Seed

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Multi-Country Demo Data

### Locale-Aware Product & Content Data
**Why:** All seeded store products, dynamic pages, and notifications use hardcoded English strings; a multi-country boilerplate should ship demo data in multiple locales to validate i18n rendering end-to-end.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants purchasing the boilerplate to serve non-English markets expect localised demo data that proves the platform works in their language, not just placeholder English text.
**Multi-country relevance:** Seeding Turkish, German, French, and Arabic product names and descriptions lets developers verify locale-aware rendering, RTL layout, and character encoding across the full data pipeline from DB to UI.

### Country-Specific Tax & Currency Data
**Why:** The `payment_tax` seeder creates a single generic tax class; it does not seed real-world tax structures (EU VAT rates per member state, Turkish KDV, US state sales tax, Brazilian ICMS) that are needed to test multi-country tax calculation.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants operating across multiple countries need tax configuration seeded for each jurisdiction they sell into; a single generic tax class does not exercise the tax module meaningfully.
**Multi-country relevance:** Each country has distinct tax rate names, percentages, and applicability rules; seeding real examples (e.g. TR KDV 20%, DE VAT 19%, UK VAT 20%) allows developers to verify tax calculation logic regionally.

### Country-Specific Shipping Method Data
**Why:** The `payment_shipping` seeder creates generic shipping methods without modelling country-of-origin, destination restrictions, or carrier names relevant to specific markets (e.g. PTT for Turkey, DHL Europe, USPS for US).
**Complexity:** Low
**Multi-tenant relevance:** A tenant onboarding their e-commerce store needs shipping methods pre-configured for their primary shipping region, not abstract "Standard Shipping" placeholders.
**Multi-country relevance:** Cross-border shipping rules (prohibited items, customs zones, delivery time zones) vary by country pair; seeding realistic carrier-country mappings lets developers test shipping eligibility logic.

### Multi-Currency Price Seeding
**Why:** All seeded product prices are single numeric values with no currency attached; there is no demo data showing a product priced in USD, EUR, and TRY simultaneously to exercise multi-currency display and conversion logic.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants selling internationally need a seed dataset that proves the platform can hold and display prices in multiple currencies for the same product.
**Multi-country relevance:** A boilerplate targeting multiple countries must demonstrate that the data model, seed data, and UI all handle currency diversity; a single-currency seed hides latent bugs.

## Seed Profiles & Environments

### Named Seed Profiles (minimal, demo, stress)
**Why:** `runSeed` always runs all 40+ seeders and creates the same fixed dataset; there is no "minimal" profile for CI/CD (just user + tenant), "demo" for sales demos, or "stress" for load testing with N tenants and M products.
**Complexity:** Medium
**Multi-tenant relevance:** CI pipelines seeding all 40 modules for every test run are slow; a `minimal` profile that seeds only the modules needed for a given test suite dramatically reduces test cycle time.
**Multi-country relevance:** A "multi-country demo" profile could seed one tenant per target country with locale-appropriate data in a single command, accelerating sales demos for region-specific prospects.

### Per-Tenant Seed Profile Override
**Why:** The runner always seeds every tenant identically; there is no way to seed one tenant with a retail store dataset and another with a SaaS subscription dataset within the same `runSeed` call.
**Complexity:** Medium
**Multi-tenant relevance:** A boilerplate that supports multiple business types (e-commerce, SaaS, marketplace) should be able to seed representative demo tenants for each type so developers can compare them side-by-side.
**Multi-country relevance:** Country-specific regulatory data (e.g. KVKK consent records for TR tenants, GDPR DPA records for EU tenants) should only be seeded for the relevant tenant, not globally.

### Environment-Aware Seed Guard
**Why:** `runSeed` can be called in any `NODE_ENV` including `production`; there is no guard that blocks accidental execution against a live database, no dry-run mode, and no confirmation prompt.
**Complexity:** Low
**Multi-tenant relevance:** A platform with live tenant data must never have demo seed data accidentally injected; a guard that rejects execution when `NODE_ENV=production` unless an explicit override flag is passed prevents this.
**Multi-country relevance:** No direct country relevance, but production guard is a baseline operational safety requirement in any deployment.

## Seeder Framework Improvements

### Parallel Seeder Execution for Independent Tiers
**Why:** `runSeed` executes all seeders sequentially in a `for` loop; seeders within the same dependency tier (e.g. `user_profile`, `user_security`, `user_preferences` all depend only on `user`) could run in parallel to reduce total seed time.
**Complexity:** Medium
**Multi-tenant relevance:** Seeding N tenants sequentially is prohibitively slow for platform initialization scripts; parallel tier execution and parallel multi-tenant seeding are both needed to seed a realistic tenant roster quickly.
**Multi-country relevance:** Seeding a separate tenant for each of 20 target countries currently takes 20× the single-tenant seed time; parallel execution would reduce this to approximately 1× per tier depth.

### Seeder Dependency Declaration
**Why:** The dependency order between seeders is encoded as a comment in the `SEEDERS` array and enforced only by array position; there is no machine-readable dependency graph, making it easy to insert a new seeder in the wrong position.
**Complexity:** Medium
**Multi-tenant relevance:** As the platform adds more domain modules (loyalty, gifting, marketplace), maintaining the correct manual order becomes error-prone; a declared dependency graph enables the runner to compute the order automatically.
**Multi-country relevance:** Country-specific seeders (e.g. `seedTurkeyESignature`, `seedEuVat`) need to declare their dependencies on base seeders; a graph-based runner can compose these without rewriting the entire order.

### Seed Snapshot / Export for Test Fixtures
**Why:** There is no way to capture the state of the database after a successful seed run as a SQL dump or JSON fixture that can be loaded directly in tests; every test run must re-execute the full seeder chain.
**Complexity:** High
**Multi-tenant relevance:** Test suites that depend on seeded data restart the seeder for every test run, creating slow and flaky tests; a snapshot can be loaded in milliseconds, decoupling test speed from seed complexity.
**Multi-country relevance:** Country-specific test fixtures (e.g. a snapshot with TR locale, TRY currency, and KDV tax rates) can be committed to the repo and loaded selectively for regional feature tests.

## Data Quality & Validation

### Seeder Post-Run Assertion Suite
**Why:** After `runSeed` completes, there are no assertions that verify the seeded data is internally consistent (e.g. every cart item references a real product, every invoice line has a non-zero amount); failures are only discovered when the UI or API is exercised manually.
**Complexity:** Medium
**Multi-tenant relevance:** A corrupt seed dataset (caused by a bug in a new seeder) creates confusing UI behaviour for every developer using the dev environment; automated post-seed assertions catch this immediately.
**Multi-country relevance:** Country-specific data constraints (e.g. Turkish tax ID format, EU VAT number format) should be validated as part of the seed assertion suite to ensure demo data passes real-world validation rules.

### Realistic Faker-Based Data Generation
**Why:** All seeded data uses hardcoded literals (`demo-product-1`, `test@example.com`); using a locale-aware fake data library (e.g. `@faker-js/faker`) would generate realistic names, addresses, phone numbers, and product titles that better represent production data.
**Complexity:** Low
**Multi-tenant relevance:** Demo data with realistic names and content is more convincing for sales demonstrations to prospective enterprise tenants who evaluate the boilerplate as a starting point.
**Multi-country relevance:** `@faker-js/faker` supports locale-specific data generation (`tr`, `de`, `ja`, `ar`, etc.); locale-aware seeds produce addresses, phone numbers, and personal names that are realistic for each target country.
