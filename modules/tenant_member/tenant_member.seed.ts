import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@/modules/seed/seed.context';
import { TenantMember } from './entities/tenant_member.entity';

/**
 * Demo-data seed for the `tenant_member` module.
 *
 * `tenant_member` is the membership join between a tenant and a user: it pins
 * each user's role (OWNER/ADMIN/USER) and status (ACTIVE/INACTIVE/SUSPENDED/
 * PENDING) inside one tenant, plus optional SCIM `externalId` correlation.
 *
 * Rules followed (see modules/store/store.seed.ts for the reference):
 *  - `TenantMember` HAS a `tenantId` column → tenant-scoped via `ctx.repo`.
 *  - Natural key is the @Unique(['tenantId', 'userId']) pair → re-runs reuse rows.
 *  - Enum values are copied verbatim from tenant_member.enums.ts.
 *  - userId values are cross-module bare uuids: prefer the shared SEED_*_ID
 *    constants / ctx.refs, falling back to fixed uuid literals.
 *  - Numbers (sessionVersion) are real numbers; timestamps are real Date objects.
 */
export async function seedTenantMember(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // Cross-module user ids: the tenant's people. Owner + admin reuse the shared
  // seed constants; the rest fall back to deterministic uuid literals so the
  // membership rows stay stable across re-runs even without the user module.
  const ownerUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;
  const adminUserId = (refs.userId as string) ?? SEED_USER_ID;
  const memberUserId = 'a0000000-0000-4000-8000-000000000003';
  const pendingUserId = 'a0000000-0000-4000-8000-000000000004';

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  // Concrete local row shape so foc's create argument keeps full type inference
  // (never spread a Partial<Entity> into foc — it breaks inference).
  type MemberDef = {
    userId: string;
    memberRole: 'OWNER' | 'ADMIN' | 'USER';
    memberStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
    externalId: string | null;
    sessionVersion: number;
    createdAt: Date;
  };

  const memberDefs: MemberDef[] = [
    // Founder: OWNER, active, provisioned via SCIM (has an externalId).
    {
      userId: ownerUserId,
      memberRole: 'OWNER',
      memberStatus: 'ACTIVE',
      externalId: 'okta|00u1a2b3c4d5e6f7g8h9',
      sessionVersion: 3,
      createdAt: daysAgo(90),
    },
    // Operator: ADMIN, active, also SCIM-linked from a different IdP.
    {
      userId: adminUserId,
      memberRole: 'ADMIN',
      memberStatus: 'ACTIVE',
      externalId: 'azuread|7f3c1d9e-2b44-4a01-9c8e-1122334455aa',
      sessionVersion: 1,
      createdAt: daysAgo(45),
    },
    // Suspended regular member, manually created (no SCIM externalId).
    {
      userId: memberUserId,
      memberRole: 'USER',
      memberStatus: 'SUSPENDED',
      externalId: null,
      sessionVersion: 0,
      createdAt: daysAgo(14),
    },
    // Invited member awaiting acceptance: USER, PENDING, no externalId yet.
    {
      userId: pendingUserId,
      memberRole: 'USER',
      memberStatus: 'PENDING',
      externalId: null,
      sessionVersion: 0,
      createdAt: daysAgo(2),
    },
  ];

  const memberRepo = ctx.repo<TenantMember>(TenantMember);
  let ownerMemberId: string | undefined;

  for (const def of memberDefs) {
    const member = await foc(
      memberRepo,
      { tenantId, userId: def.userId } as FindOptionsWhere<TenantMember>,
      {
        tenantId,
        userId: def.userId,
        memberRole: def.memberRole,
        memberStatus: def.memberStatus,
        externalId: def.externalId,
        sessionVersion: def.sessionVersion,
        createdAt: def.createdAt,
      },
    );
    if (def.memberRole === 'OWNER') ownerMemberId = member.tenantMemberId;
  }

  // Publish the owner membership id for any later module that wants it.
  refs.tenantMemberId = ownerMemberId;
  refs.ownerUserId = ownerUserId;

  ctx.log(
    `tenant_member: 4 members (OWNER/ADMIN active, USER suspended, USER pending) for ${tenantId}`,
  );
}
