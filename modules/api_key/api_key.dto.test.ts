import { describe, it, expect } from 'vitest';
import { CreateApiKeyDTO, UpdateApiKeyDTO, ListApiKeysDTO } from './api_key.dto';

describe('CreateApiKeyDTO', () => {
  it('accepts valid input with required fields', () => {
    const result = CreateApiKeyDTO.safeParse({
      name: 'My API Key',
      scopes: ['read'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid input with all optional fields', () => {
    const result = CreateApiKeyDTO.safeParse({
      name: 'Full Key',
      description: 'Used for integration',
      scopes: ['read', 'write'],
      expiresAt: new Date(Date.now() + 86400_000).toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = CreateApiKeyDTO.safeParse({ name: '', scopes: ['read'] });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 100 characters', () => {
    const result = CreateApiKeyDTO.safeParse({ name: 'a'.repeat(101), scopes: ['read'] });
    expect(result.success).toBe(false);
  });

  it('rejects description longer than 500 characters', () => {
    const result = CreateApiKeyDTO.safeParse({
      name: 'Key',
      description: 'x'.repeat(501),
      scopes: ['read'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty scopes array', () => {
    const result = CreateApiKeyDTO.safeParse({ name: 'Key', scopes: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid scope value', () => {
    const result = CreateApiKeyDTO.safeParse({ name: 'Key', scopes: ['superuser'] });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = CreateApiKeyDTO.safeParse({ scopes: ['read'] });
    expect(result.success).toBe(false);
  });

  it('rejects missing scopes', () => {
    const result = CreateApiKeyDTO.safeParse({ name: 'Key' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid datetime format for expiresAt', () => {
    const result = CreateApiKeyDTO.safeParse({
      name: 'Key',
      scopes: ['read'],
      expiresAt: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateApiKeyDTO', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = UpdateApiKeyDTO.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid name update', () => {
    const result = UpdateApiKeyDTO.safeParse({ name: 'Renamed Key' });
    expect(result.success).toBe(true);
  });

  it('accepts isActive boolean update', () => {
    const result = UpdateApiKeyDTO.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it('rejects empty name when provided', () => {
    const result = UpdateApiKeyDTO.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 100 characters', () => {
    const result = UpdateApiKeyDTO.safeParse({ name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean isActive', () => {
    const result = UpdateApiKeyDTO.safeParse({ isActive: 'yes' });
    expect(result.success).toBe(false);
  });
});

describe('ListApiKeysDTO', () => {
  it('accepts valid input with required tenantId', () => {
    const result = ListApiKeysDTO.safeParse({ tenantId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('defaults page to 1 and pageSize to 20', () => {
    const result = ListApiKeysDTO.safeParse({ tenantId: '550e8400-e29b-41d4-a716-446655440000' });
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('rejects non-uuid tenantId', () => {
    const result = ListApiKeysDTO.safeParse({ tenantId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects page less than 1', () => {
    const result = ListApiKeysDTO.safeParse({ tenantId: '550e8400-e29b-41d4-a716-446655440000', page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects pageSize greater than 100', () => {
    const result = ListApiKeysDTO.safeParse({ tenantId: '550e8400-e29b-41d4-a716-446655440000', pageSize: 101 });
    expect(result.success).toBe(false);
  });
});
