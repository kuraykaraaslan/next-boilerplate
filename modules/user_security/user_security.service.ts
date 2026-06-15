import 'reflect-metadata';
import type { UserSecurity, SafeUserSecurity } from './user_security.types';
import {
  getByUserId, getSafeByUserId, createDefaultUserSecurity,
  updateUserSecurity, upsertUserSecurity,
} from './user_security.crud.service';
import {
  recordLoginAttempt, isLocked, pushPasswordHistory,
  getPasswordHistory, getPasswordChangedAt, setMustChangePassword,
} from './user_security.login.service';
import {
  generateBackupCodes, verifyAndConsumeBackupCode,
  getMfaPolicy, isMfaRequiredFor, hasMfaConfigured, emitMfaChanged,
  trustDevice, isDeviceTrusted, revokeTrustedDevices,
} from './user_security.mfa.service';

/**
 * User-security service facade. The implementation is split across focused
 * modules (`user_security.crud.service`, `.login.service`, `.mfa.service`, plus
 * the `user_security.helpers`); this class preserves the single
 * `UserSecurityService.*` entry point its callers depend on.
 */
export default class UserSecurityService {
  static getByUserId(userId: string): Promise<UserSecurity> {
    return getByUserId(userId);
  }

  static getSafeByUserId(userId: string): Promise<SafeUserSecurity> {
    return getSafeByUserId(userId);
  }

  static createDefaultUserSecurity(userId: string): Promise<UserSecurity> {
    return createDefaultUserSecurity(userId);
  }

  static updateUserSecurity(userId: string, data: Partial<UserSecurity>): Promise<UserSecurity> {
    return updateUserSecurity(userId, data);
  }

  static upsertUserSecurity(userId: string, data: Partial<UserSecurity>): Promise<UserSecurity> {
    return upsertUserSecurity(userId, data);
  }

  static recordLoginAttempt(
    userId: string,
    success: boolean,
    ip?: string,
    device?: string,
    options?: { maxAttempts?: number; lockDurationMinutes?: number; tenantId?: string; country?: string },
  ): Promise<{ anomaly: boolean }> {
    return recordLoginAttempt(userId, success, ip, device, options);
  }

  static isLocked(userId: string): Promise<boolean> {
    return isLocked(userId);
  }

  static pushPasswordHistory(userId: string, passwordHash: string, historyCount: number): Promise<void> {
    return pushPasswordHistory(userId, passwordHash, historyCount);
  }

  static getPasswordHistory(userId: string): Promise<string[]> {
    return getPasswordHistory(userId);
  }

  static getPasswordChangedAt(userId: string): Promise<Date | null> {
    return getPasswordChangedAt(userId);
  }

  static setMustChangePassword(userId: string, value: boolean): Promise<void> {
    return setMustChangePassword(userId, value);
  }

  static generateBackupCodes(userId: string, count = 10): Promise<string[]> {
    return generateBackupCodes(userId, count);
  }

  static verifyAndConsumeBackupCode(userId: string, code: string): Promise<boolean> {
    return verifyAndConsumeBackupCode(userId, code);
  }

  static getMfaPolicy(tenantId: string): Promise<{ required: boolean; requiredRoles: string[] }> {
    return getMfaPolicy(tenantId);
  }

  static isMfaRequiredFor(tenantId: string, role?: string | null): Promise<boolean> {
    return isMfaRequiredFor(tenantId, role);
  }

  static hasMfaConfigured(userId: string): Promise<boolean> {
    return hasMfaConfigured(userId);
  }

  static emitMfaChanged(tenantId: string, userId: string, enabled: boolean): Promise<void> {
    return emitMfaChanged(tenantId, userId, enabled);
  }

  static trustDevice(userId: string, label: string | null, ttlDays = 30): Promise<string> {
    return trustDevice(userId, label, ttlDays);
  }

  static isDeviceTrusted(userId: string, token: string | null | undefined): Promise<boolean> {
    return isDeviceTrusted(userId, token);
  }

  static revokeTrustedDevices(userId: string): Promise<void> {
    return revokeTrustedDevices(userId);
  }
}
