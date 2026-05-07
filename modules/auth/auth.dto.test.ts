import { describe, it, expect } from 'vitest';
import { LoginDTO, RegisterDTO, ForgotPasswordDTO, ResetPasswordDTO } from './auth.dto';

describe('LoginDTO', () => {
  it('accepts valid credentials', () => {
    const result = LoginDTO.safeParse({ email: 'user@example.com', password: 'secret' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = LoginDTO.safeParse({ email: 'not-an-email', password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = LoginDTO.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('RegisterDTO', () => {
  it('accepts valid registration data', () => {
    const result = RegisterDTO.safeParse({ email: 'user@example.com', password: 'securepass123' });
    expect(result.success).toBe(true);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = RegisterDTO.safeParse({ email: 'user@example.com', password: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/8 characters/i);
    }
  });

  it('rejects invalid email', () => {
    const result = RegisterDTO.safeParse({ email: 'bad', password: 'securepass123' });
    expect(result.success).toBe(false);
  });

  it('accepts optional phone field', () => {
    const result = RegisterDTO.safeParse({
      email: 'user@example.com',
      password: 'securepass123',
      phone: '+905551234567',
    });
    expect(result.success).toBe(true);
  });
});

describe('ForgotPasswordDTO', () => {
  it('accepts valid email', () => {
    expect(ForgotPasswordDTO.safeParse({ email: 'user@example.com' }).success).toBe(true);
  });

  it('rejects missing email', () => {
    expect(ForgotPasswordDTO.safeParse({}).success).toBe(false);
  });
});

describe('ResetPasswordDTO', () => {
  it('accepts valid reset data', () => {
    const result = ResetPasswordDTO.safeParse({
      email: 'user@example.com',
      resetToken: 'abc123token',
      newPassword: 'newpassword123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects new password shorter than 8 chars', () => {
    const result = ResetPasswordDTO.safeParse({
      email: 'user@example.com',
      resetToken: 'abc123token',
      newPassword: 'short',
    });
    expect(result.success).toBe(false);
  });
});
