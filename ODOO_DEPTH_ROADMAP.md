# Odoo-Depth Roadmap — non-system workspaces

> Generated from a parallel module analysis. Scope: every workspace **except `system`**.
> Reference depth bar = the pattern already shipped for `order`/`accounting`/`inventory`:
> **detail page + inline line items + status workflow + computed totals + tenant-configurable master-data + reports + cross-document smart-links.**

## Already at Odoo depth (Phase 0 — done)
`order`, `procurement`, `accounting`, `inventory`, `supplier`, `payroll`, `hr`, `form_builder`, `navigation` (+ `redirect` minimal).
Configurable master-data live: Leave Types, Journals, Units of Measure, Movement Reasons, Salary Components, Supplier Categories.

## Scope analyzed: 37 modules — 13 High · 16 Med · 8 Low

---

## Phase 1 — High priority (biggest business value)

### `store`  —  effort M · commerce-catalog
Mature catalog module with full master-detail UI for Products, Categories, and Bundles. Each detail page uses TabGroup with multiple panels (General, Specs, Variants, Images, Gallery, SEO). Product detail shows base pricing, inventory, status (DRAFT/ACTIVE/ARCHIVED/OUT_OF_STOCK), and inline variant/image/spec management. Bundle detail includes line items with quantity and price overrides.

**Documents (master-detail + workflow):**
  - **Product** — `StoreCategory` → lines: `StoreProductVariant`  ·  workflow: `DRAFT->ACTIVE->ARCHIVED with OUT_OF_STOCK flag`  ·  totals: basePrice, salePrice, multi-currency priceList, computed total via bundle/variant
  - **Bundle** — `StoreProduct` → lines: `StoreBundleItem`  ·  workflow: `DRAFT->ACTIVE->ARCHIVED->SCHEDULED`  ·  totals: bundlePrice (nullable=auto-sum), discountPercent, computed final price
  - **Category** — `StoreCategory (parent)` → lines: `StoreCategorySpec`  ·  workflow: `none (structural only)`

**Configurable master-data:** ProductStatus options (currently hardcoded: DRAFT/ACTIVE/ARCHIVED/OUT_OF_STOCK); BundleStatus options (currently hardcoded: DRAFT/ACTIVE/ARCHIVED/SCHEDULED); CategorySpecType templates (TEXT/NUMBER/BOOLEAN/SELECT/MULTISELECT/DATE/COLOR) — already configurable per category but not tenant master-data; VariationDisplayType options (TEXT/COLOR_SWATCH/IMAGE_SWATCH/BUTTON/DROPDOWN) — currently in code; Product tags (no tag master-data, free-form strings); Currency codes (hardcoded DEFAULT_CURRENCY, no currency master list); Shipping zones/categories (not present, needed for commerce depth)

**Reports:** Product Catalog Report (by category, status, price range, with stock levels); Bundle Performance Report (usage frequency, discount impact, margin analysis); Category Structure Report (hierarchy, product count, average specs per category); Inventory Aging Report (products with no sales in X days); Variant Sales Analysis (which variant combinations sell best); Multi-Currency Price Comparison Report (price list vs. country overrides effectiveness); Tax/Compliance Reports (SEO metadata coverage, spec completeness by category)

**Cross-document links:** Product -> Orders (smart button showing number of orders containing this product); Product -> Cart Items (count of items in active carts); Product -> Reviews (link to product_review aggregates, star count); Bundle -> Bundled Products (drill-down to each product's detail); Category -> Products (already exists via list, but needs detail breadcrumb improvement)

_Notes: Store is already quite rich (multi-image, variants, bundles, specs, tags, rich HTML description). To reach Odoo depth: add workflow state-machine with action buttons (e.g. 'Activate', 'Archive'), implement tenant-configurable master-data for all enums (Status, VariationType, Currency, Tags), add computed fields (effective price with currency conversion, bundle savings %), add detail-page action buttons (Duplicate, Archive, Move to Bulk), and cross-links to downstream sales/orders. Bundle items need visual line-item editor (inline add/remove). Already has some depth; gaps are workflow actions and configuration UI._

### `product_review`  —  effort M · commerce-catalog
Framework-agnostic service layer only (no UI, no API routes defined in module.json). Handles moderation lifecycle (PENDING->APPROVED/REJECTED/SPAM), per-product rating summaries, helpful voting. Entities: ProductReview (rating 1-5, verified purchase flag, status) and ProductReviewVote (helpful count). No admin interface built yet.

**Documents (master-detail + workflow):**
  - **ProductReview** — `StoreProduct` → lines: `ProductReviewVote`  ·  workflow: `PENDING->APPROVED|REJECTED|SPAM with moderation notes`  ·  totals: helpfulCount (count of isHelpful=true votes), product summary (avg rating, star distribution)

**Configurable master-data:** ReviewStatus options (PENDING/APPROVED/REJECTED/SPAM — currently enum only, no config UI); Moderation rules (auto-approval threshold, spam keyword lists, verified-purchase badge rules); Rating scale (currently hardcoded 1-5, could make configurable 1-3, 1-10, etc.); Review visibility rules (show unverified purchases? hide by age? hide low ratings?)

**Reports:** Review Summary by Product (avg rating, count by star, helpful/not-helpful split); Moderation Queue Report (pending reviews, oldest first, high-priority flagged); Reviewer Engagement Report (most active reviewers, helpful-rate leaderboard); Review Sentiment/Quality Report (word frequency, average review length, spam catch rate); Verified Purchase vs. Unverified Comparison (rating bias, review length difference); Time-series Rating Trend (avg rating over time, volatility)

**Cross-document links:** ProductReview -> StoreProduct (drill to product detail); ProductReview -> User (link to reviewer profile, if userId present); ProductReview -> Order (link to orderId proof-of-purchase if provided)

_Notes: Module is backend-only (no UI/routes). To reach Odoo depth: build admin moderation dashboard (list pending, approve/reject/mark-spam with batch actions), detail page with review text, votes, metadata, and action buttons, configurable moderation rules (thresholds, keyword lists), per-product rating summary widget (sparkline, average stars, star distribution). Vendor/merchant dashboard showing ratings and trending. Customer-facing review submission form not present (belongs in storefront, outside this admin module). Currently missing: admin list/detail pages, batch moderation, mod notes/audit trail, flagging system (report review as inappropriate)._

### `payment_return_rma`  —  effort M · commerce-finance-logistics
RMA module has service layer with entities (ReturnRequest, ReturnItem, ReturnEvent) and a status workflow (REQUESTED → APPROVED → RECEIVED → REFUNDED → COMPLETED with optional REJECTED/CANCELLED terminal states). Event log is append-only and accessible via service API. No admin UI exists. Integration with payment_sell for actual refund issuance is built but not surfaced.

**Documents (master-detail + workflow):**
  - **Return Request** — `ReturnRequest` → lines: `ReturnItem (existing)`  ·  workflow: `REQUESTED → APPROVED → RECEIVED → REFUNDED → COMPLETED (or REJECTED / CANCELLED)`  ·  totals: refundAmount (single total per RMA; computed from line refunds or manual override)

**Configurable master-data:** Return policies (returnWindowDays, auto-approval threshold, who may approve — today only hardcoded TERMINAL_STATUSES); RMA numbering scheme (rmaNumberPrefix, format — today hardcoded as 'RMA-' + 8 hex); Default return currency (today hardcoded 'USD'; should be tenant's primary currency); Return item conditions (UNOPENED/USED/DAMAGED/DEFECTIVE/OTHER enums)

**Reports:** Return rate by product / category; RMA volume and value by period; Return reason analysis (most common reasons for business improvement); Refund aging (average time REQUESTED → REFUNDED)

**Cross-document links:** ReturnRequest → Order (orderId link; show order details panel with original purchase); ReturnRequest → Payment (paymentId link; show original payment + refund status); ReturnRequest → Fulfillment (reverse-link; fulfillment.returnRequestId field exists)

_Notes: RMA has service layer + workflows + event log, but zero UI. Entities are solid; service implements full lifecycle. Gaps: (1) admin list page with filters by status/rmaNumber/orderId, (2) detail page with ReturnItem table + timeline of ReturnEvents, (3) workflow action buttons (Approve/Reject/Mark Received/Refund/Complete/Cancel), (4) refund integration UI (show payment link, refund status), (5) smart buttons to Order + Payment. Configuration currently hardcoded — could expose return policy + numbering in tenant settings. Event log pattern is already there but not surfaced in UI._

### `metering`  —  effort M · commerce-finance-logistics
Metering has entities (MeterDefinition, MeteredUsageEvent, MeteredBillingRun) with usage aggregation (SUM/MAX/LAST), settlement workflow (prepaid credit vs overage invoice), and two-rail billing. Admin UI exists with meter list, usage tracking, billing run list. Service layer handles idempotent settlement with wallet debit + invoice creation.

**Documents (master-detail + workflow):**
  - **Meter** — `MeterDefinition` → lines: `MeteredUsageEvent (existing; immutable usage records)`  ·  workflow: `ACTIVE (meter) → events accumulated → BillingRun with PENDING/COMPLETED/FAILED status`  ·  totals: includedQuantity (free allowance), currentPeriodTotal (aggregated events), overage (if > included)
  - **Billing Run** — `MeteredBillingRun` → lines: `NEW: metered_billing_run_items (invoice lines + wallet transactions per run)`  ·  workflow: `PENDING → COMPLETED / FAILED (settlement runs are batched and idempotent)`  ·  totals: totalIncludedQuantity, totalOverageQuantity, totalWalletDebit, totalInvoiceAmount

**Configurable master-data:** Meters (MeterDefinition: key, name, aggregation, includedQuantity, unitPrice, currency); Billing cycle definition (billing_cycle: monthly, annual, or per-subscription plan — today in meta); Overage rounding (how to round overage quantities and prices — today implicit in service)

**Reports:** Usage variance report (actual usage vs plan included; per meter, per tenant); Overage revenue (total overage invoiced, by meter, by period); Settlement audit trail (wallet debits vs invoice totals for each billing run); Meter adoption (active meters per subscription plan)

**Cross-document links:** Meter → Invoice (overage invoices created per billing run; show invoice link on billing run detail); Meter → Wallet (prepaid wallet credits debited during settlement; show wallet transaction link); Meter → Subscription (meter definitions scoped to subscription plan; show plan on meter detail)

_Notes: Metering already has core service + UI. Gaps: (1) billing run detail page showing line items (wallet debits + invoice created), (2) computed totals summary for each run, (3) cross-document smart buttons to Invoice + Wallet, (4) settlement audit trail / reconciliation report, (5) meter-level aggregation dashboard (actual usage trending). Billing cycle definition + overage rounding logic are today implicit in metadata; could be explicit per-tenant settings. Settlement logic is solid (idempotent, two-rail); UI just needs to surface it._

### `payment`  —  effort M · commerce-payments
Admin UI for Plans (list + detail pages with product picker, feature management) and Payments (list + detail with refund modal and transaction ledger). Entities: SubscriptionPlan, PlanFeature, Payment, PaymentTransaction. No workflow states beyond status enum; minimal master-detail depth (basic list views, basic detail forms).

**Documents (master-detail + workflow):**
  - **Payment** — `Payment` → lines: `PaymentTransaction`  ·  workflow: `PENDING->PROCESSING->COMPLETED->REFUNDED | FAILED->CANCELLED`  ·  totals: amount, refundedAmount (computed from REFUND transactions), disputeAmount
  - **SubscriptionPlan** — `SubscriptionPlan` → lines: `PlanFeature`  ·  workflow: `DRAFT->ACTIVE->ARCHIVED (via status field)`
  - **Invoice (NEW)** — `Invoice` → lines: `InvoiceLine`  ·  workflow: `DRAFT->ISSUED->PAID->VOID`  ·  totals: subtotal, taxAmount, totalAmount, amountDue, paidAmount

**Configurable master-data:** payment_methods (e.g., card, bank_transfer, wallet); dispute_reasons (chargeback reason codes); refund_policies (full, partial, no-refund); currencies_accepted (tenant-configurable, not hardcoded)

**Reports:** Payment reconciliation (settled vs pending); Refund aging analysis; Dispute trends (won/lost/pending); Revenue by provider; Payment success rates by provider/method

**Cross-document links:** Payment -> Subscription (if paymentId linked to subscription renewal); Payment -> Order (if from order checkout, cross-module link); Invoice -> Payments (paid line items)); Payment -> Disputes (chargeback records)

_Notes: Already has line items (PaymentTransaction); workflow state mostly exists in status field but needs explicit state machine with action buttons (Refund, Void Dispute, Reverse Refund). Invoice document needed for accounting. Missing: detail page tabs (Overview, Transactions, Disputes, Notes), smart-button links to related subscriptions, tenant-configurable master data (payment methods, dispute codes)._

### `payment_subscription`  —  effort M · commerce-payments
No admin UI (no pages, no routes, no menu items). Entities: Subscription, SubscriptionPlan, PlanFeature. Services exist for plan/feature CRUD and subscription lifecycle (cancel, pause, resume, changePlan with proration). Designed as a library module.

**Documents (master-detail + workflow):**
  - **Subscription** — `Subscription` → lines: `NEW: SubscriptionInvoice (one per billing cycle)`  ·  workflow: `TRIALING->ACTIVE->PAUSED->ACTIVE | PAST_DUE->ACTIVE | CANCELLED->EXPIRED`  ·  totals: amount (from plan), totalInvoiced (sum of invoices), amountDue (from past-due invoices)
  - **SubscriptionPlan** — `SubscriptionPlan` → lines: `PlanFeature`  ·  workflow: `DRAFT->ACTIVE->ARCHIVED`

**Configurable master-data:** billing_periods (daily, weekly, monthly, quarterly, yearly as enum, but could be user-defined custom intervals); proration_methods (pro-rata, full-period, full-month); dunning_policies (retry schedule, email cadence)

**Reports:** MRR (monthly recurring revenue) by plan; Churn rate by cohort; Upgrade/downgrade flow (plan changes); Trial conversion; Subscription lifecycle (active, cancelled, past-due breakdown)

**Cross-document links:** Subscription -> Plan + Product (embedded nav); Subscription -> Invoices (issued + unpaid); Subscription -> Payments (collection ledger); Subscription -> Customer (soft link to user)

_Notes: Core domain model is solid but lacks admin UI entirely. Needs: subscription list/detail pages, plan management UI (move from payment module if it currently exists there), invoice issuance workflow, dunning (past-due retry), billing dashboard, smart buttons (cancel, pause, resume, change plan with proration preview). PlanFeature is reused from tenant_subscription; ensure single source of truth. Proration service exists; leverage it in the UI._

### `dynamic_page`  —  effort M · content
Block-based page builder with pages, block library, and per-language translations. Supports DRAFT/PUBLISHED/ARCHIVED status, scheduling (publishAt/expireAt), cache control, password protection. Has page editor + block editor. Pages can target audiences by country/language.

**Documents (master-detail + workflow):**
  - **Dynamic Page** — `DynamicPage` → lines: `DynamicPageBlock (via sections array)`  ·  workflow: `DRAFT -> PUBLISHED -> ARCHIVED`  ·  totals: block count, translation count, last-published date
  - **Block Definition** — `DynamicPageBlock`  ·  totals: usage count (how many pages use this block)
  - **Page Translation** — `DynamicPageTranslation`

**Configurable master-data:** Page status types (currently hardcoded: DRAFT, PUBLISHED, ARCHIVED); Block categories (dropdown for organizing blocks - currently string); Allowed block types per role (partially in allowedRoles field); Page metadata templates (OG, Twitter, canonical patterns); Audience segment definitions (currently hardcoded country/language codes)

**Reports:** Page inventory by status/schedule; Block utilization (which blocks are used in how many pages); Translation coverage (which pages missing translations in which languages); Audience targeting matrix (page coverage by country/language); Scheduled events (upcoming publishes/expirations)

**Cross-document links:** Page -> Translations (tabbed detail); Page -> SEO metadata (inline panel or tab); Page -> Publishing history/versions

_Notes: Already fairly mature (versions, translations, scheduling, audience targeting). Main gaps: Odoo-style workflow UI (publish/schedule/archive buttons with status display), block usage reports, translation coverage dashboard, version history/rollback, block access control detail page. Page detail should have tabs: content, translations, audience, SEO, schedule._

### `seo`  —  effort M · content
Polymorphic SEO metadata (title, description, OG tags, canonical, noIndex) attachable to any entity via entityType+entityId. Edited inline via seo-panel.component on detail pages; main /admin/seo page is scaffolded.

**Documents (master-detail + workflow):**
  - **SEO Metadata** — `SeoMeta`  ·  totals: coverage (% of content with SEO metadata filled)

**Configurable master-data:** SEO template presets (per entity type: blog posts, pages, products, etc.); Canonical URL patterns (rewrite rules for normalized URLs); OG/Twitter card defaults (site-wide image, fallback descriptions); Indexability rules (which entity types should be noIndex by default); URL structure/permalink patterns (entity -> canonical URL mapping)

**Reports:** SEO coverage audit (% of each entity type with title/description/keywords filled); Duplicate title/description detection; Web Vitals by page (already collecting via web-vitals.client.ts); Indexability audit (pages marked noIndex, blocked by robots.txt, etc.); Sitemap generation status

**Cross-document links:** SEO -> Linked entity (clickable link to blog post, page, product, etc.)

_Notes: Thin core (one entity, no line items), but high strategic value for discovery. Main gaps: tenant-wide dashboard showing coverage metrics, coverage audit reports by entity type, SEO health scoring, template picker (pre-fill forms), Web Vitals dashboard, structured data schema validators (JSON-LD), canonical URL conflict detection, robots.txt + sitemap.xml management UI._

### `webhook`  —  effort M · developer
List page with create/edit modals, delivery modal showing detail table. Two entities (webhook + webhook_delivery child). Webhook has tags, event filters, headers, circuit breaker state. Delivery tracks status/attempts/response. UI has metrics cards, test trigger, and redeliver actions. No multi-tab detail page; settings screen for tenant-scoped delivery config.

**Documents (master-detail + workflow):**
  - **Webhook Endpoint** — `webhook` → lines: `webhook_delivery`  ·  workflow: `PENDING->SUCCESS|FAILED->DEAD_LETTERED (auto-retry with backoff, circuit-breaker auto-disable on consecutive failures)`  ·  totals: delivery count, success rate, avg/p95 latency

**Configurable master-data:** Event catalog (events per scope — tenant-local vs platform-wide); Delivery retry strategy (max attempts, backoff delays, timeout); Circuit breaker thresholds (failure count before auto-disable); Rate limiting defaults (per-minute delivery cap)

**Reports:** Delivery report (status breakdown, by webhook, by event type, date range); Failure analysis (dead-lettered deliveries, error patterns, response codes); SLA/reliability metrics (success rate over time, auto-disabled endpoints)

**Cross-document links:** Webhook → Related Deliveries (drill into delivery detail modal already exists); Webhook → Events (subscribable event picker modal already exists)

_Notes: Solid foundation: entity model rich (filters, headers, rate limit, circuit breaker), delivery log present. Gap: no master-detail page with tabbed detail (overview/deliveries/settings on same page). Configurables are mostly setting-driven already; master-data for event catalog could be UI-driven. Reports are valuable for debugging + SLA visibility._

### `integrations_hub`  —  effort M · developer
Two pages: connectors catalog (create/edit modal) and connected apps (list + disconnect modal). Four entities: Connector (catalog), ConnectedApp (connection state), OAuthToken (encrypted, separate table), IntegrationEvent (audit log). No detail page per connected app; no tabs. UI covers connect flow (OAuth redirect, API key reveal) and app listing.

**Documents (master-detail + workflow):**
  - **Connected App** — `connected_app` → lines: `integration_event`  ·  workflow: `PENDING_AUTH->CONNECTED->DISCONNECTED (manual or due to token expiry/rotation)`  ·  totals: event count, last sync, trigger/action counts
  - **Connector** — `connector`

**Configurable master-data:** Integration categories (category taxonomy — currently hardcoded 'other'); Auth type templates (OAUTH2, API_KEY, WEBHOOK_ONLY — could be per-tenant customizable); Trigger/action definitions (per connector; could be tenant-editable or locked to publisher)

**Reports:** Integration usage report (connections per connector, by user, by date); Event audit log (outbound triggers, inbound actions, errors, by date/connector); Token refresh audit (OAuth token lifecycle, refresh count, failures)

**Cross-document links:** Connected App → Related Webhooks (outbound delivery via integration.trigger_fired event); Connected App → API Key (inbound action auth); Connector → Connected Apps (how many live connections per connector)

_Notes: Rich data model (OAuth token encryption, audit log). Gaps: no detail page per connected app with tabs (settings/events/logs). Connector catalog is master-data; could allow tenant-level customization or lock to publisher. Event audit log exists but not surfaced in UI. OAuth token lifecycle visibility missing._

### `approval`  —  effort M · operations
Generic entity-agnostic approval queue (single table ApprovalQueueItem). List shows status/priority/SLA-due, modal accepts approve/reject/escalate decisions. Has PENDING→IN_REVIEW→APPROVED/REJECTED/ESCALATED workflow with tamper-evident hash chain. No cross-link to actual entity being reviewed, no detail page, SLA buckets & priority levels are hard-coded.

**Documents (master-detail + workflow):**
  - **Approval Queue Item** — `ApprovalQueueItem`  ·  workflow: `PENDING → IN_REVIEW → APPROVED / REJECTED / ESCALATED`  ·  totals: reviewTime (SLA-tracked), escalationCount, decisionCount, averageReviewDuration

**Configurable master-data:** Priority buckets (0/1/2/3) with per-tenant SLA hours; Approval workflows / decision paths per entity-type (some types may allow only APPROVE/REJECT, others may require escalation tier); Entity-type categories (e.g., 'store_product', 'blog_post', 'user_profile' – master-data to control which types can be submitted)

**Reports:** SLA compliance report (approval items meeting/breaching SLA due dates); Approver workload & decision metrics (per-reviewer approval rate, escalation rate, average review time); Entity-type breakdown (approvals by entity type, approval rate per type); Approval trend analysis (volume over time, decision distribution, bottleneck detection)

**Cross-document links:** Approval item → linked entity (smart-button to jump to the actual entity under review, e.g., the store_product row); Approval item → related approvals (same entity, same approver)

_Notes: Module is purely infrastructure (no business-specific entities). Main gaps are: entity smart-links (UI needs entity-type-aware link builder to jump to the external entity), tenant-configurable priority/SLA rules per entity-type, and reports/analytics. Hard-coded bucket logic should move to a per-tenant configuration table. Approval workflows are currently fixed (PENDING→IN_REVIEW→decide); extensibility per entity-type would require policy tables. Moderate effort for cross-link plumbing, higher value for reporting._

### `order_fulfillment`  —  effort L · commerce-finance-logistics
Order fulfillment has scaffold entities (Fulfillment, FulfillmentItem, FulfillmentEvent, Warehouse) with status field (PENDING default) and carrier/tracking info. No UI page exists — placeholder says 'coming soon'. Event log pattern is in place but not surfaced.

**Documents (master-detail + workflow):**
  - **Fulfillment** — `Fulfillment` → lines: `FulfillmentItem (existing)`  ·  workflow: `PENDING → PACKED → SHIPPED → DELIVERED / RETURNED / CANCELLED (inferred from carrier logic; not enforced)`  ·  totals: none (fulfillment is line-item mirror, not aggregated totals)

**Configurable master-data:** Carriers (carrier field: 'ARAS','YURTICI','MNG','PTT','UPS','FEDEX','DHL','TNT','CUSTOM'); Warehouses (Warehouse entity exists; master-data for origins); Shipping methods (linked via shippingMethodId to payment_shipping module); Fulfillment status enums (PENDING/PACKED/SHIPPED/DELIVERED/etc. not yet formalized)

**Reports:** Fulfillment SLA report (avg time PENDING→SHIPPED); Carrier performance (avg delivery time, exception rate by carrier); Warehouse volume (shipments out per warehouse); Stock/inventory aging by warehouse

**Cross-document links:** Fulfillment → Order (orderId link; show order details panel); Fulfillment → Return/RMA (returnRequestId field exists; link to RMA record); Fulfillment → Shipping Method (shippingMethodId; show method + rate info)

_Notes: Fulfillment is scaffolded, not yet built. Entities model a packing/shipment flow but UI is missing entirely. To reach Odoo depth: (1) build list page with filters by status/carrier/warehouse, (2) add detail page with FulfillmentItem table + event log, (3) formalize status workflow (PENDING→PACKED→SHIPPED→DELIVERED with action buttons), (4) add warehouse selector at packing, (5) wire carrier tracking URL, (6) add smart buttons to Order + RMA. Event log already exists in entity but not surfaced._

### `tenant_subscription`  —  effort L · crm
Rich subscription page with plan selection, payment provider selector (Stripe/Iyzico), current plan card, and grace-period banner. One entity (tenant_subscription) with planId, status, billing period, trialEndsAt, gracePeriodEndsAt. Multiple payment flows (hosted, express, direct card, 3DS). No detail history, no invoice lines, no line items.

**Documents (master-detail + workflow):**
  - **Subscription** — `tenant_subscription` → lines: `NEW: subscription_transactions (payment history, credits, adjustments)`  ·  workflow: `TRIALING->ACTIVE (on payment confirmation)->PAST_DUE (after period end)->EXPIRED; or CANCELLED at any time`  ·  totals: computed: nextBillingDate (from currentPeriodEnd), daysSinceExpiry, gracePeriodDaysRemaining, outstandingBalance (if past due)
  - **Invoice** — `tenant_subscription` → lines: `NEW: invoice_line_items (plan base fee, addon charges, credits, tax if applicable)`  ·  workflow: `DRAFT->ISSUED->PAID/VOID`  ·  totals: computed: subtotal, tax, total, amountPaid, amountDue

**Configurable master-data:** subscription_plans (already admin-configurable per module.json; enhance with more template types: usage-based, fixed, seat-based); payment_methods (Stripe/Iyzico; could expose per-tenant enable/disable + priority); billing_cycle_start_day (e.g., aligned to calendar or anniversary date); grace_period_duration_days (currently internal logic; expose as tenant config); tax_rules (region/jurisdiction; currently minimal, could add VAT/GST templates); dunning_policy (retry strategy for failed payments, invoice escalation)

**Reports:** MRR (monthly recurring revenue) trend over time; Churn rate (subscriptions cancelled, date ranges); ARPU (average revenue per user) by plan; Subscription aging (how old is each active sub, when does it expire); Revenue forecast (next 12 months based on renewal dates); Overdue subscriptions (past due without grace, at risk of expiry)

**Cross-document links:** Subscription -> Invoices (list all invoices for this sub); Subscription -> Payments (list payment history); Subscription -> Plan (detail view of the current plan, edit if admin); Invoice -> Payments (show which payments settled this invoice)

_Notes: Already rich in business logic (payment flows, grace period). Major gaps: no invoice document model, no payment/transaction line items, no reporting. Adding invoice entity + line items + detail tabs + reports would unlock Odoo-level billing depth. Current design is transactional (payment-first); needs document model (invoice-first) layered on top._

---

## Phase 2 — Medium priority

### `payment_shipping`  —  effort S · commerce-finance-logistics
Shipping has master-data entities (ShippingMethod, ShippingRate) but no admin UI. ShippingMethod stores carrier, rate rules by country/region/weight/subtotal. Purely configuration module; no documents or workflows.

**Configurable master-data:** Shipping methods (ShippingMethod entity: name, code, carrier, isActive, sortOrder, metadata); Shipping rates by geography (ShippingRate: by country, region, weight, subtotal ranges); Carrier integrations (carriers defined as string constants in ShippingMethod.carrier)

**Reports:** Shipping cost analysis (average cost by method/route); Carrier spend breakdown (total cost per carrier across all orders)

**Cross-document links:** ShippingMethod → Fulfillment (shippingMethodId link; show method on fulfillment detail)

_Notes: Pure configuration module. No master-detail documents, no workflows. UI gap: admin page to list/create/edit shipping methods + rate rules, with matrix by geography/weight/threshold. Already has entities; needs CRUD UI only. No cross-links needed beyond read-only reference from fulfillment. Effort is small because structure is simple (no line items, workflows, or complex state)._

### `payment_tax`  —  effort S · commerce-finance-logistics
Tax has master-data entities (TaxClass, TaxRate) but no admin UI. TaxRate supports destination matching (countryCode, region, postalCodePattern), compounding, and price-inclusive modes. Purely configuration; no workflows.

**Configurable master-data:** Tax classes (name, code; used to group product categories for different rates); Tax rates by destination (TaxRate: country, region, postal pattern, rate %, compound flag, price-inclusive flag)

**Reports:** Tax liability by jurisdiction (total taxAmount by countryCode, period)

**Cross-document links:** TaxRate → Invoice (shown in invoice line item tax breakdown; no direct smart button needed)

_Notes: Pure configuration module, no master-detail documents. Needs admin UI: list tax classes, list/create/edit tax rates with matrix by country/region/postcode pattern. Rate computation engine is in service layer (already used by invoice + checkout); UI just manages configuration. No state machine, no line items, no complex detail page needed._

### `coupon`  —  effort S · commerce-payments
Admin UI for coupons: list (search, status filter) and detail page (full edit form with scope picker for products/plans/providers, discount type/value editor). Entities: Coupon, CouponRedemption. Status: ACTIVE|INACTIVE|EXPIRED|ARCHIVED. Detailed scope JSONB (products, plans, categories, providers, appliesTo, minimumAmount, countries). No workflow; no detail tabs; basic single-page form.

**Documents (master-detail + workflow):**
  - **Coupon** — `Coupon` → lines: `CouponRedemption`  ·  workflow: `ACTIVE->INACTIVE->EXPIRED | ARCHIVED (no state machine; status is terminal)`  ·  totals: usedCount (tracked), maxUses (limit), redemptionAmount (sum of CouponRedemption.discountAmount)

**Configurable master-data:** discount_types (percentage, fixed_amount, buy-x-get-y; currently: PERCENTAGE, FIXED_AMOUNT); coupon_scope_dimensions (currently all hardcoded in scope JSONB: products, plans, categories, providers, countries)

**Reports:** Coupon redemption rate (used vs. issued); Revenue impact (total discounts given); Top coupons by usage; Coupon performance by scope (by plan, by product, by country)

**Cross-document links:** Coupon -> Redemptions (list of redemptions linked to this coupon); Coupon -> Related Coupons (similar scope or time period)

_Notes: Already fairly feature-complete (scope, limits, calendar validation, multi-currency support). Missing: detail page TABS (Overview, Redemptions, Performance), smart-button links to redemption records, batch redemption report, coupon calendar view (expiry timeline), tenant-configurable discount types as master data (instead of enum). Light touch: add tabs, link redemption ledger, add a simple Redeem history sub-grid._

### `gift_card`  —  effort S · commerce-payments
Admin UI for gift cards: list with issue bulk action, detail page showing card status (ACTIVE|REDEEMED|EXPIRED|VOID), remaining balance, initial amount, recipient, expiry. Entities: GiftCard, GiftCardTransaction. Has transaction ledger view (ISSUE|REDEEM|ADJUST|VOID). Code is hashed for security (SHA-256 codeHash); redeemable to wallet. Basic detail page with transaction tab; no workflow state machine.

**Documents (master-detail + workflow):**
  - **GiftCard** — `GiftCard` → lines: `GiftCardTransaction`  ·  workflow: `ACTIVE->REDEEMED | EXPIRED->VOID (status terminal; no action workflow)`  ·  totals: initialAmount, remainingAmount (tracked on card), totalRedeemed (sum of REDEEM transactions)

**Configurable master-data:** gift_card_denominations (e.g. $25, $50, $100; currently free-form); gift_card_expiry_months (default expiry period); gift_card_redemption_rules (partial vs full only; currently both allowed)

**Reports:** Gift card liability (unredeemed balance by expiry date); Redemption rate (issued vs redeemed); Revenue by issuer (purchaser); Expiry aging (cards expiring soon)

**Cross-document links:** GiftCard -> Wallet (redemption posts wallet credit); GiftCard -> Payment (if issued from a completed payment); GiftCard -> Redemptions (transaction ledger)

_Notes: Solid core (hash-protected codes, partial redemption, expiry job). Missing: detail page TABS (Overview, Transactions, Redemptions, Audit), action buttons (Void, Adjust Balance, Extend Expiry), redemption smart-button to wallet transaction, purchaser/recipient contact info in detail view. Add tenant-configurable denominations + expiry defaults. Cron job exists; add admin dashboard showing expiry liability._

### `media_gallery`  —  effort S · content
Polymorphic media gallery wrapper over UploadedFile, with metadata overlay (sortOrder, isPrimary, altText, title, tags). Mostly embedded in other entities' detail pages; central library page is scaffolded.

**Documents (master-detail + workflow):**
  - **Media Gallery** — `MediaGallery` → lines: `MediaGalleryItem`  ·  totals: item count, primary image, total storage size
  - **Gallery Item** — `MediaGalleryItem`

**Configurable master-data:** Image optimization profiles (dimensions, quality, format per device/use-case); Allowed MIME types (currently accepts all image types); Tag taxonomy (hardcoded tags vs. configurable tag types); Image metadata enrichment (EXIF, color analysis, dimension presets); Usage policies (where galleries can be attached: products, blog posts, pages, etc.)

**Reports:** Media library inventory (by tag, by entity type, by size/dimension); Unused images (not linked to any gallery or entity); Image performance (CDN hits, unique views per image); Storage cost breakdown

**Cross-document links:** Gallery -> Attached entities (reverse link: which posts/products use this gallery); Gallery Item -> Linked file (DriveFile if applicable, or UploadedFile)

_Notes: Light-touch module with minimal document structure. Main gaps: central media library implementation (currently scaffolded), tag/category configuration screens, bulk operations (tag, delete, organize), image metadata panel (EXIF, dimensions, alt-text editor), usage reports. Gallery-panel.component already does what's needed for inline editing; main work is building the central /admin/media hub._

### `api_key`  —  effort S · developer
Simple list page with create/revoke modals. Single entity (api_key) with flat schema: scopes, IP allowlist, active toggle, last-used tracking, usage counter, rotation support. No detail page or workflows.

**Documents (master-detail + workflow):**
  - **API Key** — `api_key`

**Configurable master-data:** Key environments (live/test/staging — currently hardcoded enum); Scope definitions and permissions (currently hardcoded: read, write, admin)

**Reports:** API Key activity report (usage count, last-used timestamp, by key, by user, by date range); Rotation audit log (key rotations, grace periods, successor tracking)

**Cross-document links:** API Key → Associated Webhooks (which endpoints use this key); API Key → Integration Events (inbound actions authenticated with this key)

_Notes: Lightweight CRUD; master-only (no line items). Configurables are minor admin master-data (enums → settings). Reports add observability. Cross-links are secondary. Core CRUD already solid._

### `payment_cart`  —  effort M · commerce-catalog
Service-only module (no admin UI/routes). Shopping cart with master-detail: Cart (owner=userId|guestToken, status ACTIVE/CONVERTED/ABANDONED/MERGED, subtotal, discountTotal, coupon) containing CartItems (productId/variantId, unitPrice, quantity). Computes totals after every mutation. Integrates with coupon module for discount validation.

**Documents (master-detail + workflow):**
  - **Cart** — `User (userId) or Guest (guestToken)` → lines: `CartItem`  ·  workflow: `ACTIVE->CONVERTED|ABANDONED|MERGED`  ·  totals: subtotal (sum unitPrice×quantity), discountTotal (coupon applied), total (subtotal-discount), itemCount

**Configurable master-data:** CartStatus options (ACTIVE/CONVERTED/ABANDONED/MERGED — hardcoded, no config); Cart expiry rules (expiresAt nullable, no auto-cleanup logic visible); Currency (default USD, no tenant currency override config); Abandoned cart thresholds (for reporting/recovery campaigns); Coupon auto-drop rules (when coupon invalidates during cart mutations)

**Reports:** Cart Abandonment Report (count by value, by user, trends); Conversion Rate by Cart Value (funnel: cart->checkout->order); Average Order Value vs. Cart Value (impact of discounts, bundling); Coupon Effectiveness (usage rate, discount distribution, ROI); Guest vs. Registered Shopper Behavior (cart size, abandonment rate); Product Velocity in Carts (which products are added/removed most); Currency/Region Analysis (cart patterns by location, currency)

**Cross-document links:** Cart -> StoreProduct (product detail from cart item); Cart -> Coupon (link to applied coupon rules); Cart -> Order (after CONVERTED, link to resulting order); Cart -> User (if userId present, link to customer profile)

_Notes: Payment_cart is a transient, short-lived object with no natural admin detail page (users don't 'edit' carts in admin). Odoo-depth means: build a Cart Monitoring dashboard (active carts by value, pending carts, recovery campaigns), configurable abandonment rules, coupon integration UI, and reporting on cart patterns (size, dwell-time, product mix). Detail view only for support/debugging (view customer's current cart, item list, coupon status). Batch actions: recover abandoned carts (trigger email). Light touch compared to persistent documents; focus on analytics and recovery mechanics rather than master-detail rigor._

### `invoice`  —  effort M · commerce-finance-logistics
Invoice module has master-detail DOCUMENTS (Invoice + InvoiceLine) with status workflow (draft → issued → paid / void), action buttons (Issue/Mark Paid/Void), line items table, and computed totals. Detail page shows customer card + amounts + regional e-invoicing state (earsivStatus/peppolStatus). Has PDF rendering with tenant-configurable appearance. Regional adapters (TR/EU/US) already enable per-tenant e-document submission.

**Documents (master-detail + workflow):**
  - **Invoice** — `Invoice` → lines: `InvoiceLine (existing)`  ·  workflow: `DRAFT → ISSUED → PAID / VOID (partial - needs refunded state detail page)`  ·  totals: subtotal, taxAmount (per-line), totalAmount, discountAmount (already computed in service)

**Configurable master-data:** Tax rates per region/country (TaxRate entity exists in payment_tax module, not hard-coded); Company/seller identity (per-tenant settings: companyLegalName, companyTaxId, etc.); Invoice numbering scheme (per-tenant prefix/padding configurable, format could be extended); Payment terms / due-date defaults (invoiceDefaultDueDays configurable); PDF appearance knobs (colors, font, language, toggles — already tenant-scoped)

**Reports:** Aged invoices / receivables aging report (by status + dueDate); Tax summary report by rate/region (for compliance auditing); Revenue recognition / cash vs accrual (by issueDate vs paidAt); Invoice volume metrics (invoice count, total amount issued/paid per period)

**Cross-document links:** Invoice → Payments (paymentId link; smart-button to payment record if exists); Invoice → Subscription (subscriptionId link; show related subscription plan); Invoice → Return/RMA (reverse-link from payment_return_rma when refunded)

_Notes: Invoice already at medium Odoo depth. Detail page exists with workflow actions; line items table in place. Gaps: (1) refunded state needs detail page update, (2) cross-document smart buttons not yet wired, (3) aged/tax/revenue reports missing. Invoice numbering and PDF rendering are already deeply configurable per tenant. Payment term defaults + currency/VAT overrides are per-tenant settings but not exposed in UI. Low-hanging fruit: add refunded status handling, wire payment/subscription links, add 2-3 summary reports._

### `wallet`  —  effort M · commerce-finance-logistics
Wallet has double-entry ledger entities (WalletAccount, WalletTransaction, WalletPosting) with tamper-evident hash chains. Admin UI exists with account list, statement view by account, transaction history, and issue/transfer modals. Computed balance (cachedBalance) + reconciliation built. Wallet is configuration-lite but operational (active ledger).

**Documents (master-detail + workflow):**
  - **Wallet Account** — `WalletAccount` → lines: `WalletPosting (existing; immutable ledger entries)`  ·  workflow: `none (ledger is append-only; accounts are provisioned as needed)`  ·  totals: cachedBalance (denormalized running balance; authoritative = SUM of account's postings)

**Configurable master-data:** Account types (ownerType: 'USER' / 'SYSTEM' / 'TENANT'; kind for each type); Currencies (per-account currency; default USD); System accounts for contra-entries (SYSTEM_* kinds)

**Reports:** Balance sheet (per account/currency, period-end snapshots); Ledger aging / float analysis (average time from issue to spend); Currency distribution (total outstanding balance per currency); Reconciliation exception report (accounts with hash-chain breaks)

**Cross-document links:** WalletAccount → Metering (referenced by metering module for overage billing); WalletAccount → Subscription (reverse-link; prepaid credits linked to subscription plan); WalletTransaction → Invoice (refund transactions may reference invoice payment)

_Notes: Wallet already has operational UI with list/statement views. Double-entry ledger + hash chains are implemented and verified. Gaps: (1) detail page with full transaction history (per-account ledger), (2) reconciliation UI (check/repair hash chains), (3) reports (balance sheet, aging, float), (4) cross-document links to metering/subscription. Configuration is light (account types + currencies are simple enums), already wired to issuance/transfer APIs. No status workflows needed; ledger is append-only._

### `payment_loyalty_points`  —  effort M · commerce-payments
No admin UI (no pages, no routes, no menu items). Entities: LoyaltyAccount, LoyaltyTier, LoyaltyTransaction. Services: getOrCreateAccount, earn/redeem/adjust points, recomputeTier, createTier/updateTier, listTransactions, expirePoints. Append-only transaction ledger. Designed as a library module.

**Documents (master-detail + workflow):**
  - **LoyaltyAccount** — `LoyaltyAccount` → lines: `LoyaltyTransaction`  ·  workflow: `none (append-only ledger; account state managed by transaction type: EARN, REDEEM, EXPIRE, ADJUST, REVOKE)`  ·  totals: balance (current spendable), lifetimePoints (total ever earned), tier (derived from lifetimePoints)
  - **LoyaltyTier** — `LoyaltyTier`  ·  workflow: `none (master data; isActive flag)`

**Configurable master-data:** loyalty_tiers (BRONZE, SILVER, GOLD + custom; tenant-defined with minPoints, multiplier, benefits JSON, sortOrder); loyalty_earn_rules (earn on order amount, transaction, custom events); loyalty_expiry_policies (expiry period in days, configurable per tenant)

**Reports:** Points liability (total unredeemed balance); Tier distribution (users by tier); Earn/redeem ratio (velocity); Top earners / top spenders; Point expiry impact (points forfeited)

**Cross-document links:** LoyaltyAccount -> User (account owner); LoyaltyAccount -> Transactions (ledger); LoyaltyAccount -> Tier (current tier detail)

_Notes: Core service layer is complete and production-ready (FIFO expiry, tier recompute, proration). Missing entire admin UI: tenant loyalty config screen (tier CRUD, earn rules), user account lookup (balance, tier, transaction history), dashboard (points issued/redeemed/expired, tier breakdown). Add: LoyaltyTier detail page with benefits editor, LoyaltyAccount search + detail with transaction ledger and manual adjustment form, admin dashboard with points liability and tier metrics._

### `blog`  —  effort M · content
Blog posts with DRAFT/PUBLISHED/ARCHIVED lifecycle, categories, and threaded comments with moderation. Admin has list+detail pages for posts/categories, basic comment moderation UI.

**Documents (master-detail + workflow):**
  - **Blog Post** — `BlogPost` → lines: `BlogComment`  ·  workflow: `DRAFT -> PUBLISHED -> ARCHIVED`  ·  totals: comment count, view count, last-comment-date
  - **Blog Comment** — `BlogComment`  ·  workflow: `NOT_PUBLISHED -> PUBLISHED | SPAM -> DELETED`

**Configurable master-data:** Comment moderation (on/off) - already in settings; Anonymous comments policy - already in settings; Post status types (currently hardcoded: DRAFT, PUBLISHED, ARCHIVED); Comment status types (currently hardcoded: NOT_PUBLISHED, PUBLISHED, SPAM)

**Reports:** Posts by status (draft, published, archived counts); Comments backlog (pending moderation); Top posts by views; Engagement (comments per post, comment rate over time)

**Cross-document links:** Post -> Comments (detail page shows inline comment thread); Post -> Category (clickable category link)

_Notes: Already has basic workflow states and line items (comments). Main gaps: detailed workflow UI (publish/unpublish actions), category tenure (creation date, metadata detail page), comment moderation stats, engagement reports. Status enums should move to a BlogStatusType configuration entity._

### `search`  —  effort M · content
Full-text search indexer (PostgreSQL FTS) with simple search UI. Owning modules push documents via search-index route; query returns ranked hits with ts_headline snippets. No saved searches, no analytics, no faceted nav.

**Documents (master-detail + workflow):**
  - **Search Document** — `SearchDocument`

**Configurable master-data:** Search provider (currently hardcoded PostgreSQL FTS; abstraction exists for Meilisearch/Elastic); Indexable entity types (which modules push docs, which are searchable); Search language per tenant (text-search config for non-English); Facet fields (entity type, date range, custom metadata facets); Ranking/scoring weights (title vs. body importance)

**Reports:** Search analytics (top queries, zero-result queries, click-through rate by result rank); Query trends over time (seasonal patterns, new topics emerging); Index health (stale documents, missing entities, indexing lag); Search performance (query latency, index size)

**Cross-document links:** Search hit -> Linked entity (document's URL link already present)

_Notes: Core search logic is solid (provider-agnostic, FTS working, snippets working). Gaps are UX/analytics: saved searches, search history, faceted drilldown UI, trending/suggested queries, search analytics dashboard, zero-result recommendations. Search results page could have tabs: all results, by entity type, by date, with filters._

### `tenant_member`  —  effort M · crm
Simple list/grid UI for member CRUD (invite, role/status edit, remove). One entity (tenant_member) with memberRole and memberStatus fields. No detail page, no workflow, no line items or derived calculations.

**Documents (master-detail + workflow):**
  - **Member** — `tenant_member`

**Configurable master-data:** member_roles (currently hardcoded: USER/ADMIN/OWNER — could be tenant-configurable); member_statuses (currently hardcoded: ACTIVE/INACTIVE/SUSPENDED/PENDING — could be tenant-configurable); permission_matrix (which roles can perform which actions)

**Cross-document links:** Member -> Activity timeline (if audit logging expands)

_Notes: Already has roles and status tracking. Opportunities: add detail page with activity timeline, audit log integration, permission matrix configuration screen. Minimal master-detail potential since member is a singleton per user+tenant._

### `tenant_domain`  —  effort M · crm
List UI for custom domains with add/verify/delete. One entity (tenant_domain) with domain, isPrimary, domainStatus (PENDING/VERIFIED/FAILED), DNS/SSL verification fields. No detail page, no workflow display, no reports on SSL renewal.

**Documents (master-detail + workflow):**
  - **Domain** — `tenant_domain`  ·  workflow: `PENDING->VERIFIED (via DNS challenge); SSL workflow DISABLED->PENDING->ACTIVE->EXPIRING->FAILED`

**Configurable master-data:** dns_challenge_types (currently CNAME/TXT — could be tenant-configurable for restricted environments); ssl_check_interval (currently daily cron); ssl_expiry_warning_threshold (e.g., 30 days)

**Reports:** SSL certificate expiry report (when do certificates expire, which domains at risk); DNS verification age (how long since each domain was verified); Domain health snapshot (verified vs unverified, SSL active/expiring/failed)

**Cross-document links:** Domain -> Tenant (show linked tenant)

_Notes: Already has DNS + SSL state machines. Good candidate for Odoo-style detail page with status badges, workflow action buttons (re-verify DNS, force SSL check), and tabs for verification logs. Could add SLA-style reporting on cert expiry and verification uptime._

### `marketplace`  —  effort M · developer
Three pages: marketplace (install/activate/remove plugins), developer (publisher dashboard with new listing form), developer detail (tabs: overview/versions/analytics/settings). Entities: PublishedModule (listing metadata), PublishedModuleVersion (version snapshot with manifest/readme/review status), Publisher (publisher profile), ModuleInstall (tenant install state). Publisher app creation flow gated behind approval.

**Documents (master-detail + workflow):**
  - **Published Module Listing** — `published_module` → lines: `published_module_version`  ·  workflow: `DRAFT->IN_REVIEW->PUBLISHED|REJECTED->UNPUBLISHED (review gated, status badges show lifecycle)`  ·  totals: install count, active installation count, version count
  - **Module Installation** — `module_install`  ·  workflow: `PENDING->ACTIVE|FAILED->UNINSTALLED (install/uninstall actions with enable/disable toggle)`
  - **Publisher Profile** — `publisher`  ·  workflow: `PENDING->VERIFIED|REJECTED (application approval workflow, not yet surfaced in module review page)`  ·  totals: listing count, total installs

**Configurable master-data:** Module categories (category/tier master-data for filtering in marketplace); Review criteria and fields (configurable questionnaire for version submissions); Publisher tier levels (free/verified/pro — earned status vs gated behind approval)

**Reports:** Marketplace analytics (installs over time, top modules, adoption by category); Publisher stats dashboard (submissions, approvals, rejections, appeal tracking); Module health report (failed installs, uninstalls, rating/feedback if added)

**Cross-document links:** Published Module → Module Installs (which tenants have installed this); Publisher → Listings (publisher's all published modules); Module Install → Listing Version (link to the version detail, changelog)

_Notes: Already well-structured with detail page, tabs, analytics card, version tracking. Workflow state (draft→in_review→published) is present in schema but lightweight on UI affordances (no workflow buttons like 'Submit for Review', 'Approve', 'Reject'). Publisher approval state (PENDING→VERIFIED→REJECTED) exists in schema but no admin review UI for system workspace. Gap: module review page (review.page) is stubbed. Configurables are mostly hardcoded enums. Reports are missing but data model supports them._

### `support`  —  effort M · operations
Support-ticket list with basic modal detail showing threaded messages. Has OPEN→PENDING→RESOLVED→CLOSED workflow with SLA tracking by priority. UI is simple (table + modal), no detail tabs or cross-document links. SLA hours and categories are hard-coded.

**Documents (master-detail + workflow):**
  - **Support Ticket** — `SupportTicket` → lines: `SupportTicketMessage`  ·  workflow: `OPEN → PENDING → RESOLVED → CLOSED`  ·  totals: firstResponseTime (SLA-tracked), resolutionTime, agentReplyCount, requesterReplyCount

**Configurable master-data:** Ticket priorities (LOW/NORMAL/HIGH/URGENT) with per-tenant SLA hours; Ticket categories (currently nullable string, should be a master-data enum); Ticket status values (if extensible per-tenant); Assignment rules / agent pools

**Reports:** SLA compliance report (tickets meeting/breaching first-response & resolution SLAs); Agent workload & response-time analytics (per-agent average response time, ticket count, resolution rate); Customer satisfaction / ticket resolution metrics (open vs closed, resolution time trend); Ticket volume & category breakdown (by month, priority, category)

**Cross-document links:** Ticket → Related tickets (same requester email, same category); Ticket → Customer profile (if requesterUserId is known); Ticket → Related documents in other modules (e.g., Invoice if issue is payment-related)

_Notes: Module already has workflow & SLA tracking. Main gaps are UI depth (detail page with tabs for messages/metadata/activity), tenant-configurable master-data (categories, priorities, SLA rules), and analytics/reports. Cross-links would require entity-reference pattern (same as approval uses). Light-touch improvement (no new data model needed) but moderate UI/config work._

---

## Phase 3 — Low priority / light touch

### `payment_wishlist`  —  effort S · commerce-catalog
Service-only module (no admin UI/routes). Wishlists are user-owned lists (one default per user, multiple named lists supported). Each contains WishlistItems (productId, optional variantId, optional note). Supports public sharing via shareToken. Light master-detail: Wishlist containing WishlistItems with optional notes.

**Documents (master-detail + workflow):**
  - **Wishlist** — `User` → lines: `WishlistItem`  ·  workflow: `none (no lifecycle, just PRIVATE/PUBLIC visibility toggle)`  ·  totals: itemCount, price summary (sum of product prices, optional)

**Configurable master-data:** Wishlist visibility rules (PRIVATE/PUBLIC/SHARED options, currently just isPublic boolean); Item expiry (no TTL, items persist indefinitely); Pricing snapshotting (WishlistItem stores no price; could add `priceSeen` for price-tracking features); Notification rules (alert when price drops, back in stock, etc. — not present)

**Reports:** Wishlist Popularity Report (most-wished products, by category, price range); Wishlist-to-Cart Conversion Report (items added to cart from wishlist); User Wishlist Behavior (avg list count per user, items per list, public vs. private ratio); Price-Drop Opportunity Report (items on wishlist that are now on sale); Inventory Alert Report (wishlist items currently out of stock); Shared Wishlist Performance (public shares viewed, conversion to cart/order)

**Cross-document links:** Wishlist -> StoreProduct (view product from wishlist item, see current price/stock); Wishlist -> Cart (bulk 'Add all to cart' or per-item add); WishlistItem -> User (link to list owner); Shared Wishlist -> Public URL (quick link for sharing)

_Notes: Wishlist is inherently lightweight (like cart, a temporary collection, not a persistent business document). Odoo-depth would mean: customer-facing wishlist management pages (already exists in storefront, not admin), admin analytics/reporting on wishlist trends, and optional price-tracking/alerts (when item drops to wish price, notify user). Admin UI needs: wishlist listing (by user, creation date, item count), detail view (items with notes, current prices, stock status), and bulk export. Not a deep ERP document—focus is on analytics and engagement tracking. Light-touch effort; low business-value for admin tool (more valuable on storefront side). Keep simple._

### `exchange_rate`  —  effort S · commerce-finance-logistics
Exchange rate module is a utility — reads TCMB FX rates via Redis cache, converts prices to TRY for Turkish card payments via iyzico. No entities or admin UI. Purely a service layer used by payment checkout flow.

**Configurable master-data:** Base currency (USD, hard-coded in logic); Target currency for conversion (TRY, hard-coded); FX rate provider (TCMB, hard-coded; could be made pluggable); Cache TTL (Redis caching duration for rates)

_Notes: Exchange rate is a thin utility module — no data models, no workflows, no admin UI needed. It is consumed by payment checkout to convert USD plan prices to TRY for Turkish cards. Gaps: (1) FX rate history tracking (today rates are cached but not logged), (2) manual rate override UI (for outages), (3) rate variance report (actual vs TCMB). Low priority: it serves a narrow geographic need (Turkey only); little admin depth or configurability warranted._

### `tenant_invitation`  —  effort S · crm
List UI showing pending invitations with revoke action. One entity (tenant_invitation) with email, status (PENDING/ACCEPTED/DECLINED/REVOKED), role, and expiry. No detail page, no workflow display on UI, no analytics.

**Documents (master-detail + workflow):**
  - **Invitation** — `tenant_invitation`  ·  workflow: `PENDING->ACCEPTED/DECLINED/REVOKED`

**Configurable master-data:** invitation_expiry_ttl (currently hardcoded, could be tenant-configurable); invitation_template (email subject/body text); member_roles_available_for_invitation (which roles can be assigned to inviters)

**Reports:** Invitation acceptance rate (pending vs accepted vs expired/revoked); Invitation age report (oldest pending)

**Cross-document links:** Invitation -> Member (once accepted, show the resulting member)

_Notes: Light-touch onboarding module. Mostly flow logic; little admin depth needed. Status workflow exists but not displayed in UI. Could add detail page showing invitation lifecycle + resend, but low business ROI._

### `api_doc`  —  effort S · developer
Single settings page + public docs page. No entities; mostly config. Serves OpenAPI/Swagger spec for per-tenant API surface. Routes and integrations are registry-based (reads from other modules).

**Configurable master-data:** OpenAPI metadata (title, description, contact, license — tenant-branded)

_Notes: Pure tooling/documentation module with no entity model or admin depth. Does not follow Odoo pattern (no master-detail documents, workflows, or line items). Light touch appropriate: settings only. Skip deepening — this is a reference implementation, not a business object._

### `feature_flags`  —  effort M · crm
Simple list UI for feature flags with toggle, create, and edit modals. Two entities: FeatureFlag (with key, name, enabled, rolloutPercentage, targetingRules JSON) and FeatureFlagOverride (per-subject pins). No detail page, no workflow, no audit trail UI, no segment management.

**Documents (master-detail + workflow):**
  - **Feature Flag** — `feature_flag` → lines: `feature_flag_override (per-subject overrides)`  ·  totals: computed: numOverrides (count of active overrides), numTargetingRules (from JSON array)

**Configurable master-data:** targeting_rule_templates (predefined attribute/operator/value combos for common use cases); flag_categories (none currently; could group flags by feature area: 'payments', 'ui', 'api', etc.); evaluation_context_schema (what attributes are available for targeting; tenant-defined)

**Reports:** Flag rollout dashboard (which flags are active, rollout %, override count); Segment report (if segments are formalized: how many users/sessions match each segment); A/B test impact (if flags are used for experiments: conversion/engagement metrics by flag state)

**Cross-document links:** Feature Flag -> Overrides (list of all user/segment pins for this flag); Feature Flag -> Audit Log (show all flag mutations + who changed it)

_Notes: Already highly sophisticated evaluation engine (rules, rollout, overrides, Redis caching, audit logging). Gaps are mostly UI/reporting: no detail page for targeting rule management, no segment definition UI, no flag impact analytics. This is a platform tool (not core business domain); low priority for Odoo depth._

### `analytics`  —  effort M · crm
Simple analytics summary page with date range selector, stat cards (total events, unique users/sessions), top-events table, and timeseries chart. One entity (analytics_event, append-only). Read-only reporting, no drill-down, no user/event filtering, no cohort analysis.

**Configurable master-data:** event_schema (what custom events are valid; currently untyped JSONB properties); event_categories (group events by type: 'engagement', 'commerce', 'support', etc.); retention_policy (currently unlimited; could add TTL for archival)

**Reports:** Funnel analysis (e.g., signup -> first purchase -> repeat; drill into drop-offs); Cohort retention (group users by signup/first-purchase date; track retention over time); User journey (path analysis: common sequences of events leading to conversion); Event volume by source (utm_source, referrer, user segment); Segment health (engagement, activity trends within user segments)

_Notes: Append-only event log architecture is sound. Reporting is minimal (only summary + timeseries + top-events). Gaps: no drill-down filters, no funnel/cohort/retention analysis, no user journey UI, no event schema validation/exploration. This is a read-heavy analytics module; Odoo-depth would require advanced reporting (funnels, cohorts, user flows) not typical of Odoo but common in analytics platforms._

### `payment_sell`  —  effort L · commerce-payments
No admin UI routes (no pages, no menu items). Entities: Payment, PaymentTransaction. Exposes only API routes for checkout and webhook handling. Designed as a library module for one-time payments with no tenant admin surface.

**Documents (master-detail + workflow):**
  - **Payment** — `Payment` → lines: `PaymentTransaction`  ·  workflow: `PENDING->PROCESSING->COMPLETED->REFUNDED | FAILED->CANCELLED->EXPIRED`  ·  totals: amount, refundedAmount

_Notes: Lightweight module; no admin UI intended. If tenant-admin visibility is needed, reuse payment module's Payment detail + transaction view, or build a simple dashboard read-only export. Current design is correct: payment_sell is a provider facade, payment is the admin module._

### `drive`  —  effort L · content
Google Drive-like file manager with folder hierarchy, soft-delete trash, file/folder sharing (internal + public links), inline preview. Simple tree browser UI, share/preview modals.

**Documents (master-detail + workflow):**
  - **Drive File/Folder** — `DriveFile` → lines: `DriveShare (shares + public links on a file)`  ·  workflow: `ACTIVE -> TRASHED -> PERMANENT_DELETE`  ·  totals: child count (for folders), share count, size (aggregated for folders)
  - **File Share** — `DriveShare`
  - **Public Link** — `DrivePublicLink`  ·  workflow: `ACTIVE -> EXPIRED | REVOKED`

**Configurable master-data:** MIME type handler registry (currently hardcoded preview handlers); File action types (custom actions per MIME group: office, CAD, media, etc.); Share permission levels (currently: VIEWER, EDITOR, ADMIN hardcoded); Trash retention policy (days before auto-purge); Storage quota tiers (if multi-tenant needs it)

**Reports:** Storage usage by folder/user; Access logs (who shared what, when); File type distribution; Shared content audit (public links still active, permission matrix); Trash bin age (what's eligible for purge)

**Cross-document links:** File -> All shares (detail page: shares tab); File -> Public links (detail page tab); File -> Versions (if versioning added); Folder -> Child files/folders (tree navigation + counts in detail)

_Notes: Largely a tooling/platform module with limited master-detail document depth. Main value in Odoo-ification would be: rich file detail page (tabs: metadata, shares, activity log), MIME handler configuration UI, permission matrix/audit reports. Extension points (drive:preview, drive:action, drive:source, drive:lifecycle) are already well-designed for plugins._

---

## Cross-cutting themes (build once, reuse everywhere)

1. **Configurable "type/category/tag" entities** — almost every module hard-codes status/type enums that should become tenant-managed config (the `leave_types` pattern). A shared "lookup/config" scaffold (entity + CRUD + Configuration menu) would accelerate all of them.
2. **Status-workflow engine** — a reusable status-bar + transition-service helper (assert from-state, apply validation, log event) used by every document (invoice, subscription, RMA, ticket, payment, webhook delivery…).
3. **Reporting framework** — recurring asks: aged receivables, MRR/churn, SLA breaches, stock valuation, SEO/translation coverage, usage/metering. One report shell (filters + group-by + export) serves all.
4. **Smart-button cross-links** — Order↔Invoice↔Payment↔Fulfillment↔Return; Subscription↔Invoice; Ticket↔Approval. A small "related records" header component.

## Suggested execution order
- **Wave A (High, finance/commerce core):** order_fulfillment, payment, payment_subscription, payment_return_rma, metering, tenant_subscription, store, product_review.
- **Wave B (High, content + platform):** dynamic_page, seo, approval, webhook, integrations_hub.
- **Wave C (Med):** invoice, payment_cart, wallet, coupon, gift_card, blog, search, support, marketplace, tenant_member/domain, media_gallery, payment_shipping, payment_tax, payment_loyalty_points, api_key.
- **Wave D (Low / light):** drive, analytics, feature_flags, payment_wishlist, payment_sell, exchange_rate, tenant_invitation, api_doc.
