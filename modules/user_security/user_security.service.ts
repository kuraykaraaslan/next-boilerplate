import { prisma } from "@/libs/prisma";
import { UserSecurity, UserSecuritySchema, SafeUserSecurity, SafeUserSecuritySchema } from "./user_security.types";

export default class UserSecurityService {

  static async getByUserId(userId: string): Promise<UserSecurity> {
    const security = await prisma.userSecurity.findUnique({
      where: { userId }
    });

    if (!security) {
      return await this.createDefaultUserSecurity(userId);
    }

    return UserSecuritySchema.parse(security);
  }

  static async getSafeByUserId(userId: string): Promise<SafeUserSecurity> {
    const security = await prisma.userSecurity.findUnique({
      where: { userId }
    });

    console.log('[UserSecurityService] Raw security data from DB:', JSON.stringify(security, null, 2));

    if (!security) {
      const created = await this.createDefaultUserSecurity(userId);
      return SafeUserSecuritySchema.parse(created);
    }

    // Ensure otpMethods is always an array (fix for null/undefined from DB)
    const securityWithDefaults = {
      ...security,
      otpMethods: security.otpMethods ?? [],
      otpBackupCodes: security.otpBackupCodes ?? [],
    };

    console.log('[UserSecurityService] Security data with defaults:', JSON.stringify(securityWithDefaults, null, 2));

    const parsed = SafeUserSecuritySchema.parse(securityWithDefaults);
    console.log('[UserSecurityService] Parsed safe security:', JSON.stringify(parsed, null, 2));
    return parsed;
  }

  static async createDefaultUserSecurity(userId: string): Promise<UserSecurity> {
    const existing = await prisma.userSecurity.findUnique({
      where: { userId }
    });

    if (existing) {
      throw new Error("Security record already exists for this user");
    }

    const security = await prisma.userSecurity.create({
      data: {
        userId,
        otpMethods: [],
        otpBackupCodes: [],
        failedLoginAttempts: 0
      }
    });

    return UserSecuritySchema.parse(security);
  }

  static async updateUserSecurity(userId: string, data: Partial<UserSecurity>): Promise<UserSecurity> {
    const security = await prisma.userSecurity.findUnique({
      where: { userId }
    });

    if (!security) {
      throw new Error("Security record not found");
    }

    const updated = await prisma.userSecurity.update({
      where: { userId },
      data
    });

    return UserSecuritySchema.parse(updated);
  }

  static async upsertUserSecurity(userId: string, data: Partial<UserSecurity>): Promise<UserSecurity> {
    const security = await prisma.userSecurity.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
        otpMethods: data.otpMethods ?? [],
        otpBackupCodes: data.otpBackupCodes ?? [],
        failedLoginAttempts: data.failedLoginAttempts ?? 0
      }
    });

    return UserSecuritySchema.parse(security);
  }

  static async recordLoginAttempt(userId: string, success: boolean, ip?: string, device?: string): Promise<void> {
    const security = await prisma.userSecurity.findUnique({
      where: { userId }
    });

    if (!security) {
      throw new Error("Security record not found");
    }

    if (success) {
      await prisma.userSecurity.update({
        where: { userId },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ip,
          lastLoginDevice: device,
          failedLoginAttempts: 0,
          lockedUntil: null
        }
      });
    } else {
      const attempts = security.failedLoginAttempts + 1;
      const lockedUntil = attempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null;

      await prisma.userSecurity.update({
        where: { userId },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil
        }
      });
    }
  }

  static async isLocked(userId: string): Promise<boolean> {
    const security = await prisma.userSecurity.findUnique({
      where: { userId }
    });

    if (!security || !security.lockedUntil) {
      return false;
    }

    return new Date() < security.lockedUntil;
  }
}
