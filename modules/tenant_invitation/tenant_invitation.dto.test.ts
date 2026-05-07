import { describe, it, expect } from 'vitest';
import {
  SendInvitationDTO,
  AcceptInvitationDTO,
  DeclineInvitationDTO,
  GetInvitationsDTO,
} from './tenant_invitation.dto';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('SendInvitationDTO', () => {
  it('accepts valid email with default USER role', () => {
    const result = SendInvitationDTO.safeParse({ email: 'invite@example.com' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.memberRole).toBe('USER');
  });

  it('accepts explicit ADMIN role', () => {
    const result = SendInvitationDTO.safeParse({ email: 'admin@example.com', memberRole: 'ADMIN' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.memberRole).toBe('ADMIN');
  });

  it('accepts OWNER role', () => {
    const result = SendInvitationDTO.safeParse({ email: 'owner@example.com', memberRole: 'OWNER' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const result = SendInvitationDTO.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = SendInvitationDTO.safeParse({ memberRole: 'USER' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid memberRole', () => {
    const result = SendInvitationDTO.safeParse({ email: 'user@example.com', memberRole: 'SUPERUSER' });
    expect(result.success).toBe(false);
  });
});

describe('AcceptInvitationDTO', () => {
  it('accepts a valid non-empty token', () => {
    const result = AcceptInvitationDTO.safeParse({ token: 'abc123validtoken' });
    expect(result.success).toBe(true);
  });

  it('rejects empty token', () => {
    const result = AcceptInvitationDTO.safeParse({ token: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing token', () => {
    const result = AcceptInvitationDTO.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('DeclineInvitationDTO', () => {
  it('accepts a valid non-empty token', () => {
    const result = DeclineInvitationDTO.safeParse({ token: 'declinetoken123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty token', () => {
    const result = DeclineInvitationDTO.safeParse({ token: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing token', () => {
    const result = DeclineInvitationDTO.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('GetInvitationsDTO', () => {
  it('accepts valid tenantId with defaults', () => {
    const result = GetInvitationsDTO.safeParse({ tenantId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it('accepts optional status filter', () => {
    const result = GetInvitationsDTO.safeParse({ tenantId: VALID_UUID, status: 'PENDING' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('PENDING');
  });

  it('accepts null status', () => {
    const result = GetInvitationsDTO.safeParse({ tenantId: VALID_UUID, status: null });
    expect(result.success).toBe(true);
  });

  it('accepts all valid status values', () => {
    for (const status of ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED']) {
      const result = GetInvitationsDTO.safeParse({ tenantId: VALID_UUID, status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status value', () => {
    const result = GetInvitationsDTO.safeParse({ tenantId: VALID_UUID, status: 'CANCELED' });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID tenantId', () => {
    const result = GetInvitationsDTO.safeParse({ tenantId: 'not-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing tenantId', () => {
    const result = GetInvitationsDTO.safeParse({ page: 1 });
    expect(result.success).toBe(false);
  });

  it('accepts explicit page and pageSize', () => {
    const result = GetInvitationsDTO.safeParse({ tenantId: VALID_UUID, page: 2, pageSize: 20 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(20);
    }
  });
});
