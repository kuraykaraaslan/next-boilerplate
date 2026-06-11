import AuthSamlConfigService from './auth_saml.config.service';
import AuthSamlFlowService from './auth_saml.flow.service';

export { AuthSamlConfigService, AuthSamlFlowService };

export default class SamlService {

  // ──────────────────────────────────────────────
  // Config management
  // ──────────────────────────────────────────────

  static spEntityId       = AuthSamlConfigService.spEntityId.bind(AuthSamlConfigService);
  static acsUrl           = AuthSamlConfigService.acsUrl.bind(AuthSamlConfigService);
  static metadataUrl      = AuthSamlConfigService.metadataUrl.bind(AuthSamlConfigService);
  static sloUrl           = AuthSamlConfigService.sloUrl.bind(AuthSamlConfigService);
  static getConfig        = AuthSamlConfigService.getConfig.bind(AuthSamlConfigService);
  static upsertConfig     = AuthSamlConfigService.upsertConfig.bind(AuthSamlConfigService);
  static deleteConfig     = AuthSamlConfigService.deleteConfig.bind(AuthSamlConfigService);
  static importMetadata   = AuthSamlConfigService.importMetadata.bind(AuthSamlConfigService);
  static checkIdpCertExpiry = AuthSamlConfigService.checkIdpCertExpiry.bind(AuthSamlConfigService);

  // ──────────────────────────────────────────────
  // Auth flow / provisioning
  // ──────────────────────────────────────────────

  static generateAuthUrl          = AuthSamlFlowService.generateAuthUrl.bind(AuthSamlFlowService);
  static isTenantEnabled          = AuthSamlFlowService.isTenantEnabled.bind(AuthSamlFlowService);
  static validateCallback         = AuthSamlFlowService.validateCallback.bind(AuthSamlFlowService);
  static generateMetadata         = AuthSamlFlowService.generateMetadata.bind(AuthSamlFlowService);
  static linkToUser               = AuthSamlFlowService.linkToUser.bind(AuthSamlFlowService);
  static mapSamlRoleToMemberRole  = AuthSamlFlowService.mapSamlRoleToMemberRole.bind(AuthSamlFlowService);
  static resolveOrProvisionUser   = AuthSamlFlowService.resolveOrProvisionUser.bind(AuthSamlFlowService);
}
