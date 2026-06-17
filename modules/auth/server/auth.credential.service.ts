import 'reflect-metadata';
import type { SafeUser } from '@kuraykaraaslan/user/server/user.types';
import {
  generateToken, hashPassword, checkIfUserHasRole,
} from './auth.credential.helpers';
import { login } from './auth.credential.login.service';
import { register, changePassword } from './auth.credential.register.service';
import { eraseUserData, disableDormantAccounts } from './auth.credential.lifecycle.service';

/**
 * Auth credential service facade. The implementation is split across focused
 * modules (`auth.credential.login.service`, `.register.service`,
 * `.lifecycle.service`, plus the `auth.credential.helpers`); this class
 * preserves the single `AuthCredentialService.*` entry point its callers
 * depend on.
 */
export default class AuthCredentialService {
  static generateToken(): string {
    return generateToken();
  }

  static hashPassword(password: string, tenantId?: string): Promise<string> {
    return hashPassword(password, tenantId);
  }

  static login(params: {
    email: string; password: string; captchaToken?: string;
    tenantId?: string; ipAddress?: string; userAgent?: string;
  }): Promise<{ user: SafeUser; mustChangePassword: boolean }> {
    return login(params);
  }

  static register(params: {
    email: string; password: string; phone?: string; tenantId?: string; consentVersion?: string;
  }): Promise<{ user: SafeUser }> {
    return register(params);
  }

  static changePassword(params: { userId: string; newPassword: string; tenantId?: string }): Promise<void> {
    return changePassword(params);
  }

  static eraseUserData(userId: string): Promise<void> {
    return eraseUserData(userId);
  }

  static checkIfUserHasRole(user: SafeUser, requiredRole: string): boolean {
    return checkIfUserHasRole(user, requiredRole);
  }

  static disableDormantAccounts(tenantId?: string): Promise<{ scanned: number; disabled: number; erased: number }> {
    return disableDormantAccounts(tenantId);
  }
}
