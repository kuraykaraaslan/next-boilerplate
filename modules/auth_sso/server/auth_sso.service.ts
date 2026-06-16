import SSOFlowService from './auth_sso.flow.service';
import SSOAccountService from './auth_sso.account.service';
import SsoConfigService from './auth_sso.config.service';

export { SSOFlowService, SSOAccountService, SsoConfigService };
export type { SSOFlowContext } from './auth_sso.flow.service';

export default class SSOService {

  // ──────────────────────────────────────────────
  // Auth flow
  // ──────────────────────────────────────────────

  static getAllowedProviders      = SSOFlowService.getAllowedProviders.bind(SSOFlowService);
  static generateAuthUrl          = SSOFlowService.generateAuthUrl.bind(SSOFlowService);
  static isProviderEnabled        = SSOFlowService.isProviderEnabled.bind(SSOFlowService);
  static handleCallback           = SSOFlowService.handleCallback.bind(SSOFlowService);
  static synthesizeSSOEmail       = SSOFlowService.synthesizeSSOEmail.bind(SSOFlowService);
  static isPlaceholderEmail       = SSOFlowService.isPlaceholderEmail.bind(SSOFlowService);
  static authenticateOrRegister   = SSOFlowService.authenticateOrRegister.bind(SSOFlowService);
  static refreshLinkedAccount     = SSOFlowService.refreshLinkedAccount.bind(SSOFlowService);

  // ──────────────────────────────────────────────
  // Per-tenant config / monitoring
  // ──────────────────────────────────────────────

  static resolveConfig            = SsoConfigService.resolveConfig.bind(SsoConfigService);
  static checkClientSecretExpiry  = SsoConfigService.checkClientSecretExpiry.bind(SsoConfigService);

  // ──────────────────────────────────────────────
  // Connected accounts
  // ──────────────────────────────────────────────

  static linkAccount      = SSOAccountService.linkAccount.bind(SSOAccountService);
  static signLinkState    = SSOAccountService.signLinkState.bind(SSOAccountService);
  static parseLinkState   = SSOAccountService.parseLinkState.bind(SSOAccountService);
  static safeReturnPath   = SSOAccountService.safeReturnPath.bind(SSOAccountService);
  static safeReturnPathForTenant = SSOAccountService.safeReturnPathForTenant.bind(SSOAccountService);
  static linkToUser       = SSOAccountService.linkToUser.bind(SSOAccountService);
  static unlinkAccount    = SSOAccountService.unlinkAccount.bind(SSOAccountService);
  static getLinkedAccounts = SSOAccountService.getLinkedAccounts.bind(SSOAccountService);
}
