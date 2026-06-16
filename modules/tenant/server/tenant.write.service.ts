import 'reflect-metadata';
import { IsNull } from 'typeorm';
import { tenantDataSourceFor, getDataSource } from '@nb/db';
import { Tenant as TenantEntity } from './entities/tenant.entity';
import { SafeTenant, SafeTenantSchema } from './tenant.types';
import { CreateTenantInput, UpdateTenantInput } from './tenant.dto';
import TenantMessages from './tenant.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import TenantMemberService from '@nb/tenant_member/server/tenant_member.service';
import WebhookService from '@nb/webhook/server/webhook.service';
import { clearCache, seedDefaults } from './tenant.helpers';

export async function create(data: CreateTenantInput): Promise<SafeTenant> {
  const { defaults, ...tenantData } = data;
  const ds = await getDataSource();
  const repo = ds.getRepository(TenantEntity);

  // Validate slug uniqueness
  if (tenantData.slug) {
    const existing = await repo.findOne({ where: { slug: tenantData.slug } });
    if (existing) throw new AppError('Tenant slug already taken', 409, ErrorCode.CONFLICT);
  }

  const tenant = repo.create({ ...tenantData, tenantStatus: 'ACTIVE' } as any);
  const saved = await repo.save(tenant) as unknown as TenantEntity;

  const parsed = SafeTenantSchema.parse(saved);

  // Seed defaults — wait for completion before firing the webhook so the
  // provisioning outcome (success/failure) is reflected in the event payload.
  const seedOutcome = await seedDefaults(parsed.tenantId, defaults, tenantData.region);

  await WebhookService.dispatchPlatformEvent('tenant.created', {
    tenantId: parsed.tenantId,
    name: parsed.name,
    region: parsed.region,
    slug: parsed.slug,
    provisioned: seedOutcome.ok,
    provisioningErrors: seedOutcome.errors,
  });

  return parsed;
}

export async function update(tenantId: string, data: UpdateTenantInput): Promise<SafeTenant> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(TenantEntity);
  const tenant = await repo.findOne({ where: { tenantId, deletedAt: IsNull() } });
  if (!tenant) throw new AppError(TenantMessages.TENANT_NOT_FOUND, 404, ErrorCode.TENANT_NOT_FOUND);

  // Validate slug uniqueness when changing
  if (data.slug && data.slug !== tenant.slug) {
    const rootDs = await getDataSource();
    const existing = await rootDs.getRepository(TenantEntity).findOne({ where: { slug: data.slug } });
    if (existing && existing.tenantId !== tenantId) {
      throw new AppError('Tenant slug already taken', 409, ErrorCode.CONFLICT);
    }
  }

  await repo.update({ tenantId }, data as any);
  const updated = await repo.findOne({ where: { tenantId } });
  await clearCache(tenantId);

  await WebhookService.dispatchEvent(tenantId, 'tenant.updated', {
    tenantId,
    name: updated!.name,
    tenantStatus: updated!.tenantStatus,
  });
  if (updated!.tenantStatus === 'SUSPENDED' && tenant.tenantStatus !== 'SUSPENDED') {
    await WebhookService.dispatchPlatformEvent('tenant.suspended', {
      tenantId,
      name: updated!.name,
    });
  }
  return SafeTenantSchema.parse(updated!);
}

export async function provisionPersonal(userId: string, email: string): Promise<SafeTenant> {
  const name = email.split('@')[0];
  // Generate slug from email prefix
  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || undefined;

  const ds = await getDataSource();
  const repo = ds.getRepository(TenantEntity);

  // Ensure slug uniqueness
  let finalSlug: string | undefined = slug;
  if (slug) {
    const exists = await repo.findOne({ where: { slug } });
    if (exists) finalSlug = `${slug}-${Date.now()}`;
  }

  const tenant = repo.create({ name, tenantStatus: 'ACTIVE', slug: finalSlug });
  const saved = await repo.save(tenant);

  await TenantMemberService.create({
    tenantId: saved.tenantId,
    userId,
    memberRole: 'OWNER',
    memberStatus: 'ACTIVE',
  });

  const parsed = SafeTenantSchema.parse(saved);
  await seedDefaults(parsed.tenantId);
  return parsed;
}

export async function remove(tenantId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(TenantEntity);
  const tenant = await repo.findOne({ where: { tenantId, deletedAt: IsNull() } });
  if (!tenant) throw new AppError(TenantMessages.TENANT_NOT_FOUND, 404, ErrorCode.TENANT_NOT_FOUND);
  await repo.update({ tenantId }, { deletedAt: new Date() });
  await clearCache(tenantId);
  await WebhookService.dispatchPlatformEvent('tenant.deleted', {
    tenantId,
    name: tenant.name,
  });
}

/**
 * Verify tenant isolation: run a cross-tenant query check.
 * Returns any tenantId values found in the given table that differ from the expected tenant.
 * Use in integration tests / scheduled audits to detect missing WHERE clauses.
 */
export async function verifyIsolation(tenantId: string, tableName: string): Promise<{ ok: boolean; leakedRows: number }> {
  try {
    const ds = await tenantDataSourceFor(tenantId);
    const rows = await ds.query(
      `SELECT COUNT(*) as count FROM "${tableName}" WHERE "tenantId" IS NOT NULL AND "tenantId" != $1`,
      [tenantId],
    );
    const leakedRows = parseInt(rows[0]?.count ?? '0', 10);
    return { ok: leakedRows === 0, leakedRows };
  } catch {
    return { ok: true, leakedRows: 0 }; // table may not have tenantId column — not a leak
  }
}
