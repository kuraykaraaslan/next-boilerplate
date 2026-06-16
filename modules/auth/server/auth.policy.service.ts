import AuthPolicyLoaderService from './auth.policy.loader.service';
import AuthPolicyValidatorService from './auth.policy.validator.service';

export { AuthPolicyLoaderService, AuthPolicyValidatorService };

export type {
  PasswordPolicy,
  LockoutPolicy,
  SessionPolicy,
  DormantPolicy,
  AdminPolicy,
  AccessPolicy,
  OtpPolicy,
  ResetPolicy,
  EmailVerifyPolicy,
  CredentialPolicy,
  MfaMethod,
} from './auth.policy.loader.service';

export {
  PASSWORD_POLICY_KEYS,
  LOCKOUT_POLICY_KEYS,
  SESSION_POLICY_KEYS,
  DORMANT_POLICY_KEYS,
  ADMIN_POLICY_KEYS,
  ACCESS_POLICY_KEYS,
  OTP_POLICY_KEYS,
  RESET_POLICY_KEYS,
  EMAIL_VERIFY_POLICY_KEYS,
  CREDENTIAL_POLICY_KEYS,
  ALL_MFA_METHODS,
} from './auth.policy.loader.service';

export default class AuthPolicyService {
  static getPasswordPolicy   = AuthPolicyLoaderService.getPasswordPolicy.bind(AuthPolicyLoaderService);
  static getLockoutPolicy    = AuthPolicyLoaderService.getLockoutPolicy.bind(AuthPolicyLoaderService);
  static getSessionPolicy    = AuthPolicyLoaderService.getSessionPolicy.bind(AuthPolicyLoaderService);
  static getDormantPolicy    = AuthPolicyLoaderService.getDormantPolicy.bind(AuthPolicyLoaderService);
  static getAdminPolicy      = AuthPolicyLoaderService.getAdminPolicy.bind(AuthPolicyLoaderService);
  static getAccessPolicy     = AuthPolicyLoaderService.getAccessPolicy.bind(AuthPolicyLoaderService);
  static getOtpPolicy        = AuthPolicyLoaderService.getOtpPolicy.bind(AuthPolicyLoaderService);
  static getResetPolicy      = AuthPolicyLoaderService.getResetPolicy.bind(AuthPolicyLoaderService);
  static getEmailVerifyPolicy = AuthPolicyLoaderService.getEmailVerifyPolicy.bind(AuthPolicyLoaderService);
  static getCredentialPolicy = AuthPolicyLoaderService.getCredentialPolicy.bind(AuthPolicyLoaderService);
  static isAdminIpAllowed    = AuthPolicyValidatorService.isAdminIpAllowed.bind(AuthPolicyValidatorService);
  static validatePassword    = AuthPolicyValidatorService.validatePassword.bind(AuthPolicyValidatorService);
  static isSsoProviderAllowed = AuthPolicyValidatorService.isSsoProviderAllowed.bind(AuthPolicyValidatorService);
  static filterAllowedProviders = AuthPolicyValidatorService.filterAllowedProviders.bind(AuthPolicyValidatorService);
  static isMfaMethodAllowed  = AuthPolicyValidatorService.isMfaMethodAllowed.bind(AuthPolicyValidatorService);
}
