# Good to Have — Payment Return RMA

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Policy Engine

### ✅ Per-Tenant Configurable Return Window
**Why:** There is no setting for how long after purchase a return is eligible; every tenant is bound to the same unconfigured lifecycle, and the only reference to a return window is a free-text metadata field in the seed.
**Complexity:** Low
**Multi-tenant relevance:** Return window length is a fundamental merchant policy that varies by tenant product category and business model (e.g. 7 days for software, 30 days for physical goods).
**Multi-country relevance:** Consumer protection laws mandate minimum return windows that differ by country (14 days in the EU under Distance Selling Directive, 30 days in the US for many product types).

### ✅ Eligibility Validation at Create Time
**Why:** `create()` accepts any `orderId` and `items` without checking whether the order is actually within the return window, whether the items were delivered, or whether a return already exists for the same items.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant enforces its own eligibility rules; without validation, bad actors can open fraudulent RMAs for any order ID they know.
**Multi-country relevance:** EU and UK consumer protection laws require that statutory return rights be enforced accurately; allowing out-of-window returns creates legal exposure.

### ✅ Auto-Approval Rules
**Why:** All RMAs require manual admin approval; there is no rule engine to auto-approve returns below a value threshold, for certain product categories, or for specific defect reasons.
**Complexity:** Medium
**Multi-tenant relevance:** High-volume tenants (e.g. fast-fashion, electronics) need automated triage to avoid approval bottlenecks.
**Multi-country relevance:** Markets with high return rates (Germany, US) require automation to scale; manual approval is operationally unsustainable.

### ✅ Return Policy Enforcement for Exchanges
**Why:** `ReturnTypeEnum.EXCHANGE` exists but the service does not handle exchange-specific logic (e.g. creating a new order for the replacement item, stock reservation, price difference handling).
**Complexity:** High
**Multi-tenant relevance:** Exchange workflows vary significantly by tenant (like-for-like vs. different SKU, price difference credits/charges).
**Multi-country relevance:** Exchange regulations differ by country; in some markets only "like-for-like" exchanges are legally a right, while upgrades/downgrades require a new transaction.

## RMA Number & Branding

### ✅ Per-Tenant RMA Number Prefix and Format
**Why:** The RMA number format is hardcoded as `RMA-<8-hex-chars>`; tenants cannot brand their own prefix (e.g. `MYSHOP-RMA-2024-001` or a sequential numeric ID).
**Complexity:** Low
**Multi-tenant relevance:** Each tenant communicates with customers using its own brand identity; a configurable `rmaNumberPrefix` and format pattern is a standard multi-tenant feature.
**Multi-country relevance:** Some countries' customs/logistics systems require specific RMA number formats for cross-border returns.

### ✅ Sequential Numeric RMA IDs
**Why:** The current UUID-based random hex fragment makes RMA IDs non-sequential and hard to reference in customer support conversations; sequential IDs (e.g. `#1001`, `#1002`) are universally preferred for customer-facing references.
**Complexity:** Medium
**Multi-tenant relevance:** Sequential IDs are per-tenant and reset-able (e.g. starting from 1 for each tenant).
**Multi-country relevance:** Sequential document numbers are a legal requirement for invoicing and related documents in several countries (e.g. EU VAT invoicing rules extend to credit notes and return documents).

## Carrier & Logistics Integration

### ✅ Prepaid Return Label Generation
**Why:** There is no mechanism to generate or link a carrier return label to an approved RMA; customers must arrange their own shipping, which is a major friction point and a conversion killer for return requests.
**Complexity:** High
**Multi-tenant relevance:** Each tenant may have contracts with specific carriers (ARAS, DHL, UPS) — matching the `payment_shipping` module's `ShippingCarrierEnum`.
**Multi-country relevance:** Carrier APIs, label formats, and customs documentation requirements differ completely by country; domestic vs. cross-border returns need different flows.

### ✅ Return Tracking Number Storage and Status Updates
**Why:** There is no field to store the carrier tracking number for a return shipment, and no webhook handler to update the RMA status when the carrier delivers the package.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants need to know when a return package is in transit vs. delivered to their warehouse to trigger accurate SLA timers.
**Multi-country relevance:** Cross-border returns involve customs clearance stages that must be tracked; without tracking integration, warehouse teams fly blind.

### ✅ Cross-Border Return Customs Documentation
**Why:** International returns require customs declarations (HS codes, reason for export, declared value); the `ReturnItem` entity has no fields for customs data and the service generates no customs documents.
**Complexity:** High
**Multi-tenant relevance:** Tenants with international buyers must handle customs for each returning country; this varies per tenant's origin/destination markets.
**Multi-country relevance:** Every cross-border return requires a customs form (CN22/CN23 in postal systems, commercial invoice for courier); omitting this causes returns to be held at customs or returned to sender.

## Refund & Financial Integration

### ✅ Automatic Loyalty Point Reversal on Refund
**Why:** When a refund is processed, points earned on the original order are not reversed; a customer who earned points on a purchase keeps them even after getting a full refund.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant configures whether points are fully, partially, or not reversed on return.
**Multi-country relevance:** In some jurisdictions, loyalty point reversals affect taxable income reporting; the policy needs to be configurable.

### ✅ Store Credit / Gift Card Issuance Instead of Cash Refund
**Why:** The only refund path is a cash refund via `PaymentSellService`; there is no option to issue store credit, a gift card, or loyalty points as an alternative to a cash refund.
**Complexity:** Medium
**Multi-tenant relevance:** Offering store credit instead of cash is a retention strategy many tenants prefer; it keeps revenue within the platform.
**Multi-country relevance:** In some markets (US consumer behavior), customers readily accept store credit; in others (EU consumer protection), customers have a statutory right to a cash refund.

### ✅ Restocking Fee Support
**Why:** There is no field or calculation for deducting a restocking fee from the refund amount; this is a standard policy for electronics and high-value goods.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant configures its restocking fee as a percentage or flat amount per product category.
**Multi-country relevance:** Restocking fee legality varies by country (banned under EU consumer protection, common in the US); a per-tenant configuration enables compliance.

## Notifications & SLA

### ✅ Customer Email Notifications on Status Transitions
**Why:** None of the lifecycle methods (`approve`, `reject`, `markReceived`, `refund`, `complete`, `cancel`) dispatch notifications to the customer; customers receive no confirmation that their return was processed.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant customizes the email template and language for its customer base.
**Multi-country relevance:** Customer communication norms differ by culture; the notification system needs i18n support for multi-country tenants.

### ✅ SLA Timers and Escalation
**Why:** There are no SLA deadlines or escalation triggers; an approved RMA that is never progressed to `RECEIVED` or `REFUNDED` silently stays open forever with no alert to the admin.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant sets its own SLA (e.g. refund within 5 business days of receipt), and SLA breach should trigger an escalation to the assigned support agent.
**Multi-country relevance:** Consumer protection laws mandate maximum refund processing times (e.g. EU: 14 days from receipt; UK: 14 days; Australia: reasonable timeframe); SLA monitoring is a compliance tool.

## Localization & Compliance

### ✅ Localized RMA Reason Codes
**Why:** `reason` and `condition` are free-text and enum strings in English; there is no i18n mapping for customer-facing reason labels.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's customer-facing return form needs reasons displayed in the customer's language.
**Multi-country relevance:** Translating reason codes into Turkish, Russian, Chinese, etc. is required for each target market.

### ✅ GDPR / Data Retention Policy for RMA Records
**Why:** RMA records contain PII (customer notes, contact details via `userId`); there is no data retention policy, anonymization method, or purge mechanism.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant is a data controller and must enforce its own retention periods.
**Multi-country relevance:** GDPR (EU), KVKK (Turkey), and similar laws require that customer PII in operational records is purged or anonymized after the legally mandated retention period.
