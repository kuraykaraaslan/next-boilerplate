# Good to Have — Product Review

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Moderation Workflow

### Configurable Auto-Approval Policy
**Why:** Every review enters `PENDING` status unconditionally and requires manual moderation. Tenants with low-risk product catalogs (e.g. a digital SaaS tool) or high review volume would benefit from auto-approving reviews from verified purchasers or users with a clean history.
**Complexity:** Low
**Multi-tenant relevance:** This is explicitly identified in the POSTURE.md as a candidate per-tenant setting (`reviewAutoApprove`); it is not yet implemented.
**Multi-country relevance:** Low direct impact, but markets with high review volume (TR e-commerce, CN-facing marketplaces) make manual moderation economically unviable without auto-approval rules.

### AI-Assisted Moderation (Spam / Toxicity Detection)
**Why:** The moderation queue today requires a human to read and classify every review. At scale, a pre-screening step using an LLM or a dedicated toxicity API (e.g. Perspective API) could auto-reject obvious spam, flag toxic content, and surface only edge cases for human review.
**Complexity:** High
**Multi-tenant relevance:** Each tenant's moderation load differs; a per-tenant toggle to enable AI pre-screening would let high-volume tenants reduce manual work without forcing it on low-volume tenants.
**Multi-country relevance:** Spam and hate-speech patterns are language-specific; a multilingual toxicity model is needed for non-English markets (TR, DE, FR).

### Moderation Assignment and Queue Management
**Why:** `moderate()` is a single service call with no concept of who is assigned to review a pending review, no priority ordering, no SLA tracking, and no pagination of the moderation queue itself. At scale, a moderation team needs assignment, filters (by product, by date, by language), and throughput metrics.
**Complexity:** Medium
**Multi-tenant relevance:** Large tenants with dedicated moderation teams need structured queue management; small tenants are fine with the current simple flow.
**Multi-country relevance:** Language-specific moderation queues are needed when a tenant operates in multiple countries — a German-speaking moderator should see German reviews first.

### Moderation Audit Trail
**Why:** `moderate()` stores a `moderationNote` in the review's `metadata` JSONB, but there is no separate audit record of who moderated what and when. If a moderation decision is disputed, the platform cannot show when the decision was made or by which admin user.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins may need to audit their moderation team's decisions.
**Multi-country relevance:** In some jurisdictions (e.g. Germany's NetzDG, EU Digital Services Act), platforms must maintain records of content moderation decisions and provide appeal mechanisms.

### Appeal / Re-Moderation Flow
**Why:** A `REJECTED` or `SPAM` review has no path back to `PENDING` or `APPROVED` except by calling `moderate()` again directly. There is no customer-facing appeal mechanism and no internal re-review workflow.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admins need to correct moderation errors; reviewers need a fair recourse path.
**Multi-country relevance:** The EU Digital Services Act (DSA) requires platforms to offer internal complaint handling and appeal mechanisms for content moderation decisions. This applies to any tenant serving EU consumers.

---

## Multi-Language Reviews

### Language Detection and Storage
**Why:** `ProductReview` has no `language` field. When a tenant operates in multiple countries, the review body could be in Turkish, German, English, or French. Without language metadata, it is impossible to filter reviews by language for display, route them to appropriate moderators, or translate them.
**Complexity:** Low
**Multi-tenant relevance:** Tenants with multi-language storefronts need to render reviews in the customer's language.
**Multi-country relevance:** Core requirement for any multi-country product catalog; a Turkish customer should not see German reviews as the top results.

### Machine Translation of Reviews
**Why:** Even with language detection, most customers can only read reviews in their own language. Auto-translating reviews (via a translation API) and storing translated bodies would allow a tenant to surface "4.8 stars from 312 reviews" regardless of the reviewer's language.
**Complexity:** High
**Multi-tenant relevance:** Tenants can enable/disable auto-translation per their plan tier and cost tolerance.
**Multi-country relevance:** Crucial for global product pages where a product may have thousands of reviews in one dominant language (often English) that are inaccessible to customers in other markets.

### Review Display Language Filtering
**Why:** There is no `language` filter in `GetReviewsQuery`. Even if language is stored, the list API cannot filter by it. A TR-language storefront page should default to showing TR reviews, with an option to show all.
**Complexity:** Low
**Multi-tenant relevance:** Tenants decide which languages their storefront surfaces; the filter should be configurable.
**Multi-country relevance:** Direct UX requirement for multi-country deployments.

---

## Verified Purchase Enforcement

### Purchase Verification at Create Time
**Why:** `isVerifiedPurchase` defaults to `false` and is set by the caller with no enforcement. Any caller can pass `isVerifiedPurchase: true` without the module verifying that the user actually bought the product. The POSTURE.md identifies `reviewRequireVerifiedPurchase` as a candidate per-tenant setting but it is not implemented.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants with competitive review environments (B2C marketplaces, SaaS with competitor reviews) need verified-purchase gating to prevent fake positive reviews.
**Multi-country relevance:** Some markets have higher fake-review fraud rates; enforcement intensity should be a per-tenant (and implicitly per-market) decision.

### Order-Based Eligibility Check
**Why:** `orderId` is an optional soft reference on the review entity, but the service does not verify that the `orderId` belongs to the reviewing user for the correct product. A user could supply any order UUID and claim verified purchase status.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant has its own order database; the check requires a cross-module lookup into the order/payment records for the correct tenant.
**Multi-country relevance:** Verified-purchase fraud is more prevalent in markets with high competition for review rankings (CN-adjacent, certain EU markets); enforcement matters most in those contexts.

---

## Content Richness

### Review Media Attachments (Images / Videos)
**Why:** Text-only reviews are sufficient for SaaS products but insufficient for physical goods e-commerce. Allowing reviewers to upload photos or short videos is a standard feature on any consumer-facing product review system and significantly increases review credibility and conversion rates.
**Complexity:** High
**Multi-tenant relevance:** Tenants selling physical products need media reviews; tenants selling software do not. This should be a per-tenant feature toggle.
**Multi-country relevance:** Low direct multi-country impact, but some markets (CN, TR) have strong consumer expectations for photo reviews driven by platforms like Trendyol and Taobao.

### Review Q&A / Comments
**Why:** There is no way for a seller (tenant admin) or another buyer to respond to or comment on a review. Seller responses to negative reviews are a standard trust signal in e-commerce.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants with customer service teams want to respond publicly to reviews as part of their brand management.
**Multi-country relevance:** In some markets (DE, AT), seller responses are legally relevant when a review contains false factual claims; the absence of a response mechanism limits legal recourse options.

### Structured Review Attributes
**Why:** The review body is free text. Many platforms allow reviewers to rate specific attributes separately (e.g. "Quality: 4/5, Shipping: 5/5, Value: 3/5"). There is no `attributes` field or per-product attribute schema.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants can define per-product-category attribute sets (e.g. "Fit" and "Material" for clothing, "Battery Life" and "Build Quality" for electronics).
**Multi-country relevance:** Low direct impact, but localised attribute labels are needed for multi-country product pages.

---

## Rating Summary and Indexing

### Aggregate Rating Cache Invalidation Robustness
**Why:** `getProductSummary()` uses `singleFlight` but the cache key is `review:summary:{productId}` without a `tenantId` prefix. If two tenants coincidentally use the same `productId` UUID (unlikely but possible if products are created with predictable IDs), they would share a cached summary. Adding `tenantId` to the cache key is a correctness fix.
**Complexity:** Low
**Multi-tenant relevance:** Direct multi-tenancy correctness issue; cache poisoning across tenants is a data isolation violation.
**Multi-country relevance:** Indirect — data isolation is a prerequisite for any multi-tenant, multi-country deployment.

### Pre-Computed Rating Aggregates Table
**Why:** `getProductSummary()` scans all `APPROVED` reviews for a product with `select: ['rating']` on every cache miss. For products with thousands of reviews, this is a full table scan. A materialised summary table (updated on approve/reject/delete) would make the read O(1) instead of O(n).
**Complexity:** Medium
**Multi-tenant relevance:** High-volume tenants with popular products will hit this performance ceiling first.
**Multi-country relevance:** Global product catalogs where the same SKU is sold to customers in many countries accumulate reviews faster; the n-scan becomes problematic sooner.

### Search and Keyword Filtering in Reviews
**Why:** `list()` supports filtering by `productId`, `userId`, `status`, `minRating`, and `isVerifiedPurchase`, but there is no full-text search on `title` or `body`. A customer reading reviews about "battery life" or "delivery time" cannot filter to relevant reviews.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants with large review volumes need keyword search to let customers find relevant reviews efficiently.
**Multi-country relevance:** Full-text search must be language-aware (Turkish stemming differs from German); a multilingual search implementation is needed for multi-country deployments.

---

## Trust and Anti-Fraud

### Rate Limiting Per User Per Product
**Why:** A single user can submit unlimited reviews for the same product (the `create()` method does not check for existing reviews from the same user for the same product). This enables review bombing or flooding the moderation queue.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's product catalog is independent; duplicate review detection must be per-tenant.
**Multi-country relevance:** Review manipulation is a known fraud vector in competitive e-commerce markets; enforcement is particularly needed in high-competition market segments.

### Reviewer Reputation / Trust Score
**Why:** All reviewers are treated equally. A first-time reviewer submitting a 1-star review carries the same weight as a long-standing customer with 50 verified purchases. A trust score (based on purchase history, review age, vote helpfulness ratio) would allow auto-weighting or auto-approval of trusted reviewers.
**Complexity:** High
**Multi-tenant relevance:** Each tenant's buyer base has different trust characteristics; the model would need to be trained or configured per tenant.
**Multi-country relevance:** Fraud and fake-review patterns vary by market; trust scoring calibration needs market-specific tuning.

### IP / Device Fingerprint Deduplication
**Why:** Guest reviews (no `userId`) can be submitted repeatedly from the same IP address or browser fingerprint with different `authorName` values. There is no mechanism to detect coordinated fake review campaigns from a single origin.
**Complexity:** High
**Multi-tenant relevance:** Tenants with anonymous reviews enabled are most vulnerable; tenants requiring verified purchase are less exposed.
**Multi-country relevance:** GDPR and KVKK constrain what fingerprinting data can be stored; any IP-based deduplication must be GDPR-compliant for EU users and KVKK-compliant for TR users.

---

## Compliance and Legal

### Right to Erasure (GDPR / KVKK)
**Why:** `delete()` is a soft delete (`softRemove`) that keeps the row in the database with `deletedAt` set. If a user exercises their right to erasure under GDPR (EU) or KVKK (TR), the review content, `userId`, and `authorName` must be hard-deleted or anonymised, not merely soft-deleted.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant is the data controller for its users' reviews; GDPR erasure requests are per-tenant obligations.
**Multi-country relevance:** GDPR applies to all EU user data; KVKK applies to Turkish user data. Both are mandatory; non-compliance risks fines (GDPR: up to 4% global turnover).

### Review Content Archiving for Disputes
**Why:** When a review is `REJECTED` or `SPAM`, the content is still in the database (soft-deleted or status-flagged) but there is no immutable archive. If a reviewer disputes the rejection and claims the content was altered, there is no cryptographic proof of the original content.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants operating under the EU DSA need to be able to demonstrate what content was moderated and what it contained.
**Multi-country relevance:** DSA (EU) and equivalent emerging legislation in other countries require audit records of moderation decisions with the original content preserved.
