import 'reflect-metadata';
import { Not, Like } from 'typeorm';
import { env } from '@/modules/env';
import { tenantDataSourceFor, getDataSource } from '@/modules/db';
import { TenantDomain as TenantDomainEntity } from './entities/tenant_domain.entity';
import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import { SafeTenantDomain, SafeTenantDomainSchema, DomainVerificationInfo } from './tenant_domain.types';
import { CreateTenantDomainInput, UpdateTenantDomainInput, GetTenantDomainsInput, InitiateVerificationInput } from './tenant_domain.dto';
import TenantDomainMessages from './tenant_domain.messages';
import DNSVerificationService from './dns_verification.service';
import SettingService from '@/modules/setting/setting.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';

const DOMAIN_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

export default class TenantDomainService {

  private static async clearCache(tenantDomain: SafeTenantDomain | string) {
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
      repo.find({
        where: { tenantId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        order: { isPrimary: 'DESC', createdAt: 'DESC' },
      }),
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
      try {
        return SafeTenantDomainSchema.parse(JSON.parse(cached));
      } catch {
        await redis.del(cacheKey);
      }
    }

    const ds = await getDataSource();
    const found = await ds.getRepository(TenantDomainEntity).findOne({ where: { domain } });

    if (!found) {
      Logger.debug(`TenantDomainService.getByDomain: Domain not found: ${domain}`);
      return null;
    }

    Logger.debug(`TenantDomainService.getByDomain: Found domain: ${domain} → tenantId: ${found.tenantId}`);

    const parsed = SafeTenantDomainSchema.parse(found);
    await redis.setex(cacheKey, DOMAIN_CACHE_TTL, JSON.stringify(parsed));
    return parsed;
  }

  static async getPrimaryByTenantId(tenantId: string): Promise<SafeTenantDomain | null> {
    const cacheKey = `tenant:domain:primary:${tenantId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      try {
        return SafeTenantDomainSchema.parse(JSON.parse(cached));
      } catch {
        await redis.del(cacheKey);
      }
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
        if (subdomainCount >= maxSubdomains) {
          throw new AppError(TenantDomainMessages.SUBDOMAIN_LIMIT_EXCEEDED, 409, ErrorCode.QUOTA_EXCEEDED);
        }
      } else {
        if (domainCount >= maxDomains) {
          throw new AppError(TenantDomainMessages.DOMAIN_LIMIT_EXCEEDED, 409, ErrorCode.QUOTA_EXCEEDED);
        }
      }

      if (data.isPrimary) {
        await repo.update({ tenantId: data.tenantId, isPrimary: true }, { isPrimary: false });
      }

      const domain = repo.create({ ...data, domainStatus: 'PENDING' });
      return repo.save(domain);
    });

    const parsed = SafeTenantDomainSchema.parse(saved);
    await this.clearCache(parsed);
    return parsed;
  }

  static async update(tenantDomainId: string, tenantId: string, data: UpdateTenantDomainInput): Promise<SafeTenantDomain> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantDomainEntity);
    const domain = await repo.findOne({ where: { tenantDomainId, tenantId } });
    if (!domain) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    await ds.transaction(async (mgr) => {
      const txRepo = mgr.getRepository(TenantDomainEntity);
      if (data.isPrimary) {
        await txRepo.update({ tenantId, isPrimary: true }, { isPrimary: false });
      }
      await txRepo.update({ tenantDomainId, tenantId }, data as Partial<TenantDomainEntity>);
    });

    const updated = await repo.findOne({ where: { tenantDomainId, tenantId } });
    if (!updated) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const parsed = SafeTenantDomainSchema.parse(updated);
    await this.clearCache(SafeTenantDomainSchema.parse(domain));
    await this.clearCache(parsed);
    return parsed;
  }

  static async getVerificationInfo(tenantDomainId: string, tenantId: string): Promise<DomainVerificationInfo> {
    const ds = await tenantDataSourceFor(tenantId);
    const domain = await ds.getRepository(TenantDomainEntity).findOne({ where: { tenantDomainId, tenantId } });
    if (!domain) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const verificationData = await DNSVerificationService.getStoredData(tenantDomainId);

    if (!verificationData) {
      return this.initiateVerification({ tenantDomainId, method: 'TXT' }, tenantId);
    }

    const { token, method } = verificationData;

    return {
      domain: domain.domain,
      method,
      recordName: method === 'TXT'
        ? DNSVerificationService.getTxtRecordName(domain.domain)
        : DNSVerificationService.getCnameRecordName(domain.domain, token),
      recordValue: method === 'TXT'
        ? DNSVerificationService.getTxtRecordValue(token)
        : DNSVerificationService.getCnameRecordTarget(),
      domainStatus: domain.domainStatus as "ACTIVE" | "INACTIVE" | "PENDING" | "VERIFIED" | "DNS_FAILED",
    };
  }

  static async initiateVerification({ tenantDomainId, method }: InitiateVerificationInput, tenantId: string): Promise<DomainVerificationInfo> {
    const ds = await tenantDataSourceFor(tenantId);
    const domain = await ds.getRepository(TenantDomainEntity).findOne({ where: { tenantDomainId, tenantId } });
    if (!domain) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    if (domain.domainStatus === 'VERIFIED') {
      throw new AppError(TenantDomainMessages.DOMAIN_ALREADY_VERIFIED, 409, ErrorCode.CONFLICT);
    }

    const verification = await DNSVerificationService.initiateVerification(
      tenantDomainId,
      domain.domain,
      method
    );

    await ds.getRepository(TenantDomainEntity).update(
      { tenantDomainId, tenantId },
      { verificationToken: verification.token }
    );

    await this.clearCache(SafeTenantDomainSchema.parse(domain));

    return {
      domain: domain.domain,
      method: verification.method,
      recordName: verification.recordName,
      recordValue: verification.recordValue,
      domainStatus: domain.domainStatus as "ACTIVE" | "INACTIVE" | "PENDING" | "VERIFIED" | "DNS_FAILED",
    };
  }

  static async verifyDomain(tenantDomainId: string, tenantId: string): Promise<SafeTenantDomain> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantDomainEntity);
    const domain = await repo.findOne({ where: { tenantDomainId, tenantId } });
    if (!domain) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    if (domain.domainStatus === 'VERIFIED') {
      throw new AppError(TenantDomainMessages.DOMAIN_ALREADY_VERIFIED, 409, ErrorCode.CONFLICT);
    }

    const isVerified = await DNSVerificationService.checkVerification(tenantDomainId, domain.domain);
    if (!isVerified) throw new AppError(TenantDomainMessages.DNS_VERIFICATION_FAILED, 422, ErrorCode.VALIDATION_ERROR);

    await repo.update(
      { tenantDomainId, tenantId },
      { domainStatus: 'VERIFIED', verifiedAt: new Date(), verificationToken: undefined }
    );
    const updated = await repo.findOne({ where: { tenantDomainId, tenantId } });
    if (!updated) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const parsed = SafeTenantDomainSchema.parse(updated);
    await this.clearCache(parsed);
    return parsed;
  }

  static async delete(tenantDomainId: string, tenantId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantDomainEntity);
    const domain = await repo.findOne({ where: { tenantDomainId, tenantId } });
    if (!domain) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    if (domain.isPrimary) throw new AppError(TenantDomainMessages.CANNOT_DELETE_PRIMARY, 409, ErrorCode.CONFLICT);

    await DNSVerificationService.deleteStoredToken(tenantDomainId);
    await repo.delete({ tenantDomainId, tenantId });
    await this.clearCache(SafeTenantDomainSchema.parse(domain));
  }
}
