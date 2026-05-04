import 'reflect-metadata';
import { Not, Like } from 'typeorm';
import { env } from '@/libs/env';
import { getDefaultTenantDataSource, tenantDataSourceFor } from '@/libs/typeorm';
import { TenantDomain as TenantDomainEntity } from './entities/tenant_domain.entity';
import redis from '@/libs/redis';
import Logger from '@/libs/logger';
import { SafeTenantDomain, SafeTenantDomainSchema, DomainVerificationInfo } from './tenant_domain.types';
import { CreateTenantDomainInput, UpdateTenantDomainInput, GetTenantDomainsInput, InitiateVerificationInput } from './tenant_domain.dto';
import TenantDomainMessages from './tenant_domain.messages';
import DNSVerificationService from './dns_verification.service';
import TenantSettingService from '@/modules/tenant_setting/tenant_setting.service';

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

  static async getById(tenantDomainId: string): Promise<SafeTenantDomain> {
    const cacheKey = `tenant:domain:id:${tenantDomainId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      try {
        return SafeTenantDomainSchema.parse(JSON.parse(cached));
      } catch {
        await redis.del(cacheKey);
      }
    }

    const ds = await getDefaultTenantDataSource();
    const domain = await ds.getRepository(TenantDomainEntity).findOne({ where: { tenantDomainId } });
    if (!domain) throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);

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

    const ds = await getDefaultTenantDataSource();
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
    const repo = ds.getRepository(TenantDomainEntity);

    const existing = await repo.findOne({ where: { domain: data.domain } });
    if (existing) throw new Error(TenantDomainMessages.DOMAIN_ALREADY_EXISTS);

    const [domainCount, subdomainCount, maxDomainsSetting, maxSubdomainsSetting] = await Promise.all([
      repo.count({ where: { tenantId: data.tenantId, domain: Not(Like(`%.${wildcardDomain}`)) } }),
      repo.count({ where: { tenantId: data.tenantId, domain: Like(`%.${wildcardDomain}`) } }),
      TenantSettingService.getByKey(data.tenantId, 'maxDomains'),
      TenantSettingService.getByKey(data.tenantId, 'maxSubdomains'),
    ]);

    const maxDomains = maxDomainsSetting ? parseInt(maxDomainsSetting.value) : 3;
    const maxSubdomains = maxSubdomainsSetting ? parseInt(maxSubdomainsSetting.value) : 1;

    if (isSubdomain) {
      if (subdomainCount >= maxSubdomains) {
        throw new Error(`Subdomain limit exceeded. Maximum allowed: ${maxSubdomains}`);
      }
    } else {
      if (domainCount >= maxDomains) {
        throw new Error(TenantDomainMessages.DOMAIN_LIMIT_EXCEEDED);
      }
    }

    if (data.isPrimary) {
      await repo.update({ tenantId: data.tenantId, isPrimary: true }, { isPrimary: false });
    }

    const domain = repo.create({ ...data, domainStatus: 'PENDING' });
    const saved = await repo.save(domain);

    const parsed = SafeTenantDomainSchema.parse(saved);
    await this.clearCache(parsed);
    return parsed;
  }

  static async update(tenantDomainId: string, data: UpdateTenantDomainInput): Promise<SafeTenantDomain> {
    const defaultDs = await getDefaultTenantDataSource();
    const domain = await defaultDs.getRepository(TenantDomainEntity).findOne({ where: { tenantDomainId } });
    if (!domain) throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);

    const ds = await tenantDataSourceFor(domain.tenantId);
    const repo = ds.getRepository(TenantDomainEntity);

    if (data.isPrimary) {
      await repo.update({ tenantId: domain.tenantId, isPrimary: true }, { isPrimary: false });
    }

    await repo.update({ tenantDomainId }, data as any);
    const updated = await repo.findOne({ where: { tenantDomainId } });

    const parsed = SafeTenantDomainSchema.parse(updated!);
    await this.clearCache(SafeTenantDomainSchema.parse(domain));
    await this.clearCache(parsed);
    return parsed;
  }

  static async getVerificationInfo(tenantDomainId: string): Promise<DomainVerificationInfo> {
    const ds = await getDefaultTenantDataSource();
    const domain = await ds.getRepository(TenantDomainEntity).findOne({ where: { tenantDomainId } });
    if (!domain) throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);

    const verificationData = await DNSVerificationService.getStoredData(tenantDomainId);

    if (!verificationData) {
      return this.initiateVerification({ tenantDomainId, method: 'TXT' });
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
      domainStatus: domain.domainStatus as "ACTIVE" | "INACTIVE" | "PENDING" | "VERIFIED",
    };
  }

  static async initiateVerification({ tenantDomainId, method }: InitiateVerificationInput): Promise<DomainVerificationInfo> {
    const ds = await getDefaultTenantDataSource();
    const domain = await ds.getRepository(TenantDomainEntity).findOne({ where: { tenantDomainId } });
    if (!domain) throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);

    if (domain.domainStatus === 'VERIFIED') {
      throw new Error(TenantDomainMessages.DOMAIN_ALREADY_VERIFIED);
    }

    const verification = await DNSVerificationService.initiateVerification(
      tenantDomainId,
      domain.domain,
      method
    );

    const tenantDs = await tenantDataSourceFor(domain.tenantId);
    await tenantDs.getRepository(TenantDomainEntity).update(
      { tenantDomainId },
      { verificationToken: verification.token }
    );

    await this.clearCache(SafeTenantDomainSchema.parse(domain));

    return {
      domain: domain.domain,
      method: verification.method,
      recordName: verification.recordName,
      recordValue: verification.recordValue,
      domainStatus: domain.domainStatus as "ACTIVE" | "INACTIVE" | "PENDING" | "VERIFIED",
    };
  }

  static async verifyDomain(tenantDomainId: string): Promise<SafeTenantDomain> {
    const ds = await getDefaultTenantDataSource();
    const domain = await ds.getRepository(TenantDomainEntity).findOne({ where: { tenantDomainId } });
    if (!domain) throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);

    if (domain.domainStatus === 'VERIFIED') {
      throw new Error(TenantDomainMessages.DOMAIN_ALREADY_VERIFIED);
    }

    const isVerified = await DNSVerificationService.checkVerification(tenantDomainId, domain.domain);
    if (!isVerified) throw new Error(TenantDomainMessages.DNS_VERIFICATION_FAILED);

    const tenantDs = await tenantDataSourceFor(domain.tenantId);
    await tenantDs.getRepository(TenantDomainEntity).update(
      { tenantDomainId },
      { domainStatus: 'VERIFIED', verifiedAt: new Date(), verificationToken: undefined }
    );
    const updated = await tenantDs.getRepository(TenantDomainEntity).findOne({ where: { tenantDomainId } });

    const parsed = SafeTenantDomainSchema.parse(updated!);
    await this.clearCache(parsed);
    return parsed;
  }

  static async delete(tenantDomainId: string): Promise<void> {
    const ds = await getDefaultTenantDataSource();
    const domain = await ds.getRepository(TenantDomainEntity).findOne({ where: { tenantDomainId } });
    if (!domain) throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);

    if (domain.isPrimary) throw new Error(TenantDomainMessages.CANNOT_DELETE_PRIMARY);

    const tenantDs = await tenantDataSourceFor(domain.tenantId);
    await DNSVerificationService.deleteStoredToken(tenantDomainId);
    await tenantDs.getRepository(TenantDomainEntity).delete({ tenantDomainId });
    await this.clearCache(SafeTenantDomainSchema.parse(domain));
  }
}
