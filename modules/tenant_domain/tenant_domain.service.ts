import TenantDomainCrudService from './tenant_domain.crud.service';
import TenantDomainDnsService from './tenant_domain.dns.service';

export { TenantDomainCrudService, TenantDomainDnsService };

export default class TenantDomainService {

  // CRUD
  static getByTenantId        = TenantDomainCrudService.getByTenantId.bind(TenantDomainCrudService);
  static getById              = TenantDomainCrudService.getById.bind(TenantDomainCrudService);
  static getByDomain          = TenantDomainCrudService.getByDomain.bind(TenantDomainCrudService);
  static getPrimaryByTenantId = TenantDomainCrudService.getPrimaryByTenantId.bind(TenantDomainCrudService);
  static create               = TenantDomainCrudService.create.bind(TenantDomainCrudService);
  static update               = TenantDomainCrudService.update.bind(TenantDomainCrudService);
  static delete               = TenantDomainCrudService.delete.bind(TenantDomainCrudService);

  // DNS verification
  static getVerificationInfo  = TenantDomainDnsService.getVerificationInfo.bind(TenantDomainDnsService);
  static initiateVerification = TenantDomainDnsService.initiateVerification.bind(TenantDomainDnsService);
  static verifyDomain         = TenantDomainDnsService.verifyDomain.bind(TenantDomainDnsService);
}
