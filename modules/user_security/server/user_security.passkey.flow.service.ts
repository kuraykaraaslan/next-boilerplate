import 'reflect-metadata';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { SafeUser } from '@nb/user/server/user.types';
import { generateRegistrationOptions, verifyRegistration } from './user_security.passkey.register.service';
import { generateAuthenticationOptions, verifyAuthentication } from './user_security.passkey.authenticate.service';

/**
 * WebAuthn passkey flow facade. Registration (options + verify) lives in
 * `user_security.passkey.register.service`, authentication in
 * `user_security.passkey.authenticate.service`, and RP config in
 * `user_security.passkey.config`; this class preserves the single
 * `UserSecurityPasskeyFlowService.*` entry point its callers depend on.
 */
export default class UserSecurityPasskeyFlowService {
  static generateRegistrationOptions(user: SafeUser): Promise<Record<string, unknown>> {
    return generateRegistrationOptions(user);
  }

  static verifyRegistration(args: {
    user: SafeUser;
    response: RegistrationResponseJSON;
    label?: string;
  }): Promise<{ credentialId: string }> {
    return verifyRegistration(args);
  }

  static generateAuthenticationOptions(email?: string): Promise<Record<string, unknown>> {
    return generateAuthenticationOptions(email);
  }

  static verifyAuthentication(args: {
    response: AuthenticationResponseJSON;
    email?: string;
  }): Promise<SafeUser> {
    return verifyAuthentication(args);
  }
}
