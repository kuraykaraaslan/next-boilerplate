import UserSecurityPasskeyFlowService from './user_security.passkey.flow.service';
import UserSecurityPasskeyCrudService from './user_security.passkey.crud.service';

export { UserSecurityPasskeyFlowService, UserSecurityPasskeyCrudService };

export default class UserSecurityPasskeyService {
  static generateRegistrationOptions  = UserSecurityPasskeyFlowService.generateRegistrationOptions.bind(UserSecurityPasskeyFlowService);
  static verifyRegistration           = UserSecurityPasskeyFlowService.verifyRegistration.bind(UserSecurityPasskeyFlowService);
  static generateAuthenticationOptions = UserSecurityPasskeyFlowService.generateAuthenticationOptions.bind(UserSecurityPasskeyFlowService);
  static verifyAuthentication         = UserSecurityPasskeyFlowService.verifyAuthentication.bind(UserSecurityPasskeyFlowService);
  static deletePasskey                = UserSecurityPasskeyCrudService.deletePasskey.bind(UserSecurityPasskeyCrudService);
  static listPasskeys                 = UserSecurityPasskeyCrudService.listPasskeys.bind(UserSecurityPasskeyCrudService);
}
