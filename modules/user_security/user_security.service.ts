import { AppDataSource } from "@/libs/typeorm";
import { UserSecurityEntity } from "./user_security.entity";
import { UserSecurity, UserSecuritySchema, SafeUserSecurity, SafeUserSecuritySchema } from "./user_security.types";

export default class UserSecurityService {

  private static get repository() {
    return AppDataSource.getRepository(UserSecurityEntity);
  }

  static async getByUserId(userId: string): Promise<UserSecurity> {
    const security = await this.repository.findOne({
      where: { userId }
    });

    if (!security) {
      return await this.createDefaultUserSecurity(userId);
    }

    return UserSecuritySchema.parse(security);
  }

  static async getSafeByUserId(userId: string): Promise<SafeUserSecurity> {
    const security = await this.repository.findOne({
      where: { userId }
    });

    if (!security) {
      return await this.createDefaultUserSecurity(userId);
    }

    return SafeUserSecuritySchema.parse(security);
  }

  static async createDefaultUserSecurity(userId: string): Promise<UserSecurity> {
    const existing = await this.repository.findOne({
      where: { userId }
    });

    if (existing) {
      throw new Error("Security record already exists for this user");
    }

    const security = this.repository.create({
      userId,
      otpMethods: [],
      otpBackupCodes: [],
      failedLoginAttempts: 0
    });

    const saved = await this.repository.save(security);
    return UserSecuritySchema.parse(saved);
  }

  static async updateUserSecurity(userId: string, data: Partial<UserSecurity>): Promise<UserSecurity> {
    const security = await this.repository.findOne({
      where: { userId }
    });

    if (!security) {
      throw new Error("Security record not found");
    }

    await this.repository.update({ userId }, data);

    const updated = await this.repository.findOne({
      where: { userId }
    });

    return UserSecuritySchema.parse(updated);
  }

  static async upsertUserSecurity(userId: string, data: Partial<UserSecurity>): Promise<UserSecurity> {
    const existing = await this.repository.findOne({
      where: { userId }
    });

    if (existing) {
      return this.updateUserSecurity(userId, data);
    }

    const security = this.repository.create({
      userId,
      ...data,
      otpMethods: data.otpMethods ?? [],
      otpBackupCodes: data.otpBackupCodes ?? [],
      failedLoginAttempts: data.failedLoginAttempts ?? 0
    });

    const saved = await this.repository.save(security);
    return UserSecuritySchema.parse(saved);
  }

  static async recordLoginAttempt(userId: string, success: boolean, ip?: string, device?: string): Promise<void> {
    const security = await this.repository.findOne({
      where: { userId }
    });

    if (!security) {
      throw new Error("Security record not found");
    }

    if (success) {
      await this.repository.update({ userId }, {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        lastLoginDevice: device,
        failedLoginAttempts: 0,
        lockedUntil: undefined
      });
    } else {
      const attempts = security.failedLoginAttempts + 1;
      const lockedUntil = attempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000)
        : undefined;

      await this.repository.update({ userId }, {
        failedLoginAttempts: attempts,
        lockedUntil
      });
    }
  }

  static async isLocked(userId: string): Promise<boolean> {
    const security = await this.repository.findOne({
      where: { userId }
    });

    if (!security || !security.lockedUntil) {
      return false;
    }

    return new Date() < security.lockedUntil;
  }
}
