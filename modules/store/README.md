# store

Tenant-aware e-commerce store. Admin-only — no storefront UI.

## Domain model

- **StoreCategory** — hierarchical (`parentId`), tenant-scoped.
- **StoreCategorySpec** — spec template attached to a category. Each spec has `type` (`TEXT` | `NUMBER` | `BOOLEAN` | `SELECT` | `MULTISELECT` | `DATE` | `COLOR`), optional `options[]`, `unit`, `placeholder`, `isRequired`, `isFilterable`.
- **StoreProduct** — `name`, `slug`, `shortDescription` (plain), **`details`** (HTML, edited via the WYSIWYG `RichTextEditor`), `basePrice`, `currency`, inventory, tags, SEO, status.
- **StoreProductSpecValue** — links a product to a category spec, stores the value as a string. Multi-select values are saved as JSON-stringified arrays.
- **StoreProductImage** — product images, supports primary and per-variant.
- **StoreVariationType** / **StoreVariationOption** / **StoreProductVariant** — option-combination variants (Color × Size etc.) with own SKU/price/stock.
- **StoreVariantGroup** / **StoreVariantGroupItem** — group products that are siblings of each other (e.g. iPhone 15 Pro vs. iPhone 15 Pro Max sold as separate products but presented as variants of one family). A product belongs to at most one group. Visibility is symmetric — every member sees every other member. Each item carries an optional `label` ("Blue 256GB").
- **StoreBundle** / **StoreBundleItem** — multi-product bundles with override prices.

## Spec template flow

1. Define a category (e.g. *PC*).
2. Add specs to the category (e.g. *CPU* → TEXT, *RAM* → SELECT with options `8GB,16GB,32GB`, …).
3. Create products under the category.
4. On the product detail admin page, open the **Specs** tab to fill in values per spec.
5. Use `specFilters` on the products list API to filter products by spec values.

### `specFilters` query format

`GET /tenant/:tenantId/api/store/products` supports a JSON-encoded `specFilters` query parameter:

```
?specFilters=[{"specId":"<uuid>","values":["i7","i9"]},{"specId":"<uuid>","values":["32GB"]}]
```

Semantics:
- Multiple objects in the array → **AND** across specs (product must match every spec filter).
- Multiple values inside one object → **OR** within that spec (product matches if its stored value equals any of `values`).
- For `MULTISELECT` values, the stored value is a JSON array string — exact-string equality is currently used; pass the same JSON string in `values` to match.

## Variant group flow

From a product detail page's **Variants** tab:
- *Add Existing* — pick another product (must not already belong to a group). If this product has no group yet, one is created and both products are added; if it already has a group, the picked product joins it.
- *Duplicate as Variant* — clone the current product (see Duplicate below) and add the clone to the group in one click.
- *Edit label* / *Remove* — per-item actions on each sibling.

Endpoints (admin only):
- `GET    /tenant/:tid/api/store/products/:pid/variant-group` — `{ group, items, products }` (products is a `{productId -> info}` map for table rendering).
- `POST   /tenant/:tid/api/store/products/:pid/variant-group/items` body `{ productId, label?, sortOrder? }`.
- `PATCH  /tenant/:tid/api/store/products/:pid/variant-group/items/:itemId` body `{ label?, sortOrder? }`.
- `DELETE /tenant/:tid/api/store/products/:pid/variant-group/items/:itemId` — when the group shrinks below 2 items, it is dropped automatically.

## Duplicate product

`POST /tenant/:tid/api/store/products/:pid/duplicate` returns a fresh `{ product }`. The clone carries over the source's category, base fields, `details` (HTML), tags, SEO, weight, dimensions, **spec values**, and **image URLs**. `slug` gets a random suffix to stay unique, `name` gets a " (Copy)" suffix, `sku` is cleared, `status` is forced to `DRAFT`, `isFeatured` is reset to false. Variant group membership is NOT carried over.

UI surfaces:
- *Duplicate* button in the product detail page header.
- *Duplicate as Variant* button in the Variants tab (clone + add to group).
- *Duplicate* row action in the products list page.

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

## Dependencies

`db`, `env`, `redis`, `logger`.
