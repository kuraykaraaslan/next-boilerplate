import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import { getDataSource, tenantDataSourceFor } from '@nb/db';
import redis, { jitter, singleFlight } from '@nb/redis';
import { TenantInvitation as TenantInvitationEntity } from './entities/tenant_invitation.entity';
import { Tenant as TenantEntity } from '@nb/tenant/server/entities/tenant.entity';
import { SafeTenantInvitation, SafeTenantInvitationSchema } from './tenant_invitation.types';
import { GetInvitationsInput } from './tenant_invitation.dto';
import TenantInvitationMessages from './tenant_invitation.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { INVITATION_CACHE_TTL, NEGATIVE_CACHE_TTL, NEG, hashToken, assertUsable } from './tenant_invitation.helpers';

export async function getByTenantId({ tenantId, page, pageSize, status }: GetInvitationsInput): Promise<{ invitations: SafeTenantInvitation[]; total: number }> {
  const where: FindOptionsWhere<TenantInvitationEntity> = { tenantId };
  if (status) where.status = status;

  const safePage = Math.max(1, page);
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(TenantInvitationEntity);

  const [rows, total] = await Promise.all([
    repo.find({ where, skip: (safePage - 1) * pageSize, take: pageSize, order: { createdAt: 'DESC' } }),
    repo.count({ where }),
  ]);

  return { invitations: rows.map((r) => SafeTenantInvitationSchema.parse(r)), total };
}

export async function getById(invitationId: string, tenantId: string): Promise<SafeTenantInvitation> {
  const cacheKey = `tenant_invitation:id:${invitationId}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    try {
      const parsed = SafeTenantInvitationSchema.parse(JSON.parse(cached));
      if (parsed.tenantId !== tenantId) throw new AppError(TenantInvitationMessages.INVITATION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
      return parsed;
    } catch (e) {
      if (e instanceof AppError) throw e;
      await redis.del(cacheKey).catch(() => {});
    }
  }

  return singleFlight(cacheKey, async () => {
    const ds = await tenantDataSourceFor(tenantId);
    const invitation = await ds.getRepository(TenantInvitationEntity).findOne({ where: { invitationId, tenantId } });
    if (!invitation) throw new AppError(TenantInvitationMessages.INVITATION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const parsed = SafeTenantInvitationSchema.parse(invitation);
    await redis.setex(cacheKey, jitter(INVITATION_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
    return parsed;
  });
}

export async function getByToken(rawToken: string): Promise<SafeTenantInvitation> {
  const hashed = hashToken(rawToken);
  const cacheKey = `tenant_invitation:token:${hashed}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached === NEG) throw new AppError(TenantInvitationMessages.INVITATION_INVALID_TOKEN, 404, ErrorCode.NOT_FOUND);
  if (cached) {
    try { return SafeTenantInvitationSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
  }

  return singleFlight(cacheKey, async () => {
    const ds = await getDataSource();
    const invitation = await ds.getRepository(TenantInvitationEntity).findOne({ where: { token: hashed } });
    if (!invitation) {
      await redis.setex(cacheKey, jitter(NEGATIVE_CACHE_TTL), NEG).catch(() => {});
      throw new AppError(TenantInvitationMessages.INVITATION_INVALID_TOKEN, 404, ErrorCode.NOT_FOUND);
    }

    const parsed = SafeTenantInvitationSchema.parse(invitation);
    await redis.setex(cacheKey, jitter(INVITATION_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
    return parsed;
  });
}

export async function preview(tenantId: string, rawToken: string): Promise<{ invitation: SafeTenantInvitation; tenant: { tenantId: string; name: string } }> {
  const hashed = hashToken(rawToken);
  const ds = await tenantDataSourceFor(tenantId);
  const invitation = await ds.getRepository(TenantInvitationEntity).findOne({ where: { token: hashed, tenantId } });
  if (!invitation) throw new AppError(TenantInvitationMessages.INVITATION_INVALID_TOKEN, 404, ErrorCode.NOT_FOUND);
  assertUsable(invitation);

  const tenant = await ds.getRepository(TenantEntity).findOne({ where: { tenantId } });
  return {
    invitation: SafeTenantInvitationSchema.parse(invitation),
    tenant: { tenantId: tenantId, name: tenant?.name ?? '' },
  };
}
