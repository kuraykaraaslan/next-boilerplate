import { tenantDataSourceFor } from '@/modules/db';
import { TenantDomain as TenantDomainEntity } from './entities/tenant_domain.entity';
import { SafeTenantDomainSchema, type DomainVerificationInfo } from './tenant_domain.types';
import type { InitiateVerificationInput } from './tenant_domain.dto';
import TenantDomainMessages from './tenant_domain.messages';
import DNSVerificationService from './dns_verification.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import TenantDomainCrudService from './tenant_domain.crud.service';

export default class TenantDomainDnsService {

  static async getVerificationInfo(tenantDomainId: string, tenantId: string): Promise<DomainVerificationInfo> {
    const ds = await tenantDataSourceFor(tenantId);
    const domain = await ds.getRepository(TenantDomainEntity).findOne({ where: { tenantDomainId, tenantId } });
    if (!domain) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const verificationData = await DNSVerificationService.getStoredData(tenantDomainId);
    if (!verificationData) {
      return TenantDomainDnsService.initiateVerification({ tenantDomainId, method: 'TXT' }, tenantId);
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
      domainStatus: domain.domainStatus as 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'VERIFIED' | 'DNS_FAILED',
    };
  }

  static async initiateVerification({ tenantDomainId, method }: InitiateVerificationInput, tenantId: string): Promise<DomainVerificationInfo> {
    const ds = await tenantDataSourceFor(tenantId);
    const domain = await ds.getRepository(TenantDomainEntity).findOne({ where: { tenantDomainId, tenantId } });
    if (!domain) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (domain.domainStatus === 'VERIFIED') throw new AppError(TenantDomainMessages.DOMAIN_ALREADY_VERIFIED, 409, ErrorCode.CONFLICT);

    const verification = await DNSVerificationService.initiateVerification(tenantDomainId, domain.domain, method);
    await ds.getRepository(TenantDomainEntity).update({ tenantDomainId, tenantId }, { verificationToken: verification.token });
    await TenantDomainCrudService.clearCache(SafeTenantDomainSchema.parse(domain));

    return {
      domain: domain.domain,
      method: verification.method,
      recordName: verification.recordName,
      recordValue: verification.recordValue,
      domainStatus: domain.domainStatus as 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'VERIFIED' | 'DNS_FAILED',
    };
  }

  static async verifyDomain(tenantDomainId: string, tenantId: string): Promise<import('./tenant_domain.types').SafeTenantDomain> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantDomainEntity);
    const domain = await repo.findOne({ where: { tenantDomainId, tenantId } });
    if (!domain) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (domain.domainStatus === 'VERIFIED') throw new AppError(TenantDomainMessages.DOMAIN_ALREADY_VERIFIED, 409, ErrorCode.CONFLICT);

    const isVerified = await DNSVerificationService.checkVerification(tenantDomainId, domain.domain);
    if (!isVerified) throw new AppError(TenantDomainMessages.DNS_VERIFICATION_FAILED, 422, ErrorCode.VALIDATION_ERROR);

    await repo.update({ tenantDomainId, tenantId }, { domainStatus: 'VERIFIED', verifiedAt: new Date(), verificationToken: undefined });
    const updated = await repo.findOne({ where: { tenantDomainId, tenantId } });
    if (!updated) throw new AppError(TenantDomainMessages.DOMAIN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const parsed = SafeTenantDomainSchema.parse(updated);
    await TenantDomainCrudService.clearCache(parsed);
    return parsed;
  }
}
