import { describe, it, expect } from 'vitest';
import { CreateAuditLogDTO, GetAuditLogsDTO } from './audit_log.dto';

describe('CreateAuditLogDTO', () => {
  it('accepts minimal valid input (action only)', () => {
    const result = CreateAuditLogDTO.safeParse({ action: 'auth.login' });
    expect(result.success).toBe(true);
  });

  it('defaults actorType to SYSTEM when omitted', () => {
    const result = CreateAuditLogDTO.safeParse({ action: 'user.created' });
    if (result.success) {
      expect(result.data.actorType).toBe('SYSTEM');
    }
  });

  it('accepts USER as actorType', () => {
    const result = CreateAuditLogDTO.safeParse({
      actorType: 'USER',
      actorId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'auth.login',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty action string', () => {
    const result = CreateAuditLogDTO.safeParse({ action: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing action', () => {
    const result = CreateAuditLogDTO.safeParse({ actorType: 'USER' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid actorType', () => {
    const result = CreateAuditLogDTO.safeParse({ action: 'auth.login', actorType: 'BOT' });
    expect(result.success).toBe(false);
  });

  it('accepts all optional fields when provided', () => {
    const result = CreateAuditLogDTO.safeParse({
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      actorId: '660e8400-e29b-41d4-a716-446655440001',
      actorType: 'USER',
      action: 'settings.updated',
      resourceType: 'Setting',
      resourceId: 'site_name',
      metadata: { oldValue: 'foo', newValue: 'bar' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for tenantId', () => {
    const result = CreateAuditLogDTO.safeParse({ action: 'auth.login', tenantId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for actorId', () => {
    const result = CreateAuditLogDTO.safeParse({ action: 'auth.login', actorId: 'bad-id' });
    expect(result.success).toBe(false);
  });
});

describe('GetAuditLogsDTO', () => {
  it('accepts empty object and applies defaults', () => {
    const result = GetAuditLogsDTO.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('accepts valid tenantId filter', () => {
    const result = GetAuditLogsDTO.safeParse({ tenantId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('accepts action string filter', () => {
    const result = GetAuditLogsDTO.safeParse({ action: 'auth.login' });
    expect(result.success).toBe(true);
  });

  it('rejects page less than 1', () => {
    const result = GetAuditLogsDTO.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects pageSize greater than 100', () => {
    const result = GetAuditLogsDTO.safeParse({ pageSize: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for tenantId', () => {
    const result = GetAuditLogsDTO.safeParse({ tenantId: 'bad-uuid' });
    expect(result.success).toBe(false);
  });
});
