import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { SEED_USER_ID } from '@kuraykaraaslan/seed/server/seed.context';
import { MediaGallery } from './entities/media_gallery.entity';
import { MediaGalleryItem } from './entities/media_gallery_item.entity';
import { UploadedFile } from '@kuraykaraaslan/storage/server/entities/uploaded_file.entity';

/**
 * media_gallery module seed.
 *
 * Mirrors `store.seed.ts`:
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` so re-runs reuse rows instead of duplicating them.
 *  - Use *valid* enum values only — `entityType` must be one of the
 *    `GalleryEntityTypeEnum` values (see `media_gallery.enums.ts`):
 *      store_category | store_product | store_bundle | store_variant
 *  - Numbers are numbers; timestamps are real `Date` objects.
 *  - Cover each entity with 2–3 *varied* rows.
 *
 * SCOPING: all three entities (`MediaGallery`, `MediaGalleryItem`,
 * `UploadedFile`) carry a `tenantId` column, so we use `ctx.repo<Entity>(Entity)`
 * and stamp `tenantId: ctx.tenantId` on every row.
 *
 * Why seed `UploadedFile` here? `MediaGalleryItem.uploadedFileId` is a *real*
 * same-tenant-DB FK (`@ManyToOne(() => UploadedFile, { onDelete: 'CASCADE' })`),
 * enforced under `synchronize: true`. The gallery item only carries the
 * gallery-side overlay (altText/title/sortOrder/isPrimary); the photo bytes
 * (url/key/mimeType/size/bucket/provider) live on `UploadedFile`. There is no
 * standalone storage seeder in the runner, so we create the audit rows the
 * items point at first — otherwise every item insert would fail the FK check.
 *
 * Natural keys:
 *  - UploadedFile     → (tenantId, key)               [key is the unique S3 object key]
 *  - MediaGallery     → (tenantId, entityType, entityId)  [@Unique(...) on the entity]
 *  - MediaGalleryItem → (tenantId, galleryId, uploadedFileId)  [one wrapper per file per gallery]
 */
export async function seedMediaGallery(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  // ── Cross-module ids (bare uuids; no cross-DB FKs for these) ────────────────
  // Galleries are polymorphic: each one decorates an entity owned by `store`.
  // Read the real ids from `ctx.refs` when present (store runs first), else fall
  // back to deterministic uuid literals so re-runs stay stable.
  const productId = (refs.productId as string) ?? 'a1000000-0000-4000-8000-000000000001';
  const categoryId = (refs.categoryId as string) ?? 'a1000000-0000-4000-8000-000000000002';
  const bundleId = (refs.bundleId as string) ?? 'a1000000-0000-4000-8000-000000000003';
  const userId = (refs.userId as string) ?? SEED_USER_ID;

  const fileRepo = ctx.repo<UploadedFile>(UploadedFile);
  const galleryRepo = ctx.repo<MediaGallery>(MediaGallery);
  const itemRepo = ctx.repo<MediaGalleryItem>(MediaGalleryItem);

  // ── UploadedFile audit rows (the storage truth the items wrap) ──────────────
  // Varied providers / buckets / mime types / sizes so the demo exercises the
  // multi-provider storage surface (aws-s3, cloudflare-r2, digitalocean-spaces).
  type FileDef = {
    key: string;
    bucket: string;
    provider: string;
    size: number;
    mimeType: string;
    url: string;
    userId?: string;
    createdAt: Date;
  };
  const fileDefs: FileDef[] = [
    // product gallery photos (jpeg/webp, AWS)
    { key: 'seed/media/test-product-hero.jpg', bucket: 'tenant-media', provider: 'aws-s3', size: 248_512, mimeType: 'image/jpeg', url: 'https://picsum.photos/seed/mg-product-1/1200/900', userId, createdAt: daysAgo(9) },
    { key: 'seed/media/test-product-detail.webp', bucket: 'tenant-media', provider: 'aws-s3', size: 112_944, mimeType: 'image/webp', url: 'https://picsum.photos/seed/mg-product-2/1200/900', userId, createdAt: daysAgo(8) },
    { key: 'seed/media/test-product-lifestyle.jpg', bucket: 'tenant-media', provider: 'aws-s3', size: 301_120, mimeType: 'image/jpeg', url: 'https://picsum.photos/seed/mg-product-3/1200/900', createdAt: daysAgo(7) },
    // category banner (png, Cloudflare R2)
    { key: 'seed/media/test-category-banner.png', bucket: 'tenant-assets', provider: 'cloudflare-r2', size: 524_288, mimeType: 'image/png', url: 'https://picsum.photos/seed/mg-category-1/1600/500', userId, createdAt: daysAgo(6) },
    { key: 'seed/media/test-category-thumb.webp', bucket: 'tenant-assets', provider: 'cloudflare-r2', size: 64_000, mimeType: 'image/webp', url: 'https://picsum.photos/seed/mg-category-2/600/600', createdAt: daysAgo(5) },
    // bundle promo (jpeg, DigitalOcean Spaces)
    { key: 'seed/media/test-bundle-promo.jpg', bucket: 'tenant-promos', provider: 'digitalocean-spaces', size: 176_640, mimeType: 'image/jpeg', url: 'https://picsum.photos/seed/mg-bundle-1/1000/1000', userId, createdAt: daysAgo(3) },
  ];
  const files: Record<string, UploadedFile> = {};
  for (const def of fileDefs) {
    files[def.key] = await foc(fileRepo,
      { tenantId, key: def.key } as FindOptionsWhere<UploadedFile>,
      { tenantId, ...def },
    );
  }

  // ── Galleries (one per polymorphic target; varied entityType values) ────────
  type GalleryDef = { entityType: string; entityId: string; createdAt: Date };
  const galleryDefs: GalleryDef[] = [
    { entityType: 'store_product', entityId: productId, createdAt: daysAgo(9) },
    { entityType: 'store_category', entityId: categoryId, createdAt: daysAgo(6) },
    { entityType: 'store_bundle', entityId: bundleId, createdAt: daysAgo(3) },
  ];
  const galleries: Record<string, MediaGallery> = {};
  for (const def of galleryDefs) {
    galleries[def.entityType] = await foc(galleryRepo,
      { tenantId, entityType: def.entityType, entityId: def.entityId } as FindOptionsWhere<MediaGallery>,
      { tenantId, ...def },
    );
  }

  // ── Gallery items (the ordered overlay wrapping each UploadedFile) ──────────
  // Each item: which gallery it belongs to, which file it wraps, plus the
  // gallery-only overlay (altText/title/sortOrder/isPrimary). Exactly one
  // primary per gallery; the rest are ordered extras.
  type ItemDef = {
    galleryId: string;
    uploadedFileId: string;
    altText?: string;
    title?: string;
    sortOrder: number;
    isPrimary: boolean;
    createdAt: Date;
  };
  const itemDefs: ItemDef[] = [
    // product gallery: hero (primary) + 2 extras
    { galleryId: galleries.store_product.galleryId, uploadedFileId: files['seed/media/test-product-hero.jpg'].uploadedFileId, altText: 'Test Laptop — front hero shot', title: 'Hero', sortOrder: 0, isPrimary: true, createdAt: daysAgo(9) },
    { galleryId: galleries.store_product.galleryId, uploadedFileId: files['seed/media/test-product-detail.webp'].uploadedFileId, altText: 'Test Laptop — keyboard detail', title: 'Detail', sortOrder: 1, isPrimary: false, createdAt: daysAgo(8) },
    { galleryId: galleries.store_product.galleryId, uploadedFileId: files['seed/media/test-product-lifestyle.jpg'].uploadedFileId, altText: 'Test Laptop — in use', sortOrder: 2, isPrimary: false, createdAt: daysAgo(7) },
    // category gallery: banner (primary) + thumb
    { galleryId: galleries.store_category.galleryId, uploadedFileId: files['seed/media/test-category-banner.png'].uploadedFileId, altText: 'Electronics category banner', title: 'Banner', sortOrder: 0, isPrimary: true, createdAt: daysAgo(6) },
    { galleryId: galleries.store_category.galleryId, uploadedFileId: files['seed/media/test-category-thumb.webp'].uploadedFileId, altText: 'Electronics category thumbnail', sortOrder: 1, isPrimary: false, createdAt: daysAgo(5) },
    // bundle gallery: single promo (primary)
    { galleryId: galleries.store_bundle.galleryId, uploadedFileId: files['seed/media/test-bundle-promo.jpg'].uploadedFileId, altText: 'Starter Bundle promo', title: 'Promo', sortOrder: 0, isPrimary: true, createdAt: daysAgo(3) },
  ];
  for (const def of itemDefs) {
    await foc(itemRepo,
      { tenantId, galleryId: def.galleryId, uploadedFileId: def.uploadedFileId } as FindOptionsWhere<MediaGalleryItem>,
      { tenantId, ...def },
    );
  }

  // ── Publish references later modules might consume ──────────────────────────
  refs.galleryId = galleries.store_product.galleryId;
  refs.uploadedFileId = files['seed/media/test-product-hero.jpg'].uploadedFileId;

  ctx.log(`media_gallery: 6 uploaded files, 3 galleries, 6 items for ${tenantId}`);
}
