import 'reflect-metadata';
import { getDataSource } from '@/modules/db';
import redis from '@/modules/redis';
import { User as UserEntity } from './entities/user.entity';
import { SafeUser, UpdateUser, SafeUserSchema } from './user.types';
import type { UserRole, UserStatus } from './user.enums';
import bcrypt from 'bcrypt';
import UserMessages from './user.messages';
import WebhookService from '@/modules/webhook/webhook.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { randomUUID } from 'node:crypto';
import { invalidate, isPasswordBreached, emitAuditLog } from './user.helpers';

export async function create({ email, password, phone, userRole, checkBreached = true }: {
  email: string;
  password: string;
  phone?: string;
  userRole?: UserRole;
  checkBreached?: boolean;
}): Promise<SafeUser> {
  if (!email) throw new AppError(UserMessages.INVALID_EMAIL, 400, ErrorCode.VALIDATION_ERROR);

  const ds = await getDataSource();
  const repo = ds.getRepository(UserEntity);

  const existingUser = await repo.findOne({ where: { email: email.toLowerCase() } });
  if (existingUser) throw new AppError(UserMessages.EMAIL_ALREADY_EXISTS, 409, ErrorCode.CONFLICT);
  if (!password) throw new AppError(UserMessages.INVALID_PASSWORD, 400, ErrorCode.VALIDATION_ERROR);

  // Breach detection (HaveIBeenPwned k-anonymity)
  if (checkBreached && await isPasswordBreached(password)) {
    throw new AppError(
      'This password has appeared in a data breach. Please choose a different password.',
      400,
      ErrorCode.VALIDATION_ERROR,
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = repo.create({
    email: email.toLowerCase(),
    password: hashedPassword,
    phone,
    userRole: userRole ?? 'USER',
    userStatus: 'ACTIVE',
  });
  const saved = await repo.save(user);
  await redis.del(`user:email:${saved.email.toLowerCase()}`).catch(() => {});

  // Audit trail
  await emitAuditLog(null, 'user.created', saved.userId, null);

  await WebhookService.dispatchPlatformEvent('user.created', {
    userId: saved.userId,
    email: saved.email,
    userRole: saved.userRole,
  });
  return SafeUserSchema.parse(saved);
}

export async function update({ userId, data }: { userId: string; data: UpdateUser }): Promise<SafeUser> {
  if (!userId) throw new AppError(UserMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  const ds = await getDataSource();
  const repo = ds.getRepository(UserEntity);
  const user = await repo.findOne({ where: { userId } });
  if (!user) throw new AppError(UserMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  await repo.update({ userId }, {
    email: data.email || undefined,
    phone: data.phone || undefined,
    userRole: data.userRole as UserRole | undefined,
    userStatus: data.userStatus as UserStatus | undefined,
  });
  const updated = await repo.findOne({ where: { userId } });

  await invalidate({ userId, email: user.email });
  if (updated && updated.email !== user.email) {
    await invalidate({ userId, email: updated.email });
  }

  await WebhookService.dispatchPlatformEvent('user.updated', {
    userId,
    email: updated!.email,
    userRole: updated!.userRole,
    userStatus: updated!.userStatus,
  });
  if (updated!.userStatus === 'SUSPENDED' && user.userStatus !== 'SUSPENDED') {
    await WebhookService.dispatchPlatformEvent('user.suspended', {
      userId,
      email: updated!.email,
    });
  }

  return SafeUserSchema.parse(updated!);
}

/** Hard delete — used for non-GDPR scenarios. For GDPR use `erase()`. */
export async function remove(userId: string): Promise<void> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserEntity);
  const user = await repo.findOne({ where: { userId } });
  if (!user) throw new AppError(UserMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  await repo.delete({ userId });
  await invalidate({ userId, email: user.email });
  await WebhookService.dispatchPlatformEvent('user.deleted', { userId, email: user.email });
}

/**
 * GDPR Art. 17 Right-to-Erasure: anonymize personal data instead of hard-deleting.
 * Replaces email, phone with an irreversible placeholder; password is zeroed.
 * The user row is kept (soft-delete) for referential integrity in audit logs and invoices.
 */
export async function erase(userId: string, requestedByUserId?: string): Promise<void> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserEntity);
  const user = await repo.findOne({ where: { userId } });
  if (!user) throw new AppError(UserMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const anon = `erased-${randomUUID()}@deleted.invalid`;
  await repo.update({ userId }, {
    email: anon,
    phone: null,
    password: 'ERASED',
    userStatus: 'DELETED',
    emailVerifiedAt: null,
    consentVersion: null,
    consentAcceptedAt: null,
    deletedAt: new Date(),
  } as any);

  await invalidate({ userId, email: user.email });
  await emitAuditLog(null, 'user.erased', userId, requestedByUserId);
  await WebhookService.dispatchPlatformEvent('user.erased', { userId });
}
