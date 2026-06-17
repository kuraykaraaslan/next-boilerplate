import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { SeoMeta } from './entities/seo_meta.entity';

/**
 * SEO demo seed.
 *
 * Mirrors the reference `store.seed.ts`:
 *  - Every write goes through `ctx.foc(repo, where, create)` keyed on the
 *    entity's @Unique constraint (tenantId + entityType + entityId) so re-runs
 *    reuse rows instead of duplicating them.
 *  - Only valid `entityType` enum values are used (store_category /
 *    store_product / store_bundle / dynamic_page — see `seo.enums.ts`).
 *  - `SeoMeta` carries a `tenantId` column, so it is tenant-scoped:
 *    `ctx.repo<SeoMeta>(SeoMeta)` + `tenantId: ctx.tenantId`.
 *  - `entityId` is a bare cross-module uuid; we read the real catalog ids from
 *    `ctx.refs` (published by the store seed) and fall back to fixed literals.
 */
export async function seedSeo(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // Cross-module entity ids (no cross-DB FKs — these are plain uuids).
  const productId = (refs.productId as string) ?? 'a1000000-0000-4000-8000-000000000001';
  const categoryId = (refs.categoryId as string) ?? 'a1000000-0000-4000-8000-000000000002';
  const bundleId = (refs.bundleId as string) ?? 'a1000000-0000-4000-8000-000000000003';
  // A dynamic page id — no store ref exists, so use a deterministic literal.
  const dynamicPageId = (refs.dynamicPageId as string) ?? 'a1000000-0000-4000-8000-000000000004';

  const repo = ctx.repo<SeoMeta>(SeoMeta);

  // Concrete local type so the def array does not poison foc's inference.
  type SeoDef = {
    entityType: 'store_category' | 'store_product' | 'store_bundle' | 'dynamic_page';
    entityId: string;
    title?: string;
    description?: string;
    keywords?: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    canonicalUrl?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterCard?: string;
    noIndex: boolean;
  };

  const defs: SeoDef[] = [
    // Product — full OpenGraph + Twitter large card, indexable.
    {
      entityType: 'store_product',
      entityId: productId,
      title: 'Test Laptop — 15.6" Performance Notebook | Demo Store',
      description:
        'A configurable 15.6" demo laptop with up to 32 GB RAM and a 1 TB SSD. Fast, light and built for everyday work and play.',
      keywords: ['laptop', 'notebook', '16GB RAM', 'SSD', 'demo'],
      ogTitle: 'Test Laptop — Performance Notebook',
      ogDescription: 'Configure RAM and storage and see live pricing on this seeded demo laptop.',
      ogImageUrl: 'https://picsum.photos/seed/test-laptop-og/1200/630',
      canonicalUrl: 'https://demo.example.com/products/test-laptop',
      twitterTitle: 'Test Laptop',
      twitterDescription: 'A configurable 15.6" demo laptop with up to 32 GB RAM.',
      twitterCard: 'summary_large_image',
      noIndex: false,
    },
    // Category — lighter SEO, summary card, indexable.
    {
      entityType: 'store_category',
      entityId: categoryId,
      title: 'Electronics — Phones, Laptops & Gadgets | Demo Store',
      description: 'Browse phones, laptops and gadgets in the Electronics category of the demo store.',
      keywords: ['electronics', 'phones', 'laptops', 'gadgets'],
      ogTitle: 'Electronics',
      ogDescription: 'Phones, laptops and gadgets.',
      ogImageUrl: 'https://picsum.photos/seed/test-electronics-og/1200/630',
      canonicalUrl: 'https://demo.example.com/categories/test-electronics',
      twitterCard: 'summary',
      noIndex: false,
    },
    // Bundle — minimal metadata, indexable.
    {
      entityType: 'store_bundle',
      entityId: bundleId,
      title: 'Starter Bundle — Laptop + Mouse | Demo Store',
      description: 'Save with the Starter Bundle: a Test Laptop paired with a Wireless Mouse.',
      keywords: ['bundle', 'starter kit', 'laptop', 'mouse'],
      canonicalUrl: 'https://demo.example.com/bundles/test-starter-bundle',
      twitterCard: 'summary',
      noIndex: false,
    },
    // Dynamic page — intentionally hidden from search engines (noIndex true).
    {
      entityType: 'dynamic_page',
      entityId: dynamicPageId,
      title: 'Internal Preview Page',
      description: 'A staging/preview dynamic page that should not be indexed by crawlers.',
      twitterCard: 'summary',
      noIndex: true,
    },
  ];

  for (const def of defs) {
    await foc(
      repo,
      { tenantId, entityType: def.entityType, entityId: def.entityId } as FindOptionsWhere<SeoMeta>,
      { tenantId, ...def },
    );
  }

  ctx.log(`seo: ${defs.length} seo_meta records (product, category, bundle, dynamic page) for ${tenantId}`);
}
