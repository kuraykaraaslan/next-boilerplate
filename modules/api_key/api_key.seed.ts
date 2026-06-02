import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@/modules/seed/seed.context';
import { ApiKey } from './entities/api_key.entity';

/**
 * Demo-data seed for the `api_key` module.
 *
 * Rules of the house (mirrors `store.seed.ts`):
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` so re-runs reuse rows. The `ApiKey` natural key is `keyHash`
 *    (unique index) — we use a deterministic fake hash per seeded key.
 *  - Only valid scope values from `api_key.enums.ts`:
 *    read / write / admin / scim:read / scim:write.
 *  - `ApiKey` HAS a `tenantId` column → tenant-scoped: `ctx.repo<ApiKey>(ApiKey)`
 *    and set `tenantId: ctx.tenantId`.
 *  - Timestamps are real Date objects.
 *  - `createdByUserId` is a cross-module (identity) reference → bare uuid.
 *
 * Three varied rows are seeded: an active read/write key (last used recently),
 * an admin key with an expiry, a SCIM provisioning key (read+write), and a
 * revoked/expired key — exercising scope combinations and the isActive flag.
 */
export async function seedApiKey(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // Cross-module identity references (bare uuids — no cross-DB FKs).
  const ownerUserId = (refs.userId as string) ?? SEED_USER_ID;
  const adminUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  type ApiKeyDef = {
    keyHash: string;
    keyPrefix: string;
    name: string;
    description: string | null;
    scopes: string[];
    isActive: boolean;
    createdByUserId: string;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
  };

  const apiKeyDefs: ApiKeyDef[] = [
    // 1) Active read/write integration key, used recently, no expiry.
    {
      keyHash: 'seed-apikey-hash-0000000000000000000000000000000000000001',
      keyPrefix: 'sk_live_a1b2',
      name: 'CI Pipeline Key',
      description: 'Read/write key used by the demo CI pipeline.',
      scopes: ['read', 'write'],
      isActive: true,
      createdByUserId: ownerUserId,
      lastUsedAt: daysAgo(1),
      expiresAt: null,
      createdAt: daysAgo(30),
    },
    // 2) Admin key with an upcoming expiry, never used yet.
    {
      keyHash: 'seed-apikey-hash-0000000000000000000000000000000000000002',
      keyPrefix: 'sk_live_c3d4',
      name: 'Admin Automation Key',
      description: 'Full-access admin key for back-office automation. Rotates quarterly.',
      scopes: ['read', 'write', 'admin'],
      isActive: true,
      createdByUserId: adminUserId,
      lastUsedAt: null,
      expiresAt: daysFromNow(90),
      createdAt: daysAgo(10),
    },
    // 3) SCIM provisioning bearer token (read + write SCIM scopes).
    {
      keyHash: 'seed-apikey-hash-0000000000000000000000000000000000000003',
      keyPrefix: 'sk_scim_e5f6',
      name: 'SCIM Provisioning Token',
      description: 'IdP SCIM 2.0 bearer token for user provisioning.',
      scopes: ['scim:read', 'scim:write'],
      isActive: true,
      createdByUserId: adminUserId,
      lastUsedAt: daysAgo(2),
      expiresAt: daysFromNow(365),
      createdAt: daysAgo(5),
    },
    // 4) Revoked + expired read-only key (inactive, past expiry).
    {
      keyHash: 'seed-apikey-hash-0000000000000000000000000000000000000004',
      keyPrefix: 'sk_test_0789',
      name: 'Legacy Reporting Key',
      description: 'Read-only key, revoked after a leak and now expired.',
      scopes: ['read'],
      isActive: false,
      createdByUserId: ownerUserId,
      lastUsedAt: daysAgo(60),
      expiresAt: daysAgo(15),
      createdAt: daysAgo(120),
    },
  ];

  const apiKeyRepo = ctx.repo<ApiKey>(ApiKey);
  let first: ApiKey | undefined;
  for (const def of apiKeyDefs) {
    const row = await foc(apiKeyRepo,
      { keyHash: def.keyHash } as FindOptionsWhere<ApiKey>,
      { tenantId, ...def },
    );
    first ??= row;
  }

  // Publish a reference later modules might consume.
  if (first) refs.apiKeyId = first.apiKeyId;

  ctx.log(`api_key: 4 keys (read/write, admin, scim, revoked) for ${tenantId}`);
}
