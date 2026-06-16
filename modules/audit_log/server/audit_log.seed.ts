import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@nb/seed/server/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID, SEED_ORDER_ID } from '@nb/seed/server/seed.context';
import { AuditLog } from './entities/audit_log.entity';
import { AuditActions } from './audit_log.enums';

/**
 * Audit-log demo seed.
 *
 * The `AuditLog` entity carries a `tenantId` column, so every row is
 * tenant-scoped via `ctx.repo(AuditLog)`. There is no DB `@Unique` constraint,
 * only indexes — so we use a stable composite natural key
 * (`tenantId + action + resourceId`) in `foc`'s `where` to keep re-runs
 * idempotent.
 *
 * Rules of the house (mirrors store.seed.ts):
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key.
 *  - Use *valid* enum values: `actorType` is only ever 'USER' or 'SYSTEM'
 *    (see audit_log.enums.ts → AuditActorTypeEnum); `action` strings come from
 *    the `AuditActions` constant map.
 *  - Cross-module ids are bare uuids (no cross-DB FKs): prefer the imported
 *    SEED_* constants, else read `ctx.refs`, else a fixed uuid literal.
 *  - `metadata` is a jsonb column (arbitrary object shape).
 *  - Timestamps are real JS Date objects (now, or a few days back for history).
 */
export async function seedAuditLog(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // Cross-module references (bare uuids — DBs have no cross-table FKs).
  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const adminUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;
  const orderId = (refs.orderId as string) ?? SEED_ORDER_ID;
  const productId = (refs.productId as string) ?? 'a1000000-0000-4000-8000-000000000001';

  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

  // Concrete local type so `foc`'s create-arg inference stays intact
  // (never spread a Partial<AuditLog> — it breaks inference; see store.seed.ts).
  type AuditLogDef = {
    actorId?: string;
    actorType: 'USER' | 'SYSTEM';
    action: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
  };

  const CHROME_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const SAFARI_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

  const entries: AuditLogDef[] = [
    // A user-driven successful login (USER actor, auth domain).
    {
      actorId: userId,
      actorType: 'USER',
      action: AuditActions.AUTH_LOGIN,
      resourceType: 'session',
      resourceId: userId,
      metadata: { method: 'password', mfa: false, geo: { country: 'US', city: 'New York' } },
      ipAddress: '203.0.113.42',
      userAgent: CHROME_UA,
      createdAt: daysAgo(5),
    },
    // A failed login attempt — no actorId resolved, system flagged it.
    {
      actorType: 'SYSTEM',
      action: AuditActions.AUTH_LOGIN_FAILED,
      resourceType: 'session',
      resourceId: 'unknown',
      metadata: { reason: 'invalid_password', attempts: 3, email: 'attacker@example.com' },
      ipAddress: '198.51.100.7',
      userAgent: SAFARI_UA,
      createdAt: daysAgo(4),
    },
    // Admin updates tenant settings (USER actor, settings domain).
    {
      actorId: adminUserId,
      actorType: 'USER',
      action: AuditActions.SETTINGS_UPDATED,
      resourceType: 'settings',
      resourceId: 'payment.currency',
      metadata: { key: 'payment.currency', from: 'USD', to: 'EUR' },
      ipAddress: '192.0.2.15',
      userAgent: CHROME_UA,
      createdAt: daysAgo(3),
    },
    // System-issued subscription assignment (SYSTEM actor, subscription domain).
    {
      actorType: 'SYSTEM',
      action: AuditActions.SUBSCRIPTION_ASSIGNED,
      resourceType: 'subscription',
      resourceId: orderId,
      metadata: { plan: 'pro', billingCycle: 'monthly', amount: 29, currency: 'USD', auto: true },
      createdAt: daysAgo(2),
    },
    // A member invitation sent by the admin (USER actor, invitation domain).
    {
      actorId: adminUserId,
      actorType: 'USER',
      action: AuditActions.INVITATION_SENT,
      resourceType: 'invitation',
      resourceId: 'c1000000-0000-4000-8000-000000000001',
      metadata: { email: 'newhire@example.com', role: 'EDITOR' },
      ipAddress: '192.0.2.15',
      userAgent: CHROME_UA,
      createdAt: daysAgo(1),
    },
    // A file upload performed by a regular user (USER actor, storage domain).
    {
      actorId: userId,
      actorType: 'USER',
      action: AuditActions.FILE_UPLOADED,
      resourceType: 'product',
      resourceId: productId,
      metadata: { fileName: 'hero.png', sizeBytes: 248_320, mimeType: 'image/png' },
      ipAddress: '203.0.113.42',
      userAgent: CHROME_UA,
      createdAt: new Date(now),
    },
  ];

  const repo = ctx.repo<AuditLog>(AuditLog);
  let firstAuditLogId: string | undefined;
  for (const e of entries) {
    const row = await foc(repo,
      { tenantId, action: e.action, resourceId: e.resourceId } as FindOptionsWhere<AuditLog>,
      { tenantId, ...e },
    );
    firstAuditLogId ??= row.auditLogId;
  }

  // Publish a reference later modules might consume.
  refs.auditLogId = firstAuditLogId;

  ctx.log(`audit_log: ${entries.length} audit log entries for ${tenantId}`);
}
