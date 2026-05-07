import { describe, it, expect } from 'vitest';
import {
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  GetAllUsersQuerySchema,
  GetUserByIdSchema,
  DeleteUserSchema,
} from './user.dto';

describe('CreateUserRequestSchema', () => {
  it('accepts valid user data with required fields', () => {
    const result = CreateUserRequestSchema.safeParse({
      email: 'user@example.com',
      password: 'securepass',
      phone: null,
      userRole: null,
      userStatus: null,
    });
    expect(result.success).toBe(true);
  });

  it('defaults userRole to USER when null', () => {
    const result = CreateUserRequestSchema.safeParse({
      email: 'user@example.com',
      password: 'securepass',
      phone: null,
      userRole: null,
      userStatus: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userRole).toBe('USER');
    }
  });

  it('defaults userStatus to ACTIVE when null', () => {
    const result = CreateUserRequestSchema.safeParse({
      email: 'user@example.com',
      password: 'securepass',
      phone: null,
      userRole: null,
      userStatus: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userStatus).toBe('ACTIVE');
    }
  });

  it('accepts explicit userRole ADMIN', () => {
    const result = CreateUserRequestSchema.safeParse({
      email: 'admin@example.com',
      password: 'securepass',
      phone: null,
      userRole: 'ADMIN',
      userStatus: 'ACTIVE',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userRole).toBe('ADMIN');
    }
  });

  it('rejects invalid email format', () => {
    const result = CreateUserRequestSchema.safeParse({
      email: 'not-an-email',
      password: 'securepass',
      phone: null,
      userRole: null,
      userStatus: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = CreateUserRequestSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
      phone: null,
      userRole: null,
      userStatus: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/8 characters/i);
    }
  });

  it('rejects invalid userRole value', () => {
    const result = CreateUserRequestSchema.safeParse({
      email: 'user@example.com',
      password: 'securepass',
      phone: null,
      userRole: 'SUPERADMIN',
      userStatus: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid userStatus value', () => {
    const result = CreateUserRequestSchema.safeParse({
      email: 'user@example.com',
      password: 'securepass',
      phone: null,
      userRole: null,
      userStatus: 'BANNED',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = CreateUserRequestSchema.safeParse({
      password: 'securepass',
      phone: null,
      userRole: null,
      userStatus: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateUserRequestSchema', () => {
  it('accepts all nullable fields as null', () => {
    const result = UpdateUserRequestSchema.safeParse({
      email: null,
      phone: null,
      userRole: null,
      userStatus: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a partial update with just email', () => {
    const result = UpdateUserRequestSchema.safeParse({
      email: 'updated@example.com',
      phone: null,
      userRole: null,
      userStatus: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email format in update', () => {
    const result = UpdateUserRequestSchema.safeParse({
      email: 'not-valid',
      phone: null,
      userRole: null,
      userStatus: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('GetAllUsersQuerySchema', () => {
  it('accepts valid pagination params', () => {
    const result = GetAllUsersQuerySchema.safeParse({
      page: 0,
      pageSize: 10,
      search: null,
      userId: null,
    });
    expect(result.success).toBe(true);
  });

  it('defaults page to 0 and pageSize to 10', () => {
    const result = GetAllUsersQuerySchema.safeParse({
      search: null,
      userId: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(0);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it('rejects pageSize greater than 100', () => {
    const result = GetAllUsersQuerySchema.safeParse({
      page: 0,
      pageSize: 101,
      search: null,
      userId: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative page number', () => {
    const result = GetAllUsersQuerySchema.safeParse({
      page: -1,
      pageSize: 10,
      search: null,
      userId: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('GetUserByIdSchema', () => {
  it('accepts a valid userId string', () => {
    const result = GetUserByIdSchema.safeParse({ userId: 'user-123' });
    expect(result.success).toBe(true);
  });

  it('rejects missing userId', () => {
    const result = GetUserByIdSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('DeleteUserSchema', () => {
  it('accepts a valid userId string', () => {
    const result = DeleteUserSchema.safeParse({ userId: 'user-456' });
    expect(result.success).toBe(true);
  });

  it('rejects missing userId', () => {
    const result = DeleteUserSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
