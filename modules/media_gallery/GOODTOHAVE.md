# Good to Have — Media Gallery

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Content Safety

### ✅ CSAM Detection and Hash-Matching
**Why:** The module accepts any image uploaded via `StorageService` without scanning for Child Sexual Abuse Material; platforms that host user-generated imagery are legally obligated in many jurisdictions (EU DSA, UK Online Safety Act, US NCMEC) to detect and report CSAM.
**Complexity:** High
**Multi-tenant relevance:** CSAM scanning must apply to every tenant's gallery — a platform-level obligation that a single tenant's misconfiguration cannot bypass; the scan must run before the URL is persisted in `MediaGalleryItem`.
**Multi-country relevance:** EU DSA (Digital Services Act) imposes mandatory CSAM detection on platforms with >1M EU users; UK Online Safety Act creates criminal liability; US 18 USC 2258A mandates NCMEC CyberTipline reporting — all three impose obligations at the platform layer regardless of which tenant uploaded the image.

### ✅ Perceptual Hash (pHash) Deduplication
**Why:** The same image can be uploaded multiple times (resized, recompressed, slightly cropped) and stored as separate `UploadedFile` rows, wasting storage quota and bandwidth without the gallery having any awareness of near-duplicate images.
**Complexity:** Medium
**Multi-tenant relevance:** Per-tenant storage quota is metered against `TenantUsage.storageBytes`; deduplication within a tenant's gallery prevents quota abuse by repeated re-uploads of the same marketing asset.
**Multi-country relevance:** CDN egress costs are higher in some regions (Asia-Pacific, LatAm); deduplication reduces the number of unique objects that must be edge-cached or replicated across regions.

### ✅ AI-Powered Alt Text Generation
**Why:** `altText` on `MediaGalleryItem` is manually filled in or left empty; empty alt text fails WCAG 2.1 accessibility requirements, which are legally mandated in the EU (EN 301 549), US (ADA/Section 508), and increasingly in other markets.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants in regulated industries (public sector, healthcare, education) have legal accessibility obligations; the platform's `ai` module already exists and could auto-generate alt text at upload time as a per-tenant opt-in.
**Multi-country relevance:** Accessibility laws differ by country but the direction is uniform — auto-generated alt text with a per-language override serves all locales where the tenant's store is available.

---

## Regional Delivery

### ✅ CDN Region Routing per Tenant
**Why:** All gallery item URLs are served from the tenant's single configured S3 bucket (`UploadedFile.url`); there is no mechanism to route image delivery through a CDN region closest to the end user's country, causing high latency for cross-continental storefronts.
**Complexity:** High
**Multi-tenant relevance:** Each tenant's bucket is in one region (configured via `storageProvider`/`s3Region` settings); tenants targeting multiple continents need multi-region CDN distribution, not a single-region URL.
**Multi-country relevance:** A tenant selling in both Turkey and Germany receives orders from both countries; without CDN geo-routing, a Turkish user is served from a German bucket (or vice versa), producing latency that directly impacts Core Web Vitals and conversion rates.

### ✅ Image Transformation / Responsive Srcset Generation
**Why:** The gallery stores the original uploaded image URL only; there is no server-side image resizing, format conversion (WebP/AVIF for modern browsers, JPEG for legacy), or responsive `srcset` generation, forcing the client to download full-resolution images on mobile devices.
**Complexity:** Medium
**Multi-tenant relevance:** Per-tenant plans could gate image transformation (e.g., free tier serves original only, paid tier gets WebP conversion), aligning image processing costs with subscription revenue.
**Multi-country relevance:** Mobile internet penetration is high in emerging markets (Turkey, Africa, SEA) with slower average connections; serving optimised responsive images is a meaningful UX improvement for those regions specifically.

---

## Governance and Quota

### ✅ Per-Gallery Item Count Cap Enforcement
**Why:** `addItem` appends items to a gallery with no maximum enforced; the README acknowledges `galleryMaxItemsPerGallery` as a candidate but it is not implemented — tenants on free tiers can upload unlimited images per entity.
**Complexity:** Low
**Multi-tenant relevance:** Subscription plan tiers typically gate gallery size (e.g., 5 images on free, unlimited on paid); without enforcement, the feature gating declared in `tenant_subscription` is bypassed at the gallery layer.
**Multi-country relevance:** Applies uniformly across countries but is particularly relevant for markets where tenants sign up for free tiers in bulk — the cap prevents storage cost overruns from unpaid tenants.

### ✅ Bulk Operations (Upload, Delete, Reorder)
**Why:** Adding items requires one `POST` per file; there is no bulk-add endpoint accepting multiple `uploadedFileId` values in one request, nor a bulk-delete endpoint, forcing the admin UI to make N serial requests to add N images.
**Complexity:** Low
**Multi-tenant relevance:** Enterprise tenants migrating an existing product catalog with hundreds of images per product need bulk import capability; serial single-item endpoints do not scale to that use case.
**Multi-country relevance:** Large catalogs are common in multi-country e-commerce (localised product images per country variant); bulk operations reduce the time and API load required to set up country-specific image sets.

### ✅ Gallery-Level Soft Delete and Restore
**Why:** `removeItem` permanently deletes the `MediaGalleryItem` row (the `UploadedFile` is untouched but the gallery link is gone forever); there is no soft-delete or trash/restore flow, making accidental deletions irrecoverable at the gallery level.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins managing large catalogs need a safety net; accidental removal of a primary product image from a gallery cannot be undone without re-uploading and re-linking the file.
**Multi-country relevance:** No country-specific driver, but audit requirements in regulated markets (some EU member states require change logs for e-commerce product data) benefit from a soft-delete audit trail.

---

## Discoverability and Search

### ✅ Full-Text and Tag-Based Gallery Search
**Why:** There is no way to search a tenant's gallery items by `altText`, `title`, or tags; in a tenant with hundreds of uploaded product images, finding a specific image requires scrolling through the full list in the UI.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's gallery is isolated; search must be scoped per-tenant and should not cross-query another tenant's files.
**Multi-country relevance:** Tenants managing multilingual galleries (separate images per language/country variant) need to search by language-specific alt text or title to find the correct regional asset.

### ✅ Usage Tracking (Which Entities Reference a File)
**Why:** A given `UploadedFile` may be linked to multiple gallery items across different entities; there is no reverse lookup telling the admin "this image is used on product X and bundle Y". Deleting the file from storage would silently break all gallery items pointing to it.
**Complexity:** Medium
**Multi-tenant relevance:** Per-tenant usage tracking prevents orphaned file references when storage objects are rotated or CDN keys change; the `UploadedFile` soft-delete already guards the audit row but not the gallery links.
**Multi-country relevance:** Tenants maintaining separate country-specific images (same product, different regulatory imagery per country) need to track which country's entity references which file to avoid accidentally deleting a region's assets.

---

## Video and Document Support

### ✅ Video Gallery Item Support
**Why:** `GalleryEntityTypeEnum` and `MediaGalleryItem` are image-centric (`altText`, `isPrimary`); there is no first-class support for video items (MP4, WebM) with attributes like `poster`, `duration`, or `captionsUrl`, limiting the gallery to image-only product presentation.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants in fashion, electronics, or real estate verticals routinely use product videos; the gallery architecture could support video with minor schema additions and a separate entity-type enum value.
**Multi-country relevance:** Video product demonstrations are particularly important in markets with high-bandwidth mobile connections (South Korea, Japan, Western Europe) and less important in low-bandwidth markets; per-tenant feature gating aligns video hosting costs to where tenants actually serve those markets.
