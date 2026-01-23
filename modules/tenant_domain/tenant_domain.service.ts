import { prisma } from "@/libs/prisma";
import redis from "@/libs/redis";
import { SafeTenantDomain, SafeTenantDomainSchema, DomainVerificationInfo } from "./tenant_domain.types";
import { CreateTenantDomainInput, UpdateTenantDomainInput, GetTenantDomainsInput, InitiateVerificationInput } from "./tenant_domain.dto";
import TenantDomainMessages from "./tenant_domain.messages";
import DNSVerificationService from "./dns_verification.service";

const DOMAIN_CACHE_TTL = parseInt(process.env.TENANT_CACHE_TTL || `${60 * 5}`); // 5 min default

export default class TenantDomainService {

  /**
   * Helper to clear domain related cache
   */
  private static async clearCache(tenantDomain: SafeTenantDomain | string) {
    if (typeof tenantDomain === 'string') {
      // Try to get domain by ID to find the domain string if needed, 
      // but usually we want to clear multiple keys
      await redis.del(`tenant:domain:id:${tenantDomain}`);
      return;
    }

    await Promise.all([
      redis.del(`tenant:domain:name:${tenantDomain.domain}`),
      redis.del(`tenant:domain:id:${tenantDomain.tenantDomainId}`),
      redis.del(`tenant:domain:primary:${tenantDomain.tenantId}`)
    ]);
  }

  static async getByTenantId({ tenantId, page, pageSize }: GetTenantDomainsInput): Promise<{ domains: SafeTenantDomain[], total: number }> {
    const [domains, total] = await Promise.all([
      prisma.tenantDomain.findMany({
        where: { tenantId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }]
      }),
      prisma.tenantDomain.count({ where: { tenantId } })
    ]);

    return {
      domains: domains.map(domain => SafeTenantDomainSchema.parse(domain)),
      total
    };
  }

  static async getById(tenantDomainId: string): Promise<SafeTenantDomain> {
    const cacheKey = `tenant:domain:id:${tenantDomainId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      try {
        return SafeTenantDomainSchema.parse(JSON.parse(cached));
      } catch (e) {
        await redis.del(cacheKey);
      }
    }

    const domain = await prisma.tenantDomain.findUnique({
      where: { tenantDomainId }
    });

    if (!domain) {
      throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);
    }

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
      } catch (e) {
        await redis.del(cacheKey);
      }
    }

    const found = await prisma.tenantDomain.findUnique({
      where: { domain }
    });

    if (!found) {
      console.log(`TenantDomainService.getByDomain: Domain not found: ${domain}`);
      return null;
    }

    console.log(`TenantDomainService.getByDomain: Found domain: ${domain} → tenantId: ${found.tenantId}`);
    
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
      } catch (e) {
        await redis.del(cacheKey);
      }
    }

    const domain = await prisma.tenantDomain.findFirst({
      where: { tenantId, isPrimary: true }
    });

    if (!domain) {
      return null;
    }

    const parsed = SafeTenantDomainSchema.parse(domain);
    await redis.setex(cacheKey, DOMAIN_CACHE_TTL, JSON.stringify(parsed));
    return parsed;
  }

  static async create(data: CreateTenantDomainInput): Promise<SafeTenantDomain> {
    const existing = await prisma.tenantDomain.findUnique({
      where: { domain: data.domain }
    });

    if (existing) {
      throw new Error(TenantDomainMessages.DOMAIN_ALREADY_EXISTS);
    }

    if (data.isPrimary) {
      await prisma.tenantDomain.updateMany({
        where: { tenantId: data.tenantId, isPrimary: true },
        data: { isPrimary: false }
      });
    }

    const domain = await prisma.tenantDomain.create({
      data: {
        ...data,
        domainStatus: 'PENDING'
      }
    });

    const parsed = SafeTenantDomainSchema.parse(domain);
    await this.clearCache(parsed);
    return parsed;
  }

  static async update(tenantDomainId: string, data: UpdateTenantDomainInput): Promise<SafeTenantDomain> {
    const domain = await prisma.tenantDomain.findUnique({
      where: { tenantDomainId }
    });

    if (!domain) {
      throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);
    }

    if (data.isPrimary) {
      await prisma.tenantDomain.updateMany({
        where: { tenantId: domain.tenantId, isPrimary: true },
        data: { isPrimary: false }
      });
    }

    const updated = await prisma.tenantDomain.update({
      where: { tenantDomainId },
      data
    });

    const parsed = SafeTenantDomainSchema.parse(updated);
    // Clear cache for both the old and new state (domain name might have changed)
    await this.clearCache(SafeTenantDomainSchema.parse(domain));
    await this.clearCache(parsed);
    
    return parsed;
  }

  static async initiateVerification({ tenantDomainId, method }: InitiateVerificationInput): Promise<DomainVerificationInfo> {
    const domain = await prisma.tenantDomain.findUnique({
      where: { tenantDomainId }
    });

    if (!domain) {
      throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);
    }

    if (domain.domainStatus === 'VERIFIED') {
      throw new Error(TenantDomainMessages.DOMAIN_ALREADY_VERIFIED);
    }

    const verification = await DNSVerificationService.initiateVerification(
      tenantDomainId,
      domain.domain,
      method
    );

    await prisma.tenantDomain.update({
      where: { tenantDomainId },
      data: { verificationToken: verification.token }
    });

    await this.clearCache(SafeTenantDomainSchema.parse(domain));

    return {
      domain: domain.domain,
      method: verification.method,
      recordName: verification.recordName,
      recordValue: verification.recordValue,
      domainStatus: domain.domainStatus
    };
  }

  static async verifyDomain(tenantDomainId: string): Promise<SafeTenantDomain> {
    const domain = await prisma.tenantDomain.findUnique({
      where: { tenantDomainId }
    });

    if (!domain) {
      throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);
    }

    if (domain.domainStatus === 'VERIFIED') {
      throw new Error(TenantDomainMessages.DOMAIN_ALREADY_VERIFIED);
    }

    const isVerified = await DNSVerificationService.checkVerification(
      tenantDomainId,
      domain.domain
    );

    if (!isVerified) {
      throw new Error(TenantDomainMessages.DNS_VERIFICATION_FAILED);
    }

    const updated = await prisma.tenantDomain.update({
      where: { tenantDomainId },
      data: {
        domainStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verificationToken: null
      }
    });

    const parsed = SafeTenantDomainSchema.parse(updated);
    await this.clearCache(parsed);
    return parsed;
  }

  static async delete(tenantDomainId: string): Promise<void> {
    const domain = await prisma.tenantDomain.findUnique({
      where: { tenantDomainId }
    });

    if (!domain) {
      throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);
    }

    if (domain.isPrimary) {
      throw new Error(TenantDomainMessages.CANNOT_DELETE_PRIMARY);
    }

    await DNSVerificationService.deleteStoredToken(tenantDomainId);
    await prisma.tenantDomain.delete({ where: { tenantDomainId } });
    await this.clearCache(SafeTenantDomainSchema.parse(domain));
  }
}
