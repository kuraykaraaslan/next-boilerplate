import { env } from '@/modules/env';
import { authenticator } from 'otplib';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import redis from '@/modules/redis';
import AuthMessages from './auth.messages';
import { encryptFieldOpt, decryptFieldOpt } from '@/modules/common/field-encryption';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { SafeUser } from '../user/user.types';
import { SafeUserSession } from '../user_session/user_session.types';
import { OTPAction } from '../user_security/user_security.enums';
import UserSecurityService from '../user_security/user_security.service';
import SettingService from '../setting/setting.service';

export default class TOTPService {
  static TOTP_STEP_SECONDS = env.TOTP_STEP_SECONDS ?? 30;
  static TOTP_WINDOW = env.TOTP_WINDOW ?? 1;
  static TOTP_DIGITS = env.OTP_LENGTH ?? 6;
  static SETUP_EXPIRY_SECONDS = env.TOTP_SETUP_EXPIRY_SECONDS ?? 600;
  static DEFAULT_ISSUER = env.TOTP_ISSUER || 'App';

  static async getIssuer(tenantId?: string): Promise<string> {
    if (!tenantId) return TOTPService.DEFAULT_ISSUER;
    const settings: Record<string, string> = await SettingService.getByKeys(tenantId, ['totpIssuer']).catch(() => ({}));
    return settings['totpIssuer']?.trim() || TOTPService.DEFAULT_ISSUER;
  }

  static setupOtpLib() {
    authenticator.options = {
      step: TOTPService.TOTP_STEP_SECONDS,
      window: TOTPService.TOTP_WINDOW,
      digits: TOTPService.TOTP_DIGITS,
    } as any;
  }

  static getRedisKey({ userSessionId, action }: { userSessionId: string; action: OTPAction | 'setup' }) {
    return `totp:${action}:${userSessionId}`;
  }

  static generateSecret() {
    TOTPService.setupOtpLib();
    return authenticator.generateSecret();
  }

  static async getOtpauthURL({ user, secret, tenantId }: { user: SafeUser; secret: string; tenantId?: string }) {
    TOTPService.setupOtpLib();
    const issuer = await TOTPService.getIssuer(tenantId);
    return authenticator.keyuri(user.email, issuer, secret);
  }

  // Start TOTP setup: generate temporary secret and return otpauth URL
  static async requestSetup({ user, userSession, tenantId }: { user: SafeUser; userSession: SafeUserSession; tenantId?: string }) {
    const tempSecret = TOTPService.generateSecret();
    const otpauthUrl = await TOTPService.getOtpauthURL({ user, secret: tempSecret, tenantId });

    const redisKey = TOTPService.getRedisKey({ userSessionId: userSession.userSessionId, action: 'setup' });
    await redis.set(redisKey, tempSecret, 'EX', TOTPService.SETUP_EXPIRY_SECONDS);

    return { secret: tempSecret, otpauthUrl };
  }

  static verifyTokenWithSecret(otpToken: string, secret: string): boolean {
    TOTPService.setupOtpLib();
    return authenticator.check(otpToken, secret);
  }

  // Verify the code against the temp secret and enable TOTP for the user
  static async verifyAndEnable({ user, userSession, otpToken }: { user: SafeUser; userSession: SafeUserSession; otpToken: string }) {
    const setupKey = TOTPService.getRedisKey({ userSessionId: userSession.userSessionId, action: 'setup' });
    const tempSecret = await redis.get(setupKey);

    if (!tempSecret) {
      throw new AppError(AuthMessages.INVALID_OTP, 400, ErrorCode.VALIDATION_ERROR);
    }

    const valid = TOTPService.verifyTokenWithSecret(otpToken, tempSecret);
    if (!valid) {
      throw new AppError(AuthMessages.INVALID_OTP, 401, ErrorCode.INVALID_CREDENTIALS);
    }

    const userSecurity = await UserSecurityService.getByUserId(user.userId);

    const newMethods = Array.from(new Set([...(userSecurity.otpMethods || []), 'TOTP_APP']));

    // Generate backup codes using crypto.randomInt for CSPRNG safety (KD-3).
    const codes: string[] = [];
    const makeCode = () => {
      const raw = Array.from({ length: 8 }, () => crypto.randomInt(0, 10).toString()).join('');
      return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    };

    for (let i = 0; i < 4; i++) codes.push(makeCode());
    const hashed = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));

    await UserSecurityService.updateUserSecurity(user.userId, {
      otpSecret: encryptFieldOpt(tempSecret),
      otpMethods: newMethods as any,
      otpBackupCodes: hashed as any,
    });

    await redis.del(setupKey);

    return { enabled: true, backupCodes: codes };
  }

  // Verify a login/authenticate action using persisted secret
  static async verifyAuthenticate({ user, otpToken }: { user: SafeUser; otpToken: string }) {
    const userSecurity = await UserSecurityService.getByUserId(user.userId);

    if (!userSecurity) {
      throw new AppError(AuthMessages.INVALID_OTP_METHOD, 400, ErrorCode.VALIDATION_ERROR);
    }

    if (!userSecurity.otpMethods.includes('TOTP_APP' as any) || !userSecurity.otpSecret) {
      throw new AppError(AuthMessages.INVALID_OTP_METHOD, 400, ErrorCode.VALIDATION_ERROR);
    }

    const secret = decryptFieldOpt(userSecurity.otpSecret) ?? userSecurity.otpSecret;
    const ok = TOTPService.verifyTokenWithSecret(otpToken, secret as string);
    if (!ok) {
      throw new AppError(AuthMessages.INVALID_OTP, 401, ErrorCode.INVALID_CREDENTIALS);
    }

    return { verified: true };
  }

  // Try TOTP first; if it fails, fallback to backup codes
  static async verifyAuthenticateOrBackup({ user, otpToken }: { user: SafeUser; otpToken: string }) {
    try {
      await TOTPService.verifyAuthenticate({ user, otpToken });
      return { verified: true, method: 'TOTP' };
    } catch (_) {
      const consumed = await TOTPService.consumeBackupCode({ user, code: otpToken });
      if (!consumed.consumed) {
        throw new AppError(AuthMessages.INVALID_OTP, 401, ErrorCode.INVALID_CREDENTIALS);
      }
      return { verified: true, method: 'BACKUP_CODE' };
    }
  }

  static async disable({ user, otpToken }: { user: SafeUser; otpToken: string }) {
    const userSecurity = await UserSecurityService.getByUserId(user.userId);

    if (!userSecurity) {
      throw new AppError(AuthMessages.INVALID_OTP_METHOD, 400, ErrorCode.VALIDATION_ERROR);
    }

    if (!userSecurity.otpMethods.includes('TOTP_APP' as any) || !userSecurity.otpSecret) {
      throw new AppError(AuthMessages.INVALID_OTP_METHOD, 400, ErrorCode.VALIDATION_ERROR);
    }

    const secretForDisable = decryptFieldOpt(userSecurity.otpSecret) ?? userSecurity.otpSecret;
    const ok = TOTPService.verifyTokenWithSecret(otpToken, secretForDisable as string);
    if (!ok) {
      throw new AppError(AuthMessages.INVALID_OTP, 401, ErrorCode.INVALID_CREDENTIALS);
    }

    const newMethods = (userSecurity.otpMethods || []).filter(m => m !== 'TOTP_APP');
    await UserSecurityService.updateUserSecurity(user.userId, {
      otpSecret: undefined,
      otpMethods: newMethods as any,
      otpBackupCodes: [],
    });
    return { disabled: true };
  }

  // Generate backup codes, store hashed; return plaintext codes to the user
  static async generateBackupCodes({ user, count = 4 }: { user: SafeUser; count?: number }) {
    const userSecurity = await UserSecurityService.getByUserId(user.userId);

    if (!userSecurity) {
      throw new AppError(AuthMessages.INVALID_OTP_METHOD, 400, ErrorCode.VALIDATION_ERROR);
    }

    if (!userSecurity.otpMethods.includes('TOTP_APP' as any) || !userSecurity.otpSecret) {
      throw new AppError(AuthMessages.INVALID_OTP_METHOD, 400, ErrorCode.VALIDATION_ERROR);
    }

    const codes: string[] = [];
    // Use crypto.randomInt for CSPRNG safety (KD-3).
    const makeCode = () => {
      const raw = Array.from({ length: 8 }, () => crypto.randomInt(0, 10).toString()).join('');
      return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    };

    for (let i = 0; i < count; i++) codes.push(makeCode());
    const hashed = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));

    await UserSecurityService.updateUserSecurity(user.userId, {
      otpBackupCodes: hashed as any,
    });

    return { codes };
  }

  // Consume a backup code: verify and remove it from stored list
  static async consumeBackupCode({ user, code }: { user: SafeUser; code: string }) {

    const userSecurity = await UserSecurityService.getByUserId(user.userId);
    
    const list = userSecurity.otpBackupCodes || [];
    if (!list.length) {
      return { consumed: false };
    }

    let matchIndex = -1;
    for (let i = 0; i < list.length; i++) {
      const ok = await bcrypt.compare(code, list[i]);
      if (ok) { matchIndex = i; break; }
    }

    if (matchIndex === -1) {
      return { consumed: false };
    }

    const newList = list.filter((_, idx) => idx !== matchIndex);
    await UserSecurityService.updateUserSecurity(user.userId, {
      otpBackupCodes: newList as any,
    });

    return { consumed: true };
  }
}
