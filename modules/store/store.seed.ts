import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { StoreCategory } from './entities/store_category.entity';
import { StoreCategorySpec } from './entities/store_category_spec.entity';
import { StoreProduct } from './entities/store_product.entity';
import { StoreProductImage } from './entities/store_product_image.entity';
import { StoreProductSpecValue } from './entities/store_product_spec_value.entity';
import { StoreVariantGroup } from './entities/store_variant_group.entity';
import { StoreVariantGroupItem } from './entities/store_variant_group_item.entity';
import { StoreBundle } from './entities/store_bundle.entity';
import { StoreBundleItem } from './entities/store_bundle_item.entity';
import {
  elecSpecDefs, accSpecDefs, LAPTOP_DETAILS, LAPTOP_SEO, LAPTOP_DIMENSIONS,
} from './store.seed.data';
import { seedLaptopVariations } from './store.seed.variations';

/**
 * Reference seed: this is the template every other `<module>.seed.ts` follows.
 *
 * Rules of the house:
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` (slug / code / sku / composite) so re-runs reuse rows.
 *  - Use *valid* enum values (read the module's `*.enums.ts`).
 *  - Numbers are numbers; never pass stringified amounts.
 *  - Publish anything other modules depend on into `ctx.refs`.
 *
 * Spec/laptop data live in `store.seed.data`; the variation matrix in
 * `store.seed.variations`.
 */
export async function seedStore(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // ── Categories (parent + child + sibling) ──────────────────────────────────
  const electronics = await foc(ctx.repo<StoreCategory>(StoreCategory),
    { tenantId, slug: 'test-electronics' } as FindOptionsWhere<StoreCategory>,
    { tenantId, name: 'Electronics', slug: 'test-electronics', description: 'Phones, laptops and gadgets', sortOrder: 1, isActive: true },
  );
  await foc(ctx.repo<StoreCategory>(StoreCategory),
    { tenantId, slug: 'test-gaming' } as FindOptionsWhere<StoreCategory>,
    { tenantId, parentId: electronics.categoryId, name: 'Gaming', slug: 'test-gaming', description: 'Gaming hardware', sortOrder: 2, isActive: true },
  );
  const accessories = await foc(ctx.repo<StoreCategory>(StoreCategory),
    { tenantId, slug: 'test-accessories' } as FindOptionsWhere<StoreCategory>,
    { tenantId, name: 'Accessories', slug: 'test-accessories', description: 'Cables, mice and more', sortOrder: 3, isActive: true },
  );

  // ── Category spec templates (the filterable attribute schema) ───────────────
  const elecSpecs: Record<string, StoreCategorySpec> = {};
  for (const def of elecSpecDefs) {
    elecSpecs[def.key] = await foc(ctx.repo<StoreCategorySpec>(StoreCategorySpec),
      { tenantId, categoryId: electronics.categoryId, key: def.key } as FindOptionsWhere<StoreCategorySpec>,
      { tenantId, categoryId: electronics.categoryId, ...def },
    );
  }
  const accSpecs: Record<string, StoreCategorySpec> = {};
  for (const def of accSpecDefs) {
    accSpecs[def.key] = await foc(ctx.repo<StoreCategorySpec>(StoreCategorySpec),
      { tenantId, categoryId: accessories.categoryId, key: def.key } as FindOptionsWhere<StoreCategorySpec>,
      { tenantId, categoryId: accessories.categoryId, ...def },
    );
  }

  // ── Products (physical / digital / draft variations) ───────────────────────
  const productRepo = ctx.repo<StoreProduct>(StoreProduct);
  const laptop = await foc(productRepo,
    { tenantId, slug: 'test-laptop' } as FindOptionsWhere<StoreProduct>,
    {
      tenantId, categoryId: electronics.categoryId, name: 'Test Laptop', slug: 'test-laptop',
      shortDescription: 'A seeded test product', details: LAPTOP_DETAILS,
      basePrice: 1299.99, currency: 'USD', sku: 'TEST-LAPTOP', stockQuantity: 25,
      status: 'ACTIVE', isFeatured: true, tags: ['seed', 'demo'],
      weight: 1.8, weightUnit: 'kg', dimensions: LAPTOP_DIMENSIONS, seo: LAPTOP_SEO,
    },
  );
  // foc only writes on insert; backfill rich display fields on an older row.
  if (laptop.details !== LAPTOP_DETAILS || !laptop.seo) {
    await productRepo.update({ productId: laptop.productId }, { details: LAPTOP_DETAILS, seo: LAPTOP_SEO, dimensions: LAPTOP_DIMENSIONS });
    Object.assign(laptop, { details: LAPTOP_DETAILS, seo: LAPTOP_SEO, dimensions: LAPTOP_DIMENSIONS });
  }

  const planProduct = await foc(productRepo,
    { tenantId, slug: 'test-pro-plan' } as FindOptionsWhere<StoreProduct>,
    {
      tenantId, categoryId: electronics.categoryId, name: 'Pro Plan', slug: 'test-pro-plan',
      shortDescription: 'Monthly Pro subscription', basePrice: 29, currency: 'USD',
      sku: 'TEST-PRO-PLAN', status: 'ACTIVE', isDigital: true, trackInventory: false,
    },
  );

  const mouse = await foc(productRepo,
    { tenantId, slug: 'test-mouse' } as FindOptionsWhere<StoreProduct>,
    {
      tenantId, categoryId: accessories.categoryId, name: 'Wireless Mouse', slug: 'test-mouse',
      shortDescription: 'Ergonomic wireless mouse', basePrice: 39.99, currency: 'USD',
      sku: 'TEST-MOUSE', stockQuantity: 200, status: 'ACTIVE', tags: ['seed', 'accessory'],
    },
  );

  // ── Product images (primary + gallery) ─────────────────────────────────────
  const laptopImages: Array<{ url: string; altText?: string; isPrimary?: boolean; sortOrder?: number }> = [
    { url: 'https://picsum.photos/seed/test-laptop-1/800/600', altText: 'Test Laptop front', isPrimary: true, sortOrder: 0 },
    { url: 'https://picsum.photos/seed/test-laptop-2/800/600', altText: 'Test Laptop side', isPrimary: false, sortOrder: 1 },
    { url: 'https://picsum.photos/seed/test-laptop-3/800/600', altText: 'Test Laptop keyboard', isPrimary: false, sortOrder: 2 },
  ];
  for (const img of laptopImages) {
    await foc(ctx.repo<StoreProductImage>(StoreProductImage),
      { tenantId, productId: laptop.productId, url: img.url } as FindOptionsWhere<StoreProductImage>,
      { tenantId, productId: laptop.productId, ...img },
    );
  }
  await foc(ctx.repo<StoreProductImage>(StoreProductImage),
    { tenantId, productId: mouse.productId, url: 'https://picsum.photos/seed/test-mouse/800/600' } as FindOptionsWhere<StoreProductImage>,
    { tenantId, productId: mouse.productId, url: 'https://picsum.photos/seed/test-mouse/800/600', altText: 'Wireless Mouse', isPrimary: true, sortOrder: 0 },
  );

  // ── Per-product spec values ────────────────────────────────────────────────
  const laptopSpecValues: Record<string, string> = { ram: '16', storage: '512', screen: '15.6', color: 'Red', touchscreen: 'true' };
  for (const [key, value] of Object.entries(laptopSpecValues)) {
    await foc(ctx.repo<StoreProductSpecValue>(StoreProductSpecValue),
      { tenantId, productId: laptop.productId, specId: elecSpecs[key].specId } as FindOptionsWhere<StoreProductSpecValue>,
      { tenantId, productId: laptop.productId, specId: elecSpecs[key].specId, value },
    );
  }
  const mouseSpecValues: Record<string, string> = { color: 'Black', connectivity: 'Wireless' };
  for (const [key, value] of Object.entries(mouseSpecValues)) {
    await foc(ctx.repo<StoreProductSpecValue>(StoreProductSpecValue),
      { tenantId, productId: mouse.productId, specId: accSpecs[key].specId } as FindOptionsWhere<StoreProductSpecValue>,
      { tenantId, productId: mouse.productId, specId: accSpecs[key].specId, value },
    );
  }

  // ── Product variations (RAM × Storage → 3×3 sellable variants) ─────────────
  const firstVariantId = await seedLaptopVariations(ctx, laptop);

  // ── Variant groups (cross-sell families) ───────────────────────────────────
  const laptopGroup = await foc(ctx.repo<StoreVariantGroup>(StoreVariantGroup),
    { tenantId, name: 'Laptop Family' } as FindOptionsWhere<StoreVariantGroup>,
    { tenantId, name: 'Laptop Family' },
  );
  // store_variant_group_items is UNIQUE(tenantId, productId) — a product maps to a
  // single group item — so key foc on that, not on variantGroupId.
  await foc(ctx.repo<StoreVariantGroupItem>(StoreVariantGroupItem),
    { tenantId, productId: laptop.productId } as FindOptionsWhere<StoreVariantGroupItem>,
    { tenantId, variantGroupId: laptopGroup.variantGroupId, productId: laptop.productId, label: 'Laptop', sortOrder: 0 },
  );
  await foc(ctx.repo<StoreVariantGroupItem>(StoreVariantGroupItem),
    { tenantId, productId: mouse.productId } as FindOptionsWhere<StoreVariantGroupItem>,
    { tenantId, variantGroupId: laptopGroup.variantGroupId, productId: mouse.productId, label: 'Mouse', sortOrder: 1 },
  );

  // ── Bundles (active + scheduled) ───────────────────────────────────────────
  const starterBundle = await foc(ctx.repo<StoreBundle>(StoreBundle),
    { tenantId, slug: 'test-starter-bundle' } as FindOptionsWhere<StoreBundle>,
    { tenantId, name: 'Starter Bundle', slug: 'test-starter-bundle', description: 'Laptop + mouse starter kit', currency: 'USD', bundlePrice: 1319.99, discountPercent: 8, status: 'ACTIVE', sortOrder: 1 },
  );
  const proBundle = await foc(ctx.repo<StoreBundle>(StoreBundle),
    { tenantId, slug: 'test-pro-bundle' } as FindOptionsWhere<StoreBundle>,
    { tenantId, name: 'Pro Bundle', slug: 'test-pro-bundle', description: 'Laptop + Pro Plan', currency: 'USD', bundlePrice: 1349.99, discountPercent: 5, status: 'DRAFT', sortOrder: 2 },
  );
  const bundleItems: Array<{ bundleId: string; productId: string; quantity: number }> = [
    { bundleId: starterBundle.bundleId, productId: laptop.productId, quantity: 1 },
    { bundleId: starterBundle.bundleId, productId: mouse.productId, quantity: 1 },
    { bundleId: proBundle.bundleId, productId: laptop.productId, quantity: 1 },
    { bundleId: proBundle.bundleId, productId: planProduct.productId, quantity: 1 },
  ];
  for (const bi of bundleItems) {
    await foc(ctx.repo<StoreBundleItem>(StoreBundleItem),
      { tenantId, bundleId: bi.bundleId, productId: bi.productId } as FindOptionsWhere<StoreBundleItem>,
      { tenantId, ...bi },
    );
  }

  // ── Publish references other modules consume ───────────────────────────────
  refs.categoryId = electronics.categoryId;
  refs.productId = laptop.productId;
  refs.planProductId = planProduct.productId;
  refs.productVariantId = firstVariantId;
  refs.bundleId = starterBundle.bundleId;

  ctx.log(`store: 3 categories, 3 products, 9 variants, 2 bundles for ${tenantId}`);
}
