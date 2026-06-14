# Good to Have — Payment Wishlist

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Product Intelligence

### ✅ Price Drop and Back-in-Stock Notifications
**Why:** The wishlist stores product references but emits no events and triggers no notifications when a wishlisted product's price drops or restocks; this is the primary commercial value of a wishlist feature.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant configures notification channels (email, SMS, push) and triggers (price drop threshold, stock alert) independently.
**Multi-country relevance:** Notification timing and channel preferences vary by country (SMS preferred in some MENA markets, email in the EU); notification compliance (GDPR opt-in) also differs by jurisdiction.

### ✅ Wishlist Item Price Tracking History
**Why:** There is no price history stored on `WishlistItem`; when an item's catalog price changes, there is no record of what it was when it was added, so price-drop logic has nothing to compare against.
**Complexity:** Low
**Multi-tenant relevance:** Price history is per-tenant product catalog data; each tenant's pricing changes are independent.
**Multi-country relevance:** Price comparisons must be currency-aware; a product priced in TRY that depreciates in USD terms needs currency-normalized comparison logic.

### ✅ Real-Time Stock and Availability Display
**Why:** `WishlistItem` stores only `productId` and `variantId` as references; fetching live stock levels requires joining with the inventory module, which the wishlist service does not do; callers see only the bare wishlist data with no availability signal.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's inventory system is different; availability data should be injected via a configurable hook rather than a hardcoded join.
**Multi-country relevance:** Stock may be country-specific (some products available only in certain regions); availability checks must respect buyer location.

### ✅ Add-All-to-Cart Action
**Why:** There is no `addAllToCart(wishlistId)` method that bulk-adds all wishlist items to the cart; users must move items one by one, which is a UX gap common in wishlist implementations.
**Complexity:** Low
**Multi-tenant relevance:** The implementation requires coordination with `payment_cart`; a cross-module service method makes this a platform-level feature rather than per-tenant custom code.
**Multi-country relevance:** Bulk-add behavior must handle items not available in the buyer's country (regional restrictions); a country-aware filter is needed.

## Sharing & Collaboration

### Registry Mode (Wedding / Gift / Baby Registry)
**Why:** The current sharing model is `isPublic` + a `shareToken`; there is no concept of a "registry" where third parties can purchase items on behalf of the list owner and the list tracks which items have been purchased.
**Complexity:** High
**Multi-tenant relevance:** Registry features are relevant for gift-category tenants (wedding shops, baby stores, electronics); it is a distinct configurable mode, not a core wishlist behavior.
**Multi-country relevance:** Gift registry culture varies by country (very common in the US and UK; less prevalent in some Asian markets); it should be a per-tenant feature toggle.

### Social Sharing with Rich Preview (OG Tags)
**Why:** Public wishlists are accessible via `getByShareToken` but there is no server-side Open Graph metadata generation; sharing a wishlist link on social media produces a blank unfurled card.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's brand appears in the shared preview; OG tags must use the tenant's logo and color scheme.
**Multi-country relevance:** Social sharing platforms vary by country (Facebook dominant in some markets, LINE in Japan/Thailand, KakaoTalk in Korea); the share URL must work across platforms.

### Collaborative Wishlist (Multiple Owners)
**Why:** A wishlist is owned by a single `userId`; there is no multi-owner or invitation mechanism for collaborative lists (e.g. a household sharing a shopping list, or a team purchasing list).
**Complexity:** High
**Multi-tenant relevance:** B2B tenants (office procurement) and family-oriented consumer tenants both need collaborative lists.
**Multi-country relevance:** Household and group purchasing patterns differ by culture; collaborative wishlists are particularly relevant in markets with strong family purchase decision-making (MENA, South Asia).

### Wishlist-to-Wishlist Item Copy / Merge
**Why:** `moveItem` transfers an item between wishlists (destructive); there is no `copyItem` to duplicate an item across lists, and no `merge` for combining two wishlists.
**Complexity:** Low
**Multi-tenant relevance:** Power users of any tenant's storefront manage multiple themed wishlists; copy/merge are quality-of-life features that reduce churn.
**Multi-country relevance:** No specific country variation; a universal UX improvement.

## Commerce Integration

### ✅ Cart Conversion Tracking per Wishlist Item
**Why:** There is no way to mark a `WishlistItem` as "purchased" or link it to a `cartId` / `orderId`; repeat purchase signals and wishlist-to-purchase analytics are impossible.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's merchandising team needs to know which wishlist items convert to purchases to optimize promotion targeting.
**Multi-country relevance:** Wishlist-to-purchase conversion rates differ by country and product category; per-country data drives market-specific promotional strategies.

### Coupon / Promotion Eligibility Check on Wishlist Items
**Why:** When a coupon applies to specific products, wishlists do not surface whether a saved item is currently on promotion; users must manually re-check each item.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's promotion catalog is separate; the integration with `coupon` module must be per-tenant scoped.
**Multi-country relevance:** Promotions are often country-specific (local holidays, regional sales events); promotion eligibility on wishlists must respect buyer location.

### Wishlist Item Count Limit Per User
**Why:** A user can add unlimited items to unlimited wishlists; there is no configurable cap on items per list or lists per user, which can cause performance issues and storage cost escalation.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant configures limits appropriate for its platform (a digital-only tenant may allow unlimited; a physical goods tenant may cap at 100 items for UX reasons).
**Multi-country relevance:** No specific country variation; a universal operational safeguard.

## Localization & Personalization

### Wishlist Item Notes Localization
**Why:** `note` on `WishlistItem` is a single plain text string; a multi-language tenant cannot store notes in multiple languages or display them in the user's preferred language.
**Complexity:** Low
**Multi-tenant relevance:** Tenants serving multi-language audiences need localized note storage at the item level.
**Multi-country relevance:** A tenant operating in both Arabic and English needs to store and render notes in the correct locale for each buyer.

### Currency Display Preference on Wishlisted Items
**Why:** `WishlistItem` stores only `productId` and `variantId`; there is no stored or computed price at the time of saving, and no currency preference for how the buyer wants to see the price on their wishlist.
**Complexity:** Low
**Multi-tenant relevance:** Tenants with multi-currency storefronts should display wishlist item prices in the user's preferred or configured currency.
**Multi-country relevance:** Cross-border shoppers saving products from international storefronts expect prices in their home currency; without conversion, price comparison is meaningless.

## Privacy & GDPR

### ✅ Wishlist Data Export (GDPR Data Portability)
**Why:** There is no `exportUserWishlists(tenantId, userId)` method to export all wishlist data for a user in a portable format; GDPR Article 20 grants users the right to data portability.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant is a data controller and must fulfill portability requests for its users independently.
**Multi-country relevance:** GDPR applies across the EU/EEA; KVKK (Turkey) and UK GDPR have similar portability requirements; portability support is mandatory for deployments in these regions.

### ✅ Wishlist Anonymization on User Deletion (Right to Erasure)
**Why:** There is no `deleteUserWishlists(tenantId, userId)` or anonymization method; when a user's account is deleted, their wishlist records persist with the original `userId` reference, violating GDPR's right to erasure.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant must process erasure requests for its own users; orphaned wishlist records with a deleted user's ID are a PII compliance risk.
**Multi-country relevance:** GDPR (EU), KVKK (Turkey), PDPA (Thailand), and similar laws all mandate erasure of personal data including behavioral data such as wishlist items.

### Share Token Expiry / Revocation
**Why:** Once a `shareToken` is generated for a public wishlist, it is permanent; there is no expiry, rotation, or revocation mechanism, so a token once shared cannot be invalidated if the owner changes their mind.
**Complexity:** Low
**Multi-tenant relevance:** Tenants with public wishlist sharing features need a way to let users revoke access to shared lists.
**Multi-country relevance:** Privacy regulations in the EU and other jurisdictions require that users can withdraw consent for data sharing at any time; revocable share tokens satisfy this for public wishlists.
