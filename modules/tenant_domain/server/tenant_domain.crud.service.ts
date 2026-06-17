import 'reflect-metadata';
import { Not, Like } from 'typeorm';
import { env } from '@kuraykaraaslan/env';
import { tenantDataSourceFor, getDataSource } from '@kuraykaraaslan/db';
import { TenantDomain as TenantDomainEntity } from './entities/tenant_domain.entity';
import redis from '@kuraykaraaslan/redis';
import Logger from '@kuraykaraaslan/logger';
import { SafeTenantDomain, SafeTenantDomainSchema } from './tenant_domain.types';
import { CreateTenantDomainInput, UpdateTenantDomainInput, GetTenantDomainsInput } from './tenant_domain.dto';
import TenantDomainMessages from './tenant_domain.messages';
import { isReservedDomain } from './tenant_domain.blocklist';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';

const DOMAIN_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

export default class TenantDomainCrudService {

  static async clearCache(tenantDomain: SafeTenantDomain | string): Promise<void> {
    if (typeof tenantDomain === 'string') {
      await redis.del(`tenant:domain:id:${tenantDomain}`);
      return;
    }
    await Promise.all([
      redis.del(`tenant:domain:name:${tenantDomain.domain}`),
      redis.del(`tenant:domain:id:${tenantDomain.tenantDomainId}`),
      redis.del(`tenant:domain:primary:${tenantDomain.tenantId}`),
    ]);
  }

  static async getByTenantId({ tenantId, page, pageSize }: GetTenantDomainsInput): Promise<{ domains: SafeTenantDomain[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantDomainEntity);
    const [domains, total] = await Promise.all([
      repo.find({ where: { tenantId }, skip: (page - 1) * pageSize, take: pageSize, order: { isPrimary: 'DESC', createdAt: 'DESC' } }),
      repo.count({ where: { tenantId } }),
    ]);
    return { domains: domains.map((d) => SafeTenantDomainSchema.parse(d)), total };
  }

  static async getById(tenantDomainId: string, tenantId: string): Promise<SafeTenantDomain> {
    const cacheKey = `tenant:domain:id:${tenantDomainId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        const parsed = SafeTenantDomainSchema.parse(JSON.parse(cached));
        if (parsed.tenantId !== tenantId) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
        return parsed;
      } catch (e) {
        if (e instanceof AppError) throw e;
        await redis.del(cacheKey);
      }
    }
    const ds = await tenantDataSourceFor(tenantId);
    const domain = await ds.getRepository(TenantDomainEntity).findOne({ where: { tenantDomainId, tenantId } });
    if (!domain) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const parsed = SafeTenantDomainSchema.parse(domain);
    await redis.setex(cacheKey, DOMAIN_CACHE_TTL, JSON.stringify(parsed));
    return parsed;
  }

  static async getByDomain(domain: string): Promise<SafeTenantDomain | null> {
    const cacheKey = `tenant:domain:name:${domain}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      try { return SafeTenantDomainSchema.parse(JSON.parse(cached)); }
      catch { await redis.del(cacheKey); }
    }
    const ds = await getDataSource();
    const found = await ds.getRepository(TenantDomainEntity).findOne({ where: { domain } });
    if (!found) { Logger.debug(`TenantDomainCrudService.getByDomain: Domain not found: ${domain}`); return null; }
    Logger.debug(`TenantDomainCrudService.getByDomain: Found domain: ${domain} → tenantId: ${found.tenantId}`);
    const parsed = SafeTenantDomainSchema.parse(found);
    await redis.setex(cacheKey, DOMAIN_CACHE_TTL, JSON.stringify(parsed));
    return parsed;
  }

  static async getPrimaryByTenantId(tenantId: string): Promise<SafeTenantDomain | null> {
    const cacheKey = `tenant:domain:primary:${tenantId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      try { return SafeTenantDomainSchema.parse(JSON.parse(cached)); }
      catch { await redis.del(cacheKey); }
    }
    const ds = await tenantDataSourceFor(tenantId);
    const domain = await ds.getRepository(TenantDomainEntity).findOne({ where: { tenantId, isPrimary: true } });
    if (!domain) return null;
    const parsed = SafeTenantDomainSchema.parse(domain);
    await redis.setex(cacheKey, DOMAIN_CACHE_TTL, JSON.stringify(parsed));
    return parsed;
  }

  static async create(data: CreateTenantDomainInput): Promise<SafeTenantDomain> {
    const wildcardDomain = env.TENANT_WILDCARD_DOMAIN || 'example.com';
    const isSubdomain = data.domain.endsWith(`.${wildcardDomain}`);
    // Reserved/blocklist check — but never block a legitimate self-service
    // subdomain of the platform wildcard.
    if (!isSubdomain && (await isReservedDomain(data.domain))) {
      throw new AppError(TenantDomainMessages.DOMAIN_RESERVED, 422, ErrorCode.VALIDATION_ERROR);
    }
    const ds = await tenantDataSourceFor(data.tenantId);
    const saved = await ds.transaction(async (mgr) => {
      const repo = mgr.getRepository(TenantDomainEntity);
      const existing = await repo.findOne({ where: { domain: data.domain } });
      if (existing) throw new AppError(TenantDomainMessages.DOMAIN_ALREADY_EXISTS, 409, ErrorCode.CONFLICT);
      const [domainCount, subdomainCount, maxDomainsSetting, maxSubdomainsSetting] = await Promise.all([
        repo.count({ where: { tenantId: data.tenantId, domain: Not(Like(`%.${wildcardDomain}`)) } }),
        repo.count({ where: { tenantId: data.tenantId, domain: Like(`%.${wildcardDomain}`) } }),
        SettingService.getByKey(data.tenantId, 'maxDomains'),
        SettingService.getByKey(data.tenantId, 'maxSubdomains'),
      ]);
      const maxDomains = maxDomainsSetting ? parseInt(maxDomainsSetting.value) : 3;
      const maxSubdomains = maxSubdomainsSetting ? parseInt(maxSubdomainsSetting.value) : 1;
      if (isSubdomain) {
        if (subdomainCount >= maxSubdomains) throw new AppError(TenantDomainMessages.SUBDOMAIN_LIMIT_EXCEEDED, 409, ErrorCode.QUOTA_EXCEEDED);
      } else {
        if (domainCount >= maxDomains) throw new AppError(TenantDomainMessages.DOMAIN_LIMIT_EXCEEDED, 409, ErrorCode.QUOTA_EXCEEDED);
      }
      if (data.isPrimary) await repo.update({ tenantId: data.tenantId, isPrimary: true }, { isPrimary: false });
      return repo.save(repo.create({ ...data, domainStatus: 'PENDING' }));
    });
    const parsed = SafeTenantDomainSchema.parse(saved);
    await TenantDomainCrudService.clearCache(parsed);
    return parsed;
  }

  static async update(tenantDomainId: string, tenantId: string, data: UpdateTenantDomainInput): Promise<SafeTenantDomain> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantDomainEntity);
    const domain = await repo.findOne({ where: { tenantDomainId, tenantId } });
    if (!domain) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await ds.transaction(async (mgr) => {
      const txRepo = mgr.getRepository(TenantDomainEntity);
      if (data.isPrimary) await txRepo.update({ tenantId, isPrimary: true }, { isPrimary: false });
      await txRepo.update({ tenantDomainId, tenantId }, data as Partial<TenantDomainEntity>);
    });
    const updated = await repo.findOne({ where: { tenantDomainId, tenantId } });
    if (!updated) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const parsed = SafeTenantDomainSchema.parse(updated);
    await TenantDomainCrudService.clearCache(SafeTenantDomainSchema.parse(domain));
    await TenantDomainCrudService.clearCache(parsed);
    return parsed;
  }

  static async delete(tenantDomainId: string, tenantId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantDomainEntity);
    const domain = await repo.findOne({ where: { tenantDomainId, tenantId } });
    if (!domain) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (domain.isPrimary) throw new AppError(TenantDomainMessages.CANNOT_DELETE_PRIMARY, 409, ErrorCode.CONFLICT);
    const DNSVerificationService = (await import('./dns_verification.service')).default;
    await DNSVerificationService.deleteStoredToken(tenantDomainId);
    await repo.delete({ tenantDomainId, tenantId });
    await TenantDomainCrudService.clearCache(SafeTenantDomainSchema.parse(domain));
  }
}
