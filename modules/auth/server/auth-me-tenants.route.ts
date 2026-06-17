// path: app/tenant/[tenantId]/api/auth/me/tenants/route.ts
import 'reflect-metadata';
import { IsNull, MoreThan } from 'typeorm';
import { NextRequest, NextResponse } from 'next/server';
import Logger from '@kuraykaraaslan/logger';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import { getDataSource, tenantDataSourceFor } from '@kuraykaraaslan/db';
import { TenantMember as TenantMemberEntity } from '@kuraykaraaslan/tenant_member/server/entities/tenant_member.entity';
import { Tenant as TenantEntity } from '@kuraykaraaslan/tenant/server/entities/tenant.entity';
import { TenantDomain as TenantDomainEntity } from '@kuraykaraaslan/tenant_domain/server/entities/tenant_domain.entity';
import { TenantInvitation as TenantInvitationEntity } from '@kuraykaraaslan/tenant_invitation/server/entities/tenant_invitation.entity';

/**
 * GET /tenant/[tenantId]/api/auth/me/tenants
 * Tenant-scoped /api/auth/me endpoint.
 * Returns every tenant the current user is a member of, plus pending invitations.
 * The path tenant only gates authentication — the result list is user-global.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
    });

    const ds = await getDataSource();

    const memberships = await ds.getRepository(TenantMemberEntity).find({
      where: { userId: user.userId, memberStatus: 'ACTIVE', deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    const tenants = await Promise.all(
      memberships.map(async (m) => {
        const tDs = await tenantDataSourceFor(m.tenantId);
        const tenant = await tDs.getRepository(TenantEntity).findOne({
          where: { tenantId: m.tenantId, tenantStatus: 'ACTIVE', deletedAt: IsNull() },
        });
        if (!tenant) return null;

        const domains = await tDs.getRepository(TenantDomainEntity).find({
          where: [
            { tenantId: m.tenantId, domainStatus: 'ACTIVE' },
            { tenantId: m.tenantId, domainStatus: 'VERIFIED' },
          ],
        });

        return {
          tenantMemberId: m.tenantMemberId,
          memberRole: m.memberRole,
          memberStatus: m.memberStatus,
          tenant: {
            tenantId: tenant.tenantId,
            name: tenant.name,
            description: tenant.description,
            tenantStatus: tenant.tenantStatus,
            domains,
          },
        };
      }),
    );

    const now = new Date();
    const pendingInvitations = await ds.getRepository(TenantInvitationEntity).find({
      where: { email: user.email.toLowerCase(), status: 'PENDING', expiresAt: MoreThan(now) },
      order: { createdAt: 'DESC' },
    });

    const tenantIds = [...new Set(pendingInvitations.map((i) => i.tenantId))];
    const invitationTenants: Record<string, any> = {};
    await Promise.all(
      tenantIds.map(async (tid) => {
        const tDs = await tenantDataSourceFor(tid);
        const t = await tDs.getRepository(TenantEntity).findOne({ where: { tenantId: tid } });
        if (t) {
          invitationTenants[tid] = {
            tenantId: t.tenantId,
            name: t.name,
            description: t.description,
            tenantStatus: t.tenantStatus,
          };
        }
      }),
    );

    const invitations = pendingInvitations.map((inv) => ({
      invitationId: inv.invitationId,
      tenantId: inv.tenantId,
      memberRole: inv.memberRole,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      tenant: invitationTenants[inv.tenantId] ?? null,
    }));

    return NextResponse.json(
      { success: true, tenants: tenants.filter(Boolean), invitations },
      { status: 200 },
    );
  } catch (error: any) {
    Logger.error(`[GET /tenant/.../api/auth/me/tenants] ${error.message}`);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 },
    );
  }
}
