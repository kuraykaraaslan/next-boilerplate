import 'reflect-metadata';
import type { User, SafeUser, UpdateUser } from './user.types';
import type { UserRole } from './user.enums';
import { invalidate } from './user.helpers';
import { getAll, getById, getByEmail } from './user.read.service';
import { create, update, remove, erase } from './user.crud.service';
import { enforcePasswordPolicy, deactivateInactiveUsers, merge } from './user.admin.service';

/**
 * User service facade. The implementation is split across focused modules
 * (`user.read.service`, `user.crud.service`, `user.admin.service`, plus the
 * `user.helpers` cache/audit/breach helpers); this class preserves the single
 * `UserService.*` entry point its many callers depend on.
 */
export default class UserService {
  static invalidate(user: { userId: string; email?: string }): Promise<void> {
    return invalidate(user);
  }

  static create(params: {
    email: string; password: string; phone?: string; userRole?: UserRole; checkBreached?: boolean;
  }): Promise<SafeUser> {
    return create(params);
  }

  static getAll(params: {
    page: number; pageSize: number; search?: string; userId?: string; tenantId?: string; phone?: string;
  }): Promise<{ users: SafeUser[]; total: number }> {
    return getAll(params);
  }

  static getById(userId: string): Promise<SafeUser> {
    return getById(userId);
  }

  static update(params: { userId: string; data: UpdateUser }): Promise<SafeUser> {
    return update(params);
  }

  static delete(userId: string): Promise<void> {
    return remove(userId);
  }

  static erase(userId: string, requestedByUserId?: string): Promise<void> {
    return erase(userId, requestedByUserId);
  }

  static enforcePasswordPolicy(tenantId: string, password: string): Promise<void> {
    return enforcePasswordPolicy(tenantId, password);
  }

  static deactivateInactiveUsers(inactiveDays: number): Promise<number> {
    return deactivateInactiveUsers(inactiveDays);
  }

  static merge(targetUserId: string, sourceUserId: string, actorId?: string): Promise<SafeUser> {
    return merge(targetUserId, sourceUserId, actorId);
  }

  static getByEmail(email: string): Promise<User | null> {
    return getByEmail(email);
  }
}
