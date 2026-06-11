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

type SeedDefaults = {
  skipPlan?: boolean;
  skipSubscription?: boolean;
  skipSettings?: boolean;
};

const DEFAULT_TENANT_SETTINGS: Record<string, string> = {
  language: 'en',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: 'HH:mm',
  timezone: 'UTC',
};

/**
 * Default starter plan that the tenant seed wires up. Plans now wrap a
 * StoreProduct (productId is required), so the seed creates a hidden
 * "Free" product first and binds the plan to it.
 */
const DEFAULT_FREE_PRODUCT = {
  name: 'Free Plan',
  slug: 'free-plan',
  basePrice: 0,
  currency: 'USD',
  status: 'ACTIVE' as const,
  isDigital: true,
};
const DEFAULT_FREE_PLAN_BILLING = {
  interval: 'MONTHLY' as const,
  trialDays: 0,
  status: 'ACTIVE' as const,
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

    Logger.info(`[TenantService] Querying tenants`);

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

  static async create(data: CreateTenantInput): Promise<SafeTenant> {
    const { defaults, ...tenantData } = data;
    const ds = await getDataSource();
    const repo = ds.getRepository(TenantEntity);
    const tenant = repo.create({ ...tenantData, tenantStatus: 'ACTIVE' } as any);
    const saved = await repo.save(tenant) as unknown as TenantEntity;

    const parsed = SafeTenantSchema.parse(saved);

    // Best-effort auto-seed: never fail tenant creation if a default cannot be applied.
    await this.seedDefaults(parsed.tenantId, defaults);

    await WebhookService.dispatchPlatformEvent('tenant.created', {
      tenantId: parsed.tenantId,
      name: parsed.name,
    });

    return parsed;
  }

  /**
   * Auto-seed defaults for a newly created tenant. Idempotent and best-effort:
   * each seed step is wrapped in try/catch so a failure in one step doesn't
   * block the others or the tenant create itself.
   *
   * Skipped entirely for the root tenant (handled by seed scripts).
   */
  private static async seedDefaults(tenantId: string, defaults?: SeedDefaults): Promise<void> {
    if (isRootTenant(tenantId)) return;

    // Inline Free plan seed disabled: plans now wrap a StoreProduct (which
    // requires a Category), so a brand-new tenant has no catalog to bind to.
    // Instead, if the operator has configured a default plan (a free plan in
    // the ROOT catalogue), we clone+assign it for free below. The
    // defaults?.skipPlan / skipSubscription flags gate that step.
    void DEFAULT_FREE_PRODUCT;
    void DEFAULT_FREE_PLAN_BILLING;

    if (!defaults?.skipPlan && !defaults?.skipSubscription) {
      try {
        const { default: TenantPlatformPlanService } = await import('@/modules/tenant_subscription/tenant_subscription.platform.service');
        const { default: TenantFeatureGateService } = await import('@/modules/tenant_subscription/tenant_subscription.feature.service');
        const defaultPlanId = await TenantFeatureGateService.getDefaultPlanId();
        if (defaultPlanId) {
          // assignPlatformPlan clones the ROOT plan's category/product/plan/feature
          // chain into this tenant and assigns it for free (priceOverride 0).
          await TenantPlatformPlanService.assignPlatformPlan(tenantId, { planId: defaultPlanId, priceOverride: 0 });
        }
      } catch (err) {
        Logger.warn(`[TenantService.seedDefaults] default plan assignment failed for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (!defaults?.skipSettings) {
      try {
        const SettingService = (await import('@/modules/setting/setting.service')).default;
        await SettingService.updateMany(tenantId, DEFAULT_TENANT_SETTINGS);
      } catch (err) {
        Logger.warn(`[TenantService.seedDefaults] default settings seed failed for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  static async update(tenantId: string, data: UpdateTenantInput): Promise<SafeTenant> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantEntity);
    const tenant = await repo.findOne({ where: { tenantId, deletedAt: IsNull() } });
    if (!tenant) throw new AppError(TenantMessages.TENANT_NOT_FOUND, 404, ErrorCode.TENANT_NOT_FOUND);

    await repo.update({ tenantId }, data as any);
    const updated = await repo.findOne({ where: { tenantId } });
    await this.clearCache(tenantId);

    // tenant.updated fires to the tenant's own webhooks; a transition into
    // SUSPENDED additionally raises the platform-wide tenant.suspended event.
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
    const ds = await getDataSource();
    const repo = ds.getRepository(TenantEntity);
    const tenant = repo.create({ name, tenantStatus: 'ACTIVE' });
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
}
