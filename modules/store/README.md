# Store Module

Tenant-aware e-commerce catalog. Hierarchical categories with typed spec templates; products with HTML descriptions, spec values, images, tags, SEO and variants; product bundles. **Admin-only** — every route requires the tenant `ADMIN` role and there is no public storefront UI.

---

## Entities

All entities live in the **tenant DB** (per-tenant DataSource, isolated by `tenantId`).

| Entity | Table | Description |
|---|---|---|
| `StoreCategory` | `store_categories` | Hierarchical category (`parentId`), soft-deleted. |
| `StoreCategorySpec` | `store_category_specs` | Typed spec template attached to a category. Unique per (`tenantId`, `categoryId`, `key`). |
| `StoreProduct` | `store_products` | Product: `name`, `slug`, `shortDescription`, `details` (HTML), `basePrice`, `currency`, inventory, tags, SEO, `status`. Soft-deleted. |
| `StoreProductImage` | `store_product_images` | Product images; supports primary and per-variant (`variantId`). |
| `StoreProductSpecValue` | `store_product_spec_values` | Value of a category spec for a product (string). Unique per (`tenantId`, `productId`, `specId`). |
| `StoreVariationType` | `store_variation_types` | Variation axis for a product (e.g. *Color*, *Size*) with a `displayType`. |
| `StoreVariationOption` | `store_variation_options` | Concrete option value for a variation type (e.g. *Red*, *L*) with optional `swatch`. |
| `StoreProductVariant` | `store_product_variants` | Option-combination variant (`optionIds[]`) with own SKU/price/stock. Soft-deleted. |
| `StoreVariantGroup` | `store_variant_groups` | Groups sibling products presented as variants of one family. |
| `StoreVariantGroupItem` | `store_variant_group_items` | Membership of a product in a variant group. A product belongs to at most one group (unique on `tenantId`+`productId`); visibility is symmetric. |
| `StoreBundle` | `store_bundles` | Multi-product bundle; `bundlePrice` nullable (null = sum of items), `richDescription` is Tiptap/ProseMirror JSONB. Soft-deleted. |
| `StoreBundleItem` | `store_bundle_items` | Item in a bundle with `quantity` and optional `overridePrice`. |

> `StoreVariationType` / `StoreVariationOption` / `StoreProductVariant` are defined as entities (and registered) but currently have **no service methods or API routes** — they are part of the data model, edited via direct persistence/seed only.

### Enums (`store.enums.ts`)

- `ProductStatus`: `DRAFT` | `ACTIVE` | `ARCHIVED` | `OUT_OF_STOCK`
- `BundleStatus`: `DRAFT` | `ACTIVE` | `ARCHIVED` | `SCHEDULED`
- `CategorySpecType`: `TEXT` | `NUMBER` | `BOOLEAN` | `SELECT` | `MULTISELECT` | `DATE` | `COLOR`
- `VariationDisplayType`: `TEXT` | `COLOR_SWATCH` | `IMAGE_SWATCH` | `BUTTON` | `DROPDOWN`

---

## Services

Split by domain into four static services (each backs the matching routes). All methods resolve the tenant DataSource via `tenantDataSourceFor(tenantId)` and filter by `tenantId`. Reads are Redis-cached / de-duplicated via `singleFlight`; writes bust the relevant keys.

| Service (file) | Area | Methods | Responsibility |
|---|---|---|---|
| `StoreCategoryService` (`store.category.service.ts`) | Categories | `createCategory`, `updateCategory`, `getCategory`, `listCategories`, `deleteCategory` | CRUD with unique-`slug` enforcement; `getCategory`/`listCategories` optionally embed specs (`withSpecs`); `deleteCategory` refuses if products still reference it. |
| `StoreCategoryService` | Specs | `upsertSpec`, `deleteSpec` | Upsert (by `key`) / delete a category spec template. |
| `StoreProductService` (`store.product.service.ts`) | Products | `createProduct`, `updateProduct`, `getProduct`, `getProductDetail`, `listProducts`, `deleteProduct` | CRUD with unique-`slug`; `getProductDetail` joins images + spec values; `listProducts` supports search, status/category/featured filters and `specFilters`. Create/update/delete dispatch webhook events (see below). |
| `StoreProductService` | Images | `addImage`, `removeImage` | Add/remove product images; setting `isPrimary` demotes any existing primary. |
| `StoreProductService` | Spec values | `setSpecValues` | Upsert spec values for a product. |
| `StoreProductService` | Duplicate | `duplicateProduct` | Clone a product (see *Duplicate product*). |
| `StoreBundleService` (`store.bundle.service.ts`) | Bundles | `createBundle`, `updateBundle`, `getBundle`, `listBundles`, `deleteBundle` | CRUD with unique-`slug`; `getBundle` with `withItems` enriches each item with `productName` / `productBasePrice` / `productCurrency`. |
| `StoreBundleService` | Bundle items | `addBundleItem`, `updateBundleItem`, `removeBundleItem` | Manage bundle line items; `overridePrice: null` clears the override. |
| `StoreVariantService` (`store.variant.service.ts`) | Variant groups | `getVariantGroupForProduct`, `addToVariantGroup`, `updateVariantGroupItem`, `removeFromVariantGroup` | Membership model (see *Variant group flow*); a group shrinking below 2 items is dropped. |

### Webhook events

`createProduct` / `updateProduct` / `deleteProduct` call `WebhookService.dispatchEvent(tenantId, 'product.created' | 'product.updated' | 'product.deleted', …)` — the tenant's configured webhook endpoints receive the change (fire-and-forget; a webhook failure never breaks the store operation).

---

## Domain model notes

- **StoreCategory** — hierarchical (`parentId`), tenant-scoped.
- **StoreCategorySpec** — spec template attached to a category. Each spec has `type` (`TEXT` | `NUMBER` | `BOOLEAN` | `SELECT` | `MULTISELECT` | `DATE` | `COLOR`), optional `options[]`, `unit`, `placeholder`, `isRequired`, `isFilterable`.
- **StoreProduct** — `name`, `slug`, `shortDescription` (plain), **`details`** (HTML, edited via the WYSIWYG `RichTextEditor`), `basePrice`, `currency`, inventory, tags, SEO, status.
- **StoreProductSpecValue** — links a product to a category spec, stores the value as a string. Multi-select values are saved as JSON-stringified arrays.
- **StoreProductImage** — product images, supports primary and per-variant.
- **StoreVariationType** / **StoreVariationOption** / **StoreProductVariant** — option-combination variants (Color × Size etc.) with own SKU/price/stock.
- **StoreVariantGroup** / **StoreVariantGroupItem** — group products that are siblings of each other (e.g. iPhone 15 Pro vs. iPhone 15 Pro Max sold as separate products but presented as variants of one family). A product belongs to at most one group. Visibility is symmetric — every member sees every other member. Each item carries an optional `label` ("Blue 256GB").
- **StoreBundle** / **StoreBundleItem** — multi-product bundles with override prices.

---

## API Routes

All routes are tenant-scoped under `/tenant/[tenantId]/api/store/...` and require the tenant **`ADMIN`** role (`TenantSessionNextService.authenticateTenantByRequest({ requiredTenantRole: 'ADMIN' })`).

| Method | Path | Description |
|---|---|---|
| GET / POST | `/categories` | List / create categories |
| GET / PATCH / DELETE | `/categories/[categoryId]` | Get / update / delete a category |
| POST | `/categories/[categoryId]/specs` | Upsert a spec on a category |
| DELETE | `/categories/[categoryId]/specs/[specId]` | Delete a spec |
| GET / POST | `/products` | List (supports `specFilters`) / create products |
| GET / PATCH / DELETE | `/products/[productId]` | Get detail / update / delete a product |
| POST | `/products/[productId]/duplicate` | Clone a product (returns `{ product }`) |
| GET / POST | `/products/[productId]/images` | List / add product images |
| DELETE | `/products/[productId]/images/[imageId]` | Remove a product image |
| PUT | `/products/[productId]/spec-values` | Set spec values for a product |
| GET | `/products/[productId]/variant-group` | `{ group, items, products }` |
| POST | `/products/[productId]/variant-group/items` | Add a product to the group |
| PATCH / DELETE | `/products/[productId]/variant-group/items/[itemId]` | Edit / remove a group item |
| GET / POST | `/bundles` | List / create bundles |
| GET / PATCH / DELETE | `/bundles/[bundleId]` | Get (`?withItems=true`) / update / delete a bundle |
| POST | `/bundles/[bundleId]/items` | Add a bundle item |
| PATCH / DELETE | `/bundles/[bundleId]/items/[itemId]` | Edit / remove a bundle item |

Admin UI pages live under `/tenant/[tenantId]/admin/store/{categories,products,bundles}`.

---

## Spec template flow

1. Define a category (e.g. *PC*).
2. Add specs to the category (e.g. *CPU* → TEXT, *RAM* → SELECT with options `8GB,16GB,32GB`, …).
3. Create products under the category.
4. On the product detail admin page, open the **Specs** tab to fill in values per spec.
5. Use `specFilters` on the products list API to filter products by spec values.

### `specFilters` query format

`GET /tenant/[tenantId]/api/store/products` supports a JSON-encoded `specFilters` query parameter:

```
?specFilters=[{"specId":"<uuid>","values":["i7","i9"]},{"specId":"<uuid>","values":["32GB"]}]
```

Semantics:
- Multiple objects in the array → **AND** across specs (product must match every spec filter).
- Multiple values inside one object → **OR** within that spec (product matches if its stored value equals any of `values`).
- For `MULTISELECT` values, the stored value is a JSON array string — exact-string equality is currently used; pass the same JSON string in `values` to match.

---

## Variant group flow

From a product detail page's **Variants** tab:
- *Add Existing* — pick another product (must not already belong to a group). If this product has no group yet, one is created and both products are added; if it already has a group, the picked product joins it.
- *Duplicate as Variant* — clone the current product (see Duplicate below) and add the clone to the group in one click.
- *Edit label* / *Remove* — per-item actions on each sibling.

Endpoints (admin only):
- `GET    /tenant/[tenantId]/api/store/products/[productId]/variant-group` — `{ group, items, products }` (products is a `{productId -> info}` map for table rendering).
- `POST   /tenant/[tenantId]/api/store/products/[productId]/variant-group/items` body `{ productId, label?, sortOrder? }`.
- `PATCH  /tenant/[tenantId]/api/store/products/[productId]/variant-group/items/[itemId]` body `{ label?, sortOrder? }`.
- `DELETE /tenant/[tenantId]/api/store/products/[productId]/variant-group/items/[itemId]` — when the group shrinks below 2 items, it is dropped automatically.

---

## Duplicate product

`POST /tenant/[tenantId]/api/store/products/[productId]/duplicate` returns a fresh `{ product }`. The clone carries over the source's category, base fields, `details` (HTML), tags, SEO, weight, dimensions, **spec values**, and **image URLs**. `slug` gets a random suffix to stay unique, `name` gets a " (Copy)" suffix, `sku` is cleared, `status` is forced to `DRAFT`, `isFeatured` is reset to false. Variant group membership is NOT carried over.

UI surfaces:
- *Duplicate* button in the product detail page header.
- *Duplicate as Variant* button in the Variants tab (clone + add to group).
- *Duplicate* row action in the products list page.

---

## Bundles & bundle items

Endpoints (admin only):
- `GET    /tenant/[tenantId]/api/store/bundles/[bundleId]?withItems=true` — when `withItems=true`, each item is enriched server-side with `productName`, `productBasePrice` and `productCurrency` (joined from the referenced product), so names render regardless of the product's status. Without the join the bundle detail page could only resolve names for `ACTIVE` products.
- `POST   /tenant/[tenantId]/api/store/bundles/[bundleId]/items` body `{ productId, variantId?, quantity?, overridePrice?, sortOrder? }`.
- `PATCH  /tenant/[tenantId]/api/store/bundles/[bundleId]/items/[itemId]` body `{ quantity?, overridePrice?, sortOrder? }` — `overridePrice: null` clears the override back to the product's default price.
- `DELETE /tenant/[tenantId]/api/store/bundles/[bundleId]/items/[itemId]`.

The bundle detail page's **Bundle Items** table offers per-row *Edit* (quantity + override price) and *Remove* actions, plus *Add Product*.

---

## Settings

This module has **no settings file** and reads **no per-tenant settings** — all behavior is driven by tenant-scoped data, not configurable keys. See *Tenant Variability* for candidates that could become settings.

---

## Security

- Every API route requires the tenant **`ADMIN`** role; reads/writes are bound to the authenticated `tenantId` via the per-tenant DataSource, so tenants cannot reach each other's catalog.
- Slugs are unique per tenant for categories, products and bundles; `deleteCategory` is blocked while products reference it.

---

## Migration notes

Recent changes:

- **Removed** `compareAtPrice` from `StoreProduct` and `StoreProductVariant`. Manual DB cleanup if needed:
  ```sql
  ALTER TABLE store_products            DROP COLUMN IF EXISTS "compareAtPrice";
  ALTER TABLE store_product_variants    DROP COLUMN IF EXISTS "compareAtPrice";
  ```
- **Replaced** `richDescription` (JSONB, Tiptap/ProseMirror) on `StoreProduct` with `details` (text, HTML output from Quill via `@/modules_next/common/ui/RichTextEditor`). Manual DB cleanup if needed:
  ```sql
  ALTER TABLE store_products DROP COLUMN IF EXISTS "richDescription";
  ALTER TABLE store_products ADD  COLUMN IF NOT EXISTS "details" text;
  ```
  (TypeORM `synchronize` does this automatically in dev.)
- `StoreBundle.richDescription` is **unchanged** — bundles still use the JSONB column.
- **Replaced** `StoreProductVariantLink` (asymmetric A→B links) with `StoreVariantGroup` + `StoreVariantGroupItem` (membership model). Manual DB cleanup:
  ```sql
  DROP TABLE IF EXISTS store_product_variant_links;
  -- store_variant_groups + store_variant_group_items are created by TypeORM synchronize.
  ```

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

An admin-only, fully tenant-scoped e-commerce catalog module (categories, specs, products, images, variants, variant groups, bundles) where every entity lives in the per-tenant DB; it has no settings file and reads no per-tenant settings, so tenant variability comes entirely from tenant-scoped data rather than configurable keys.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `StoreCategory` | `store_categories` | parentId, name, slug, description, imageUrl, sortOrder, isActive |
| `StoreCategorySpec` | `store_category_specs` | categoryId, key, label, type, unit, placeholder, options, isRequired, isFilterable, sortOrder |
| `StoreProduct` | `store_products` | categoryId, name, slug, shortDescription, details, basePrice, currency, sku, stockQuantity, trackInventory, allowBackorder, weight, weightUnit, dimensions, tags, status, isFeatured, isDigital, digitalDownloadUrl, seo, sortOrder |
| `StoreProductImage` | `store_product_images` | productId, variantId, url, altText, sortOrder, isPrimary |
| `StoreProductSpecValue` | `store_product_spec_values` | productId, specId, value |
| `StoreVariationType` | `store_variation_types` | productId, name, displayType, sortOrder |
| `StoreVariationOption` | `store_variation_options` | variationTypeId, label, value, swatch, sortOrder |
| `StoreProductVariant` | `store_product_variants` | productId, optionIds, sku, price, stockQuantity, weight, imageUrl, isActive, sortOrder |
| `StoreVariantGroup` | `store_variant_groups` | name |
| `StoreVariantGroupItem` | `store_variant_group_items` | variantGroupId, productId, label, sortOrder |
| `StoreBundle` | `store_bundles` | name, slug, description, richDescription, bundlePrice, discountPercent, currency, imageUrl, status, availableFrom, availableTo, sortOrder |
| `StoreBundleItem` | `store_bundle_items` | bundleId, productId, variantId, quantity, overridePrice, sortOrder |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `store.{category,product,bundle,variant}.service.ts` — Every read/write resolves the data source via tenantDataSourceFor(tenantId) and filters where: { tenantId, ... }, so each tenant has a completely isolated catalog (categories, specs, products, variants, bundles). This is structural isolation, not setting-driven branching.
- `store.product.service.ts:createProduct/updateProduct/deleteProduct` — Dispatches product.created/updated/deleted via WebhookService.dispatchEvent(tenantId, ...), so the webhook endpoints/secrets actually fired are whatever that tenant has configured in the webhook module — per-tenant side effects.
- `store.{category,product,bundle}.service.ts (cache keys)` — Redis cache keys are namespaced per tenant for category lists (store:cats:${tenantId}); other keys (store:product:${productId}, store:bundle:${bundleId}) rely on globally-unique UUIDs, so cache reads are effectively per-tenant via tenant-unique ids.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| No per-tenant catalog limits (max categories / products / bundles / images) despite the platform having a tenant_subscription feature-key gating mechanism; createCategory/createProduct/createBundle/addImage create rows unconditionally. | `store.{category,product,bundle}.service.ts` | A multi-tenant SaaS typically gates catalog size by plan tier; today any tenant can create unlimited entities. Plausibly should read a per-tenant limit (via tenant_subscription feature keys or a setting) and reject over the cap. | `storeMaxProducts` |
| Hardcoded default currency 'USD' for products and bundles. | `store_product.entity.ts / store_bundle.entity.ts (currency column default) and store.seed.ts` | Different tenants operate in different markets; a tenant-level default currency would avoid forcing USD on every new product/bundle. It is currently a column default with no tenant override. | `storeDefaultCurrency` |
| Cache TTL handling (the former dead `CACHE_TTL = 300` const was removed during the service split). | `store.*.service.ts (cache TTL)` | Cache freshness is a global infra concern; reasonable to keep global, but if tenants want stricter freshness it could be per-tenant. Likely intentionally global shared-infra tuning. | — |
| Hardcoded inventory defaults trackInventory=true and allowBackorder=true on new products. | `store_product.entity.ts (trackInventory/allowBackorder column defaults)` | Whether a tenant's store tracks inventory or permits backorders is a store-wide policy; a per-tenant default would let a services-only tenant default to no inventory tracking instead of overriding each product. | `storeTrackInventoryByDefault` |

---

## Dependencies

`db`, `env`, `redis`, `logger` (and `webhook` for product event dispatch).
