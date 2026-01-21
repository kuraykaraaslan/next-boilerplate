import AppDataSource from "@/libs/typeorm";
import { TenantDomainEntity } from "./tenant_domain.entity";
import { SafeTenantDomain, SafeTenantDomainSchema, DomainVerificationInfo } from "./tenant_domain.types";
import { CreateTenantDomainInput, UpdateTenantDomainInput, GetTenantDomainsInput, InitiateVerificationInput } from "./tenant_domain.dto";
import TenantDomainMessages from "./tenant_domain.messages";
import DNSVerificationService from "./dns_verification.service";

export default class TenantDomainService {

  private static get repository() {
    return AppDataSource.getRepository(TenantDomainEntity);
  }

  static async getByTenantId({ tenantId, page, pageSize }: GetTenantDomainsInput): Promise<{ domains: SafeTenantDomain[], total: number }> {
    const [domains, total] = await this.repository.findAndCount({
      where: { tenantId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { isPrimary: 'DESC', createdAt: 'DESC' }
    });

    return {
      domains: domains.map(domain => SafeTenantDomainSchema.parse(domain)),
      total
    };
  }

  static async getById(tenantDomainId: string): Promise<SafeTenantDomain> {
    const domain = await this.repository.findOne({
      where: { tenantDomainId }
    });

    if (!domain) {
      throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);
    }

    return SafeTenantDomainSchema.parse(domain);
  }

  static async getByDomain(domain: string): Promise<SafeTenantDomain | null> {
    const found = await this.repository.findOne({
      where: { domain }
    });

    if (!found) {
      return null;
    }

    return SafeTenantDomainSchema.parse(found);
  }

  static async getPrimaryByTenantId(tenantId: string): Promise<SafeTenantDomain | null> {
    const domain = await this.repository.findOne({
      where: { tenantId, isPrimary: true }
    });

    if (!domain) {
      return null;
    }

    return SafeTenantDomainSchema.parse(domain);
  }

  static async create(data: CreateTenantDomainInput): Promise<SafeTenantDomain> {
    const existing = await this.repository.findOne({
      where: { domain: data.domain }
    });

    if (existing) {
      throw new Error(TenantDomainMessages.DOMAIN_ALREADY_EXISTS);
    }

    if (data.isPrimary) {
      await this.repository.update(
        { tenantId: data.tenantId, isPrimary: true },
        { isPrimary: false }
      );
    }

    const domain = this.repository.create({
      ...data,
      domainStatus: 'PENDING'
    });

    const saved = await this.repository.save(domain);
    return SafeTenantDomainSchema.parse(saved);
  }

  static async update(tenantDomainId: string, data: UpdateTenantDomainInput): Promise<SafeTenantDomain> {
    const domain = await this.repository.findOne({
      where: { tenantDomainId }
    });

    if (!domain) {
      throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);
    }

    if (data.isPrimary) {
      await this.repository.update(
        { tenantId: domain.tenantId, isPrimary: true },
        { isPrimary: false }
      );
    }

    await this.repository.update({ tenantDomainId }, data);

    const updated = await this.repository.findOne({
      where: { tenantDomainId }
    });

    return SafeTenantDomainSchema.parse(updated);
  }

  static async initiateVerification({ tenantDomainId, method }: InitiateVerificationInput): Promise<DomainVerificationInfo> {
    const domain = await this.repository.findOne({
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

    await this.repository.update({ tenantDomainId }, {
      verificationToken: verification.token
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
    const domain = await this.repository.findOne({
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

    await this.repository.update({ tenantDomainId }, {
      domainStatus: 'VERIFIED',
      verifiedAt: new Date(),
      verificationToken: undefined
    });

    const updated = await this.repository.findOne({
      where: { tenantDomainId }
    });

    return SafeTenantDomainSchema.parse(updated);
  }

  static async delete(tenantDomainId: string): Promise<void> {
    const domain = await this.repository.findOne({
      where: { tenantDomainId }
    });

    if (!domain) {
      throw new Error(TenantDomainMessages.DOMAIN_NOT_FOUND);
    }

    if (domain.isPrimary) {
      throw new Error(TenantDomainMessages.CANNOT_DELETE_PRIMARY);
    }

    await DNSVerificationService.deleteStoredToken(tenantDomainId);
    await this.repository.delete({ tenantDomainId });
  }
}
