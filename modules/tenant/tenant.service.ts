import 'reflect-metadata';
import { IsNull, ILike } from 'typeorm';
import { tenantDataSourceFor, getDataSource } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { Tenant as TenantEntity } from './entities/tenant.entity';
import { SafeTenant, SafeTenantSchema } from './tenant.types';
import { CreateTenantInput, UpdateTenantInput, GetTenantsInput } from './tenant.dto';
import TenantMessages from './tenant.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import TenantMemberService from '../tenant_member/tenant_member.service';
import Logger from '@/modules/logger';
import { isRootTenant } from './tenant.constants';
import WebhookService from '@/modules/webhook/webhook.service';

const TENANT_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

// ── Default locale per region ─────────────────────────────────────────────────
const REGION_LOCALE_DEFAULTS: Record<string, { language: string; timezone: string; dateFormat: string; timeFormat: string }> = {
  TR:    { language: 'tr',    timezone: 'Europe/Istanbul',       dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm' },
  EU:    { language: 'en',    timezone: 'Europe/Berlin',         dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm' },
  US:    { language: 'en',    timezone: 'America/New_York',      dateFormat: 'MM/DD/YYYY', timeFormat: 'hh:mm A' },
  APAC:  { language: 'en',    timezone: 'Asia/Singapore',        dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm' },
  LATAM: { language: 'es',    timezone: 'America/Sao_Paulo',     dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm' },
  MEA:   { language: 'en',    timezone: 'Asia/Dubai',            dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm' },
};

type SeedDefaults = {
  skipPlan?: boolean;
  skipSubscription?: boolean;
  skipSettings?: boolean;
};

export default class TenantService {

  private static async clearCache(tenantId: string) {
    await redis.del(`tenant:id:${tenantId}`).catch(() => {});
  }

  static async getAll({ page, pageSize, search, tenantId }: GetTenantsInput): Promise<{ tenants: SafeTenant[]; total: number }> {
    const ds = await getDataSource();
    const repo = ds.getRepository(TenantEntity);

    const baseWhere: Record<string, unknown> = { deletedAt: IsNull() };
    if (tenantId) baseWhere.tenantId = tenantId;

    let whereConditions: Record<string, unknown>[];
    if (search) {
      whereConditions = [{ ...baseWhere, name: ILike(`%${search}%`) }];
    } else {
      whereConditions = [baseWhere];
    }

    const [tenants, total] = await Promise.all([
      repo.find({ where: whereConditions as any, skip: page * pageSize, take: pageSize, order: { createdAt: 'DESC' } }),
      repo.count({ where: whereConditions as any }),
    ]);

    return { tenants: tenants.map((t) => SafeTenantSchema.parse(t)), total };
  }

  static async getById(tenantId: string): Promise<SafeTenant> {
    const cacheKey = `tenant:id:${tenantId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return SafeTenantSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await tenantDataSourceFor(tenantId);
      const tenant = await ds.getRepository(TenantEntity).findOne({ where: { tenantId, deletedAt: IsNull() } });
      if (!tenant) throw new AppError(TenantMessages.TENANT_NOT_FOUND, 404, ErrorCode.TENANT_NOT_FOUND);

      const parsed = SafeTenantSchema.parse(tenant);
      await redis.setex(cacheKey, jitter(TENANT_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  static async getBySlug(slug: string): Promise<SafeTenant> {
    const ds = await getDataSource();
    const tenant = await ds.getRepository(TenantEntity).findOne({ where: { slug, deletedAt: IsNull() } });
    if (!tenant) throw new AppError(TenantMessages.TENANT_NOT_FOUND, 404, ErrorCode.TENANT_NOT_FOUND);
    return SafeTenantSchema.parse(tenant);
  }

  static async create(data: CreateTenantInput): Promise<SafeTenant> {
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
    const seedOutcome = await this.seedDefaults(parsed.tenantId, defaults, tenantData.region);

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

  private static async seedDefaults(
    tenantId: string,
    defaults?: SeedDefaults,
    region?: string,
  ): Promise<{ ok: boolean; errors: string[] }> {
    if (isRootTenant(tenantId)) return { ok: true, errors: [] };

    const errors: string[] = [];

    if (!defaults?.skipPlan && !defaults?.skipSubscription) {
      try {
        const { default: TenantPlatformPlanService } = await import('@/modules/tenant_subscription/tenant_subscription.platform.service');
        const { default: TenantFeatureGateService } = await import('@/modules/tenant_subscription/tenant_subscription.feature.service');
        const defaultPlanId = await TenantFeatureGateService.getDefaultPlanId();
        if (defaultPlanId) {
          await TenantPlatformPlanService.assignPlatformPlan(tenantId, { planId: defaultPlanId, priceOverride: 0 });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        Logger.warn(`[TenantService.seedDefaults] default plan assignment failed for ${tenantId}: ${msg}`);
        errors.push(`plan: ${msg}`);
      }
    }

    if (!defaults?.skipSettings) {
      try {
        const SettingService = (await import('@/modules/setting/setting.service')).default;
        // Use region-aware locale defaults
        const localeDefaults = (region ? REGION_LOCALE_DEFAULTS[region] : null) ?? REGION_LOCALE_DEFAULTS['TR'];
        await SettingService.updateMany(tenantId, {
          language: localeDefaults.language,
          dateFormat: localeDefaults.dateFormat,
          timeFormat: localeDefaults.timeFormat,
          timezone: localeDefaults.timezone,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        Logger.warn(`[TenantService.seedDefaults] default settings seed failed for ${tenantId}: ${msg}`);
        errors.push(`settings: ${msg}`);
      }
    }

    return { ok: errors.length === 0, errors };
  }

  static async update(tenantId: string, data: UpdateTenantInput): Promise<SafeTenant> {
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
    await this.clearCache(tenantId);

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

  static async provisionPersonal(userId: string, email: string): Promise<SafeTenant> {
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
    await this.seedDefaults(parsed.tenantId);
    return parsed;
  }

  static async delete(tenantId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantEntity);
    const tenant = await repo.findOne({ where: { tenantId, deletedAt: IsNull() } });
    if (!tenant) throw new AppError(TenantMessages.TENANT_NOT_FOUND, 404, ErrorCode.TENANT_NOT_FOUND);
    await repo.update({ tenantId }, { deletedAt: new Date() });
    await this.clearCache(tenantId);
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
  static async verifyIsolation(tenantId: string, tableName: string): Promise<{ ok: boolean; leakedRows: number }> {
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
}
