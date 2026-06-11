import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@/modules/seed/seed.context';
import { UploadedFile } from './entities/uploaded_file.entity';

/**
 * Storage demo seed.
 *
 * The storage module persists one audit row per successful upload
 * (`UploadedFile`). Each row records which S3-compatible provider / bucket the
 * object lives in, its object `key`, size, mime type and (optionally) the user
 * who uploaded it. The bytes themselves live in the bucket; this table is the
 * billing / quota / audit ledger joined against `TenantUsage.storageBytes`.
 *
 * Rules of the house (mirrors `store.seed.ts`):
 *  - `UploadedFile` HAS a `tenantId` column → tenant-scoped: `ctx.repo(...)`
 *    and set `tenantId: ctx.tenantId`.
 *  - Always go through `ctx.foc(repo, where, create)`. There is no `@Unique`
 *    constraint, but the object `key` is unique within a tenant's buckets, so
 *    the natural key is the `(tenantId, key)` pair → re-runs reuse rows.
 *  - `provider` uses only valid `StorageProviderType` enum values
 *    (aws-s3 / s3 / cloudflare-r2 / digitalocean-spaces / minio).
 *  - `size` is a number (bigint column); never a stringified amount.
 *  - Timestamps are real Date objects; back-date `createdAt` so the demo ledger
 *    reads like real history, and soft-delete one row via `deletedAt`.
 */
export async function seedStorage(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const adminUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;

  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

  // ── Uploaded files (varied providers / buckets / mime types) ───────────────
  // Cover every supported provider, both image and document payloads, a
  // user-attributed upload, an admin-attributed upload, an anonymous/system
  // upload (no userId), and a soft-deleted row.
  type FileDef = {
    key: string;
    bucket: string;
    provider: string; // StorageProviderType
    size: number; // bytes
    mimeType: string;
    url?: string;
    userId?: string;
    createdAt: Date;
    deletedAt?: Date;
  };

  const fileDefs: FileDef[] = [
    {
      // User avatar on AWS S3.
      key: `tenants/${tenantId}/users/avatar.png`,
      bucket: 'demo-assets',
      provider: 'aws-s3',
      size: 48_213,
      mimeType: 'image/png',
      url: 'https://demo-assets.s3.amazonaws.com/users/avatar.png',
      userId,
      createdAt: daysAgo(21),
    },
    {
      // Tenant logo on Cloudflare R2 (admin-uploaded branding).
      key: `tenants/${tenantId}/branding/logos/logo.webp`,
      bucket: 'demo-branding',
      provider: 'cloudflare-r2',
      size: 12_004,
      mimeType: 'image/webp',
      url: 'https://demo-branding.r2.cloudflarestorage.com/branding/logos/logo.webp',
      userId: adminUserId,
      createdAt: daysAgo(14),
    },
    {
      // Large product hero shot on DigitalOcean Spaces.
      key: `tenants/${tenantId}/images/products/hero.jpeg`,
      bucket: 'demo-media',
      provider: 'digitalocean-spaces',
      size: 1_874_560,
      mimeType: 'image/jpeg',
      url: 'https://demo-media.nyc3.digitaloceanspaces.com/images/products/hero.jpeg',
      userId,
      createdAt: daysAgo(7),
    },
    {
      // System-generated export on a self-hosted MinIO bucket (no user).
      key: `tenants/${tenantId}/files/export-2026-05.csv`,
      bucket: 'demo-files',
      provider: 'minio',
      size: 524_288,
      mimeType: 'text/csv',
      createdAt: daysAgo(2),
    },
    {
      // Soft-deleted favicon (kept for audit; bytes already purged from bucket).
      key: `tenants/${tenantId}/branding/favicon/favicon.ico`,
      bucket: 'demo-branding',
      provider: 's3',
      size: 4_286,
      mimeType: 'image/avif',
      url: 'https://demo-branding.s3.amazonaws.com/branding/favicon/favicon.ico',
      userId: adminUserId,
      createdAt: daysAgo(30),
      deletedAt: daysAgo(1),
    },
  ];

  const fileRepo = ctx.repo<UploadedFile>(UploadedFile);
  let firstFileId: string | undefined;
  for (const def of fileDefs) {
    const row = await foc(fileRepo,
      { tenantId, key: def.key } as FindOptionsWhere<UploadedFile>,
      { tenantId, ...def },
    );
    firstFileId ??= row.uploadedFileId;
  }

  // ── Publish references other modules may consume ───────────────────────────
  refs.uploadedFileId = firstFileId;

  ctx.log(`storage: ${fileDefs.length} uploaded files (5 providers, 1 soft-deleted) for ${tenantId}`);
}
