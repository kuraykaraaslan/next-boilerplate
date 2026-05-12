import 'reflect-metadata';
import { env } from '@/modules/env';
import crypto from 'crypto';
import { getSystemDataSource } from '@/modules/db';
import { User as UserEntity } from '../user/entities/user.entity';
import bcrypt from 'bcrypt';
import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import UserService from '../user/user.service';
import TenantService from '../tenant/tenant.service';
import TenantInvitationService from '../tenant_invitation/tenant_invitation.service';
import MailService from '../notification_mail/notification_mail.service';
import { SafeUser, SafeUserSchema } from '../user/user.types';
import AuthMessages from './auth.messages';

export default class AuthService {

  static generateToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async login({ email, password }: { email: string; password: string }): Promise<{ user: SafeUser }> {
    const ds = await getSystemDataSource();
    const user = await ds.getRepository(UserEntity).findOne({ where: { email: email.toLowerCase() } });
    if (!user) throw new Error(AuthMessages.INVALID_EMAIL_OR_PASSWORD);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new Error(AuthMessages.INVALID_EMAIL_OR_PASSWORD);

    return { user: SafeUserSchema.parse(user) };
  }

  static async logout({ accessToken }: { accessToken: string }): Promise<void> {}

  static async register({ email, password, phone }: { email: string; password: string; phone?: string }): Promise<{ user: SafeUser }> {
    const existingUser = await UserService.getByEmail(email);
    if (existingUser) throw new Error(AuthMessages.EMAIL_ALREADY_EXISTS);

    const ds = await getSystemDataSource();
    const newUser = ds.getRepository(UserEntity).create({
      phone,
      email: email.toLowerCase(),
      password: await AuthService.hashPassword(password),
    });
    const saved = await ds.getRepository(UserEntity).save(newUser);
    const parsedUser = SafeUserSchema.parse(saved);

    await TenantService.provisionPersonal(parsedUser.userId, parsedUser.email);
    await TenantInvitationService.autoAcceptForEmail(parsedUser.userId, parsedUser.email);

    return { user: parsedUser };
  }

  private static readonly EMAIL_VERIFY_TTL_SECONDS = env.EMAIL_VERIFY_TTL_SECONDS ?? (60 * 60 * 24);
  private static readonly EMAIL_VERIFY_RATE_LIMIT_SECONDS = env.EMAIL_VERIFY_RATE_LIMIT_SECONDS ?? 300;

  private static getEmailVerifyKey(userId: string): string {
    return `email:verify:${userId}`;
  }

  private static getEmailVerifyRateKey(userId: string): string {
    return `email:verify:rate:${userId}`;
  }

  static async sendEmailVerification({ userId, email, name }: { userId: string; email: string; name?: string }): Promise<void> {
    const ds = await getSystemDataSource();
    const user = await ds.getRepository(UserEntity).findOne({ where: { userId } });
    if (!user) throw new Error(AuthMessages.USER_NOT_FOUND);
    if (user.emailVerifiedAt) throw new Error(AuthMessages.EMAIL_ALREADY_VERIFIED);

    const rateKey = AuthService.getEmailVerifyRateKey(userId);
    if (await redis.get(rateKey)) throw new Error(AuthMessages.RATE_LIMIT_EXCEEDED);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const verifyKey = AuthService.getEmailVerifyKey(userId);
    await redis.set(verifyKey, hashedToken, 'EX', AuthService.EMAIL_VERIFY_TTL_SECONDS);
    await redis.set(rateKey, '1', 'EX', AuthService.EMAIL_VERIFY_RATE_LIMIT_SECONDS);

    await MailService.sendVerifyEmail({ email, name, verifyToken: rawToken });
    Logger.info(`Email verification sent for user ${userId}`);
  }

  static async verifyEmail({ userId, token }: { userId: string; token: string }): Promise<void> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserEntity);
    const user = await repo.findOne({ where: { userId } });
    if (!user) throw new Error(AuthMessages.USER_NOT_FOUND);
    if (user.emailVerifiedAt) throw new Error(AuthMessages.EMAIL_ALREADY_VERIFIED);

    const verifyKey = AuthService.getEmailVerifyKey(userId);
    const storedHash = await redis.get(verifyKey);
    if (!storedHash) throw new Error(AuthMessages.VERIFICATION_TOKEN_EXPIRED);

    const inputHash = crypto.createHash('sha256').update(token).digest('hex');
    if (inputHash !== storedHash) throw new Error(AuthMessages.INVALID_VERIFICATION_TOKEN);

    await repo.update({ userId }, { emailVerifiedAt: new Date() });
    await redis.del(verifyKey);
    await redis.del(AuthService.getEmailVerifyRateKey(userId));

    Logger.info(`Email verified for user ${userId}`);
  }

  public static checkIfUserHasRole(user: SafeUser, requiredRole: string): boolean {
    const roles = ['SUPER_ADMIN', 'ADMIN', 'USER', 'GUEST'];
    return roles.indexOf(user.userRole) <= roles.indexOf(requiredRole);
  }
}
