import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { SEED_ADMIN_USER_ID } from '@/modules/seed/seed.context';
import { TenantInvitation } from './entities/tenant_invitation.entity';

/**
 * Seeds the `tenant_invitation` module.
 *
 * Rules of the house (mirrors store.seed.ts):
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` — here the unique `token` column — so re-runs reuse rows.
 *  - Use *valid* enum values: status ∈ PENDING/ACCEPTED/DECLINED/EXPIRED/REVOKED,
 *    memberRole ∈ OWNER/ADMIN/USER.
 *  - Cover the entity with varied rows (different statuses + roles + expiries).
 *
 * The `TenantInvitation` entity HAS a `tenantId` column → tenant-scoped repo.
 * `invitedByUserId` is a cross-module (identity) id; the tenant DBs carry no
 * cross-database FK, so we use the deterministic seed admin user id.
 */
export async function seedTenantInvitation(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  const invitedByUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;

  const now = Date.now();
  const days = (n: number) => new Date(now + n * 24 * 60 * 60 * 1000);

  // Each invitation has a stable token (the @Unique natural key) so re-running
  // the seed reuses the row rather than inserting a duplicate.
  type InvitationDef = {
    email: string;
    memberRole: string;
    token: string;
    status: string;
    expiresAt: Date;
  };

  const invitationDefs: InvitationDef[] = [
    // Fresh pending invite for a regular member — still well within its window.
    {
      email: 'pending.user@seed-tenant.test',
      memberRole: 'USER',
      token: 'seed-invitation-token-pending-user',
      status: 'PENDING',
      expiresAt: days(7),
    },
    // Pending admin invite, closer to expiry.
    {
      email: 'pending.admin@seed-tenant.test',
      memberRole: 'ADMIN',
      token: 'seed-invitation-token-pending-admin',
      status: 'PENDING',
      expiresAt: days(2),
    },
    // Already accepted invite.
    {
      email: 'accepted.user@seed-tenant.test',
      memberRole: 'USER',
      token: 'seed-invitation-token-accepted',
      status: 'ACCEPTED',
      expiresAt: days(-3),
    },
    // Recipient declined the invite.
    {
      email: 'declined.user@seed-tenant.test',
      memberRole: 'USER',
      token: 'seed-invitation-token-declined',
      status: 'DECLINED',
      expiresAt: days(-5),
    },
    // Lapsed without action — already past expiry.
    {
      email: 'expired.user@seed-tenant.test',
      memberRole: 'USER',
      token: 'seed-invitation-token-expired',
      status: 'EXPIRED',
      expiresAt: days(-10),
    },
    // Owner-level invite revoked by an admin before it was used.
    {
      email: 'revoked.owner@seed-tenant.test',
      memberRole: 'OWNER',
      token: 'seed-invitation-token-revoked',
      status: 'REVOKED',
      expiresAt: days(4),
    },
  ];

  const repo = ctx.repo<TenantInvitation>(TenantInvitation);
  let firstInvitationId: string | undefined;
  for (const def of invitationDefs) {
    const invitation = await foc(repo,
      { tenantId, token: def.token } as FindOptionsWhere<TenantInvitation>,
      {
        tenantId,
        email: def.email,
        invitedByUserId,
        memberRole: def.memberRole,
        token: def.token,
        status: def.status,
        expiresAt: def.expiresAt,
      },
    );
    firstInvitationId ??= invitation.invitationId;
  }

  // Publish a reference later modules might consume.
  refs.invitationId = firstInvitationId;

  ctx.log(`tenant_invitation: ${invitationDefs.length} invitations (pending/accepted/declined/expired/revoked) for ${tenantId}`);
}
