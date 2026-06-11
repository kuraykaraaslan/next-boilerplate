# Good to Have — Payment Shipping

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Carrier Coverage & Integration

### Live Carrier Rate API Integration
**Why:** All shipping rates are manually configured as DB rows; there is no live API call to carrier systems (DHL, FedEx, UPS, ARAS) to fetch real-time rates, surcharges, and transit times at checkout.
**Complexity:** High
**Multi-tenant relevance:** Each tenant has its own carrier account credentials and negotiated rates; live API rates would reflect the actual tenant-specific pricing.
**Multi-country relevance:** International shipping rates change daily based on fuel surcharges, zone re-ratings, and currency fluctuations; static DB rows cannot keep pace with cross-border pricing.

### International Carrier Coverage (MENA, APAC, LATAM)
**Why:** The `ShippingCarrierEnum` covers Turkish domestic carriers (ARAS, YURTICI, MNG, PTT) and global express (UPS, FedEx, DHL, TNT) but misses major regional carriers: Cainiao/SF Express (China), J&T/Ninja Van (Southeast Asia), Aramex (MENA), Correos/Estafeta (LATAM).
**Complexity:** Medium
**Multi-tenant relevance:** Tenants targeting these regions cannot select the appropriate carrier from the enum without a code change.
**Multi-country relevance:** Using a globally unrecognized carrier enum value is a data-quality problem; proper carrier codes are needed for label generation and tracking integrations.

### Carrier Tracking Integration
**Why:** There is no tracking number field on `ShippingRate` or `ShippingMethod`, and no service method to fetch or store carrier tracking updates; shipment visibility is entirely manual.
**Complexity:** High
**Multi-tenant relevance:** Each tenant's warehouse team needs a shipment status dashboard per tenant; customers expect tracking visibility as a standard service.
**Multi-country relevance:** Carrier APIs differ by country and carrier; a unified tracking abstraction is needed for multi-country deployment.

### Prepaid Return Label Generation
**Why:** `payment_return_rma` has no return label mechanism; `payment_shipping` is the natural place to generate return labels via carrier APIs, but this capability is absent.
**Complexity:** High
**Multi-tenant relevance:** Each tenant uses different carriers for returns vs. outbound shipping.
**Multi-country relevance:** Cross-border return labels require customs declarations and differ by export/import country pair.

## Rate Calculation Engine

### Dimensional Weight (DIM Weight) Calculation
**Why:** The rate-matching algorithm uses actual weight (`weight`) but not dimensional weight; express carriers (DHL, FedEx, UPS) price large, light packages by volume; ignoring DIM weight produces incorrect quotes.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant configures the DIM factor (typically 5000 for metric) per carrier contract.
**Multi-country relevance:** DIM weight divisors differ by carrier and country/region (domestic vs. international lanes often use different factors).

### Multi-Package Shipment Splitting
**Why:** The engine calculates a single rate for a cart's total weight; orders exceeding carrier weight limits (e.g. 30 kg per package) cannot be automatically split into multiple packages with accurate combined rates.
**Complexity:** High
**Multi-tenant relevance:** Tenants shipping heavy goods (furniture, equipment) need automatic package splitting.
**Multi-country relevance:** Per-package weight limits differ by carrier, destination country, and customs regulations.

### Handling Fee and Surcharge Support
**Why:** `ShippingRate.price` is a flat fee with no composition for handling fees, fuel surcharges, or insurance; tenants cannot add a per-order handling fee on top of the carrier rate.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant has its own fulfillment overhead to recover through handling fees.
**Multi-country relevance:** Some countries require separate disclosure of surcharges (e.g. EU Consumer Rights Directive requires full delivery cost breakdown before purchase).

### Pickup / Click-and-Collect Option
**Why:** There is no "pickup" shipping method type; tenants with physical locations cannot offer in-store pickup as a zero-cost alternative to shipping.
**Complexity:** Medium
**Multi-tenant relevance:** Multi-location retail tenants need per-location pickup slots and capacity management.
**Multi-country relevance:** Click-and-collect adoption varies by country (very high in UK and France, moderate in US, lower in markets without physical store density).

## International & Cross-Border

### Customs / Harmonized System (HS) Code on Shipping Items
**Why:** There is no HS code or commodity code field on `ShippingRate` or on the cart items passed to `calculateShipping`; cross-border shipments require HS codes for customs declarations and duty calculation.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants selling internationally must declare HS codes per product; this data should flow from the product catalog through shipping.
**Multi-country relevance:** Every customs-controlled border requires HS codes; omitting them causes shipment holds and returns at customs.

### Duties & Import Tax Estimation (DDP / DDU)
**Why:** There is no mechanism to calculate or display import duties and taxes (e.g. UK import VAT post-Brexit, US customs duties); buyers are surprised at the delivery stage, leading to refusals and returns.
**Complexity:** High
**Multi-tenant relevance:** Tenants choose whether to offer Delivered Duty Paid (DDP) or Delivered Duty Unpaid (DDU); this is a per-tenant policy with significant customer experience impact.
**Multi-country relevance:** Duty rates, de minimis thresholds (e.g. EU €150, UK £135, US $800), and calculation methods differ by country pair; a duty engine must be country-aware.

### Incoterm Configuration Per Rate (DDP, DDU, EXW)
**Why:** There is no `incoterm` field on `ShippingRate`; tenants cannot configure per-rate delivery terms, which are required for customs documentation and liability allocation.
**Complexity:** Medium
**Multi-tenant relevance:** Different tenants (and even different routes within a tenant) may use different Incoterms based on their logistics contracts.
**Multi-country relevance:** Incoterms determine who bears import taxes and duties; choosing DDP vs. DDU changes the customer experience and legal obligations country by country.

### Prohibited Item and Country Restriction Rules
**Why:** There is no mechanism to block a checkout or shipping quote for items that are prohibited in the destination country (e.g. batteries to some air routes, alcohol to dry states, encrypted software to sanctioned countries).
**Complexity:** High
**Multi-tenant relevance:** Each tenant is responsible for complying with import/export restrictions for its product catalog.
**Multi-country relevance:** Prohibition lists are country-specific and change frequently; a rule engine that blocks quotes for prohibited destination/product combinations is a compliance necessity.

## Currency & Pricing

### Multi-Currency Shipping Rate Storage
**Why:** Each `ShippingRate` has a single `currency`; the `calculateShipping` call returns quotes in that rate's currency without conversion; a cart in EUR cannot directly compare shipping quotes priced in USD and GBP.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant may configure rates in its primary currency; cross-currency comparison requires exchange-rate integration.
**Multi-country relevance:** International shipping lanes naturally span currency zones; a buyer in Turkey seeing a DHL rate in USD has no UX-friendly cost signal.

### Per-Country Shipping Price Localization
**Why:** The rate engine matches by `countryCode` but does not support displaying the price converted and formatted in the buyer's local currency; the matched `price` and `currency` from the DB row is returned as-is.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant selects its pricing strategy (show in merchant currency vs. show in buyer currency).
**Multi-country relevance:** Buyers strongly prefer seeing prices in their local currency; cross-border conversion with exchange-rate integration improves checkout conversion.

## Observability & Carrier Performance

### Carrier Performance Tracking (On-Time Delivery Rate)
**Why:** There are no fields or service methods to record actual delivery outcomes vs. `estimatedDaysMin/Max`; tenants cannot evaluate carrier performance or SLA compliance.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant needs to know which carriers are meeting their SLAs to make data-driven carrier selection decisions.
**Multi-country relevance:** Carrier reliability varies by country lane; a Turkish domestic carrier may be reliable within TR but terrible for international routes.

### Shipping Event / Notification Hook
**Why:** No events are emitted when a shipping quote is selected at checkout; downstream systems (inventory, fulfillment, warehouse) have no standard hook to initiate shipment processing.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's fulfillment workflow differs; an event-driven hook lets each tenant wire its own fulfillment logic.
**Multi-country relevance:** Fulfillment workflows (pick/pack/ship timelines, handoff to customs broker) differ by destination country.
