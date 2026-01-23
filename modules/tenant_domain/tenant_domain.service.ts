import { prisma } from "@/libs/prisma";
import { SafeTenantDomain, SafeTenantDomainSchema, DomainVerificationInfo } from "./tenant_domain.types";
import { CreateTenantDomainInput, UpdateTenantDomainInput, GetTenantDomainsInput, InitiateVerificationInput } from "./tenant_domain.dto";
import TenantDomainMessages from "./tenant_domain.messages";
import DNSVerificationService from "./dns_verification.service";

export default class TenantDomainService {

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
    const domain = await prisma.tenantDomain.findUnique({
      where: { tenantDomainId }
    });

    if (!domain) {
      throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);
    }

    return SafeTenantDomainSchema.parse(domain);
  }

  static async getByDomain(domain: string): Promise<SafeTenantDomain | null> {
    const found = await prisma.tenantDomain.findUnique({
      where: { domain }
    });

    if (!found) {
      console.log(`TenantDomainService.getByDomain: Domain not found: ${domain}`);
      return null;
    }


    console.log(`TenantDomainService.getByDomain: Found domain: ${domain} → tenantId: ${found.tenantId}`);
    return SafeTenantDomainSchema.parse(found);
  }

  static async getPrimaryByTenantId(tenantId: string): Promise<SafeTenantDomain | null> {
    const domain = await prisma.tenantDomain.findFirst({
      where: { tenantId, isPrimary: true }
    });

    if (!domain) {
      return null;
    }

    return SafeTenantDomainSchema.parse(domain);
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

    return SafeTenantDomainSchema.parse(domain);
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

    return SafeTenantDomainSchema.parse(updated);
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

    return SafeTenantDomainSchema.parse(updated);
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
  }
}
