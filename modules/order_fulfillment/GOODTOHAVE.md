# Good to Have — Order Fulfillment

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Carrier Integration

### Live Carrier Tracking API Integration
**Why:** The module stores a `trackingNumber` and `trackingUrl` as free-text fields and has no mechanism to poll carrier APIs for status updates. Status (`SHIPPED` → `IN_TRANSIT` → `DELIVERED`) must be updated manually. Real-time carrier polling (or webhook ingestion from carriers) is the baseline expectation for any production e-commerce platform.
**Complexity:** High
**Multi-tenant relevance:** Each tenant may use different carriers; tracking webhooks must be routed to the correct tenant's fulfillment records.
**Multi-country relevance:** Carrier APIs are country-specific: ARAS/Yurtiçi/MNG serve TR, DHL/UPS/FedEx operate globally, La Poste (FR), Deutsche Post (DE), and Royal Mail (UK) are regional. A provider-abstraction layer (similar to the `InvoiceAdapter` pattern) is needed to support multi-country deployments.

### Per-Tenant Carrier Allowlist
**Why:** `FulfillmentCarrierEnum` is a global compile-time constant mixing Turkish carriers (ARAS, YURTIÇI, MNG, PTT) with global ones (UPS, FedEx, DHL, TNT). A tenant operating only in Germany has no use for ARAS and should not see it in their admin UI.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins want to configure which carriers they actually contract with, not see a global list.
**Multi-country relevance:** The current enum implicitly assumes Turkish market operations; global tenants need an extensible, per-region carrier registry.

### Shipping Label Generation
**Why:** The module tracks carrier and tracking number but provides no mechanism to generate shipping labels (PDF/ZPL). Production fulfillment workflows require label generation either via carrier APIs (Easyship, Shippo, ShipStation) or directly through a carrier's developer portal.
**Complexity:** High
**Multi-tenant relevance:** Each tenant has their own carrier contracts and account credentials; label generation must be per-tenant.
**Multi-country relevance:** Label formats and requirements differ by carrier and country (A4 vs 4×6 inch, TR-specific barcode formats, DHL Waybill vs FedEx Air Waybill).

### Carrier Rate Shopping
**Why:** There is no way to compare carrier rates at shipment creation time. Tenants must choose a carrier manually without cost information. Rate shopping (querying multiple carrier APIs for the cheapest or fastest option given dimensions/weight/destination) is a standard feature in fulfillment platforms.
**Complexity:** High
**Multi-tenant relevance:** Tenants with different carrier contracts will get different rates; the comparison must use per-tenant credentials.
**Multi-country relevance:** Rate shopping is particularly valuable for cross-border shipments where the cost difference between carriers can be significant (e.g. DHL Express vs PTT international for TR→DE).

---

## Multi-Warehouse and Inventory Allocation

### Warehouse / Location Entity
**Why:** Every `Fulfillment` row is scoped to a tenant but has no concept of which warehouse or location it ships from. A tenant with multiple fulfillment centers (e.g. Istanbul and Ankara, or DE and TR) has no way to record or route based on origin location.
**Complexity:** Medium
**Multi-tenant relevance:** Multi-location tenants need warehouse-level inventory allocation and shipment routing.
**Multi-country relevance:** Cross-border fulfillment (e.g. shipping from a TR warehouse to an EU customer) requires the origin country for customs declarations, duties calculations, and carrier documentation.

### Split Shipment / Partial Fulfillment
**Why:** A `Fulfillment` models one shipment of an order. If a 10-item order ships from two warehouses in separate boxes on different days, the module has no structure for this beyond creating two separate unlinked `Fulfillment` records. There is no concept of an order being "fully fulfilled" vs "partially fulfilled" across multiple fulfillments.
**Complexity:** Medium
**Multi-tenant relevance:** Multi-warehouse tenants almost always need split shipments; linking fulfillments to an order-level fulfillment state is a prerequisite.
**Multi-country relevance:** Cross-border orders often split: locally-available items ship from a local warehouse, and back-ordered items ship from a central hub in another country.

### Backorder and Out-of-Stock Handling
**Why:** `FulfillmentItem` has a `quantity` field but no link to inventory levels. There is no status for "backordered" items and no mechanism to partially fulfill an order and queue the remainder.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants with inventory management needs require backorder state to communicate delays to customers.
**Multi-country relevance:** Customs thresholds (e.g. EU's €150 import duty threshold) mean that whether an item ships from a local warehouse or from abroad materially affects the customer's total cost; backorder routing decisions have country-level implications.

---

## Returns and Reverse Logistics

### Return / RMA (Return Merchandise Authorization) Flow
**Why:** `RETURNED` is a terminal status but there is no structured return flow: no return reason, no return tracking number, no restocking decision, and no link to a refund or credit note. Returns are one of the highest-cost operations in e-commerce; they need their own entity and lifecycle.
**Complexity:** High
**Multi-tenant relevance:** Each tenant has its own return policy; the RMA flow must be per-tenant configurable (restocking fee, return window, condition grading).
**Multi-country relevance:** EU consumer law (Consumer Rights Directive) mandates a 14-day no-questions-asked return right; TR TKHK mandates 14 days for distance sales. Return policies are legally defined and differ by country.

### Return Shipping Label Generation
**Why:** Reverse logistics requires the tenant to provide a prepaid return label to the customer. There is no mechanism to generate or track return labels separately from outbound labels.
**Complexity:** High
**Multi-tenant relevance:** Return label cost allocation (tenant vs customer) varies per tenant's policy.
**Multi-country relevance:** Return carrier availability differs by country; international returns have additional customs documentation requirements.

---

## Customer-Facing Tracking

### Public Tracking Page / Link
**Why:** `trackingUrl` stores the carrier's tracking URL but there is no platform-hosted tracking page. Tenants cannot offer a branded "Track Your Order" page at `tenant.com/track/{trackingNumber}` without building it themselves outside this module.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant wants a branded tracking experience consistent with their storefront, not a redirect to a carrier's generic tracking page.
**Multi-country relevance:** Carrier tracking pages are in the carrier's language (ARAS is Turkish-only, DHL defaults to German); a platform-hosted page can render in the customer's language.

### Customer Notification Hooks
**Why:** The module dispatches webhooks for `SHIPPED`, `DELIVERED`, and `CANCELLED` (for internal integrations), but there is no built-in notification to the end customer (email or SMS) when their shipment status changes. The `PROCESSING`, `IN_TRANSIT`, and `RETURNED` statuses also emit no webhooks.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admins need to configure per-status customer notifications; today they must build this entirely outside the module by consuming the internal webhooks.
**Multi-country relevance:** SMS notifications require country-specific phone number formats and SMS gateway providers (e.g. Netgsm/IletimMerkezi for TR, Twilio for US/EU).

---

## Compliance and Documentation

### Customs / Export Documentation
**Why:** International shipments require customs declarations (CN22/CN23 for postal, commercial invoice for courier). The module stores no weight, dimensions, HS tariff code, country of origin, or declared customs value — all mandatory for cross-border shipments.
**Complexity:** High
**Multi-tenant relevance:** Tenants shipping internationally need customs documents; missing fields today mean this cannot be generated at all.
**Multi-country relevance:** Customs requirements are per-country-pair: TR→EU shipments require EUR.1 movement certificates for preferential tariff; US imports above $800 require formal entry; EU imports above €150 require VAT payment at the border.

### Dangerous Goods / ADR Classification
**Why:** Certain product categories (lithium batteries, aerosols, flammables) require carrier-specific dangerous goods documentation (ADR for road, IATA DGR for air). There is no field for hazmat classification on `FulfillmentItem` and no validation preventing non-compliant shipments.
**Complexity:** High
**Multi-tenant relevance:** Tenants selling electronics or chemical products need this; a missing field today means the tenant must handle DG compliance entirely outside the platform.
**Multi-country relevance:** ADR/IATA regulations apply universally for international shipments; penalties for non-compliance (fines, shipment confiscation) are carrier- and country-enforced.

---

## Operational Features

### Bulk Status Update
**Why:** Warehouse staff processing many shipments at once need to mark multiple fulfillments as `PACKED` or `SHIPPED` in a single operation. Today every status change requires a separate API call per fulfillment.
**Complexity:** Medium
**Multi-tenant relevance:** High-volume tenants (e.g. flash sales, seasonal spikes) need bulk operations to keep up with order velocity.
**Multi-country relevance:** Peak periods differ by country (TR Trendyol campaigns, DE Singles Day); bulk operations are critical during these windows.

### SLA / Promised Delivery Date Tracking
**Why:** There is no `estimatedDeliveryAt` field and no mechanism to track whether a shipment met its promised delivery date. SLA breach detection (e.g. flagging shipments overdue by more than N days) is a baseline operational metric.
**Complexity:** Low
**Multi-tenant relevance:** Tenants with SLA commitments to their customers need breach detection and alerting.
**Multi-country relevance:** Average delivery time expectations differ significantly by country (TR next-day is common in major cities; international delivery is 5–15 days); SLA thresholds should be per-country-pair configurable.

### Fulfillment Analytics
**Why:** There is no aggregate view of fulfillment metrics: average time to ship, delivery rate, cancellation rate, carrier performance, or on-time delivery percentage. The only query surface is the paginated `list()` method.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admins need operational dashboards to identify bottlenecks and carrier issues.
**Multi-country relevance:** Carrier performance varies by destination country; analytics broken down by destination country/carrier pair helps tenants make data-driven carrier selection decisions.
