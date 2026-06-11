import AuthCredentialService from './auth.credential.service';
import AuthVerificationService from './auth.verification.service';

export { AuthCredentialService, AuthVerificationService };

export default class AuthService {

  // ──────────────────────────────────────────────
  // Credentials
  // ──────────────────────────────────────────────

  static generateToken        = AuthCredentialService.generateToken.bind(AuthCredentialService);
  static hashPassword         = AuthCredentialService.hashPassword.bind(AuthCredentialService);
  static login                = AuthCredentialService.login.bind(AuthCredentialService);
  static register             = AuthCredentialService.register.bind(AuthCredentialService);
  static changePassword       = AuthCredentialService.changePassword.bind(AuthCredentialService);
  static checkIfUserHasRole   = AuthCredentialService.checkIfUserHasRole.bind(AuthCredentialService);
  static disableDormantAccounts = AuthCredentialService.disableDormantAccounts.bind(AuthCredentialService);

  // ──────────────────────────────────────────────
  // Email verification
  // ──────────────────────────────────────────────

  static logout               = AuthVerificationService.logout.bind(AuthVerificationService);
  static sendEmailVerification = AuthVerificationService.sendEmailVerification.bind(AuthVerificationService);
  static verifyEmail          = AuthVerificationService.verifyEmail.bind(AuthVerificationService);
}
