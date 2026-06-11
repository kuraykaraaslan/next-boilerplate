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
} from './auth.policy.loader.service';

export {
  PASSWORD_POLICY_KEYS,
  LOCKOUT_POLICY_KEYS,
  SESSION_POLICY_KEYS,
  DORMANT_POLICY_KEYS,
  ADMIN_POLICY_KEYS,
  ACCESS_POLICY_KEYS,
} from './auth.policy.loader.service';

export default class AuthPolicyService {
  static getPasswordPolicy  = AuthPolicyLoaderService.getPasswordPolicy.bind(AuthPolicyLoaderService);
  static getLockoutPolicy   = AuthPolicyLoaderService.getLockoutPolicy.bind(AuthPolicyLoaderService);
  static getSessionPolicy   = AuthPolicyLoaderService.getSessionPolicy.bind(AuthPolicyLoaderService);
  static getDormantPolicy   = AuthPolicyLoaderService.getDormantPolicy.bind(AuthPolicyLoaderService);
  static getAdminPolicy     = AuthPolicyLoaderService.getAdminPolicy.bind(AuthPolicyLoaderService);
  static getAccessPolicy    = AuthPolicyLoaderService.getAccessPolicy.bind(AuthPolicyLoaderService);
  static isAdminIpAllowed   = AuthPolicyValidatorService.isAdminIpAllowed.bind(AuthPolicyValidatorService);
  static validatePassword   = AuthPolicyValidatorService.validatePassword.bind(AuthPolicyValidatorService);
}
