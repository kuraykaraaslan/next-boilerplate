import { describe, it, expect } from 'vitest';
import {
  GenerateAuthUrlDTO,
  HandleCallbackDTO,
  AuthenticateOrRegisterDTO,
  LinkAccountDTO,
  UnlinkAccountDTO,
} from './auth_sso.dto';

describe('GenerateAuthUrlDTO', () => {
  it('accepts valid provider with state', () => {
    const result = GenerateAuthUrlDTO.safeParse({ provider: 'google', state: 'some-state' });
    expect(result.success).toBe(true);
  });

  it('accepts null state', () => {
    const result = GenerateAuthUrlDTO.safeParse({ provider: 'github', state: null });
    expect(result.success).toBe(true);
  });

  it('rejects invalid provider', () => {
    const result = GenerateAuthUrlDTO.safeParse({ provider: 'instagram', state: null });
    expect(result.success).toBe(false);
  });

  it('rejects missing provider', () => {
    const result = GenerateAuthUrlDTO.safeParse({ state: 'some-state' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid SSO providers', () => {
    const providers = ['google', 'apple', 'facebook', 'github', 'linkedin', 'microsoft', 'twitter', 'slack', 'tiktok', 'wechat', 'autodesk'];
    for (const provider of providers) {
      expect(GenerateAuthUrlDTO.safeParse({ provider, state: null }).success).toBe(true);
    }
  });
});

describe('HandleCallbackDTO', () => {
  it('accepts valid provider and code', () => {
    const result = HandleCallbackDTO.safeParse({ provider: 'google', code: 'auth-code-123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty code', () => {
    const result = HandleCallbackDTO.safeParse({ provider: 'google', code: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing code', () => {
    const result = HandleCallbackDTO.safeParse({ provider: 'google' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid provider', () => {
    const result = HandleCallbackDTO.safeParse({ provider: 'unsupported', code: 'code123' });
    expect(result.success).toBe(false);
  });
});

describe('AuthenticateOrRegisterDTO', () => {
  it('accepts valid provider and code', () => {
    const result = AuthenticateOrRegisterDTO.safeParse({ provider: 'github', code: 'code-xyz' });
    expect(result.success).toBe(true);
  });

  it('rejects empty code', () => {
    const result = AuthenticateOrRegisterDTO.safeParse({ provider: 'github', code: '' });
    expect(result.success).toBe(false);
  });
});

describe('LinkAccountDTO', () => {
  it('accepts valid provider and code', () => {
    const result = LinkAccountDTO.safeParse({ provider: 'microsoft', code: 'link-code' });
    expect(result.success).toBe(true);
  });

  it('rejects when code is missing', () => {
    const result = LinkAccountDTO.safeParse({ provider: 'microsoft' });
    expect(result.success).toBe(false);
  });
});

describe('UnlinkAccountDTO', () => {
  it('accepts valid provider', () => {
    const result = UnlinkAccountDTO.safeParse({ provider: 'linkedin' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid provider', () => {
    const result = UnlinkAccountDTO.safeParse({ provider: 'unknown-provider' });
    expect(result.success).toBe(false);
  });

  it('rejects missing provider', () => {
    const result = UnlinkAccountDTO.safeParse({});
    expect(result.success).toBe(false);
  });
});
