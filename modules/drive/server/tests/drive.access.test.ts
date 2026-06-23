import { describe, it, expect } from 'vitest';
import { resolveEffectiveRole } from '../drive.policy';
import { roleAtLeast } from '../drive.enums';

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

describe('resolveEffectiveRole', () => {
  it('grants owner to the node owner', () => {
    expect(resolveEffectiveRole({ ownerUserId: OWNER, userId: OWNER })).toBe('owner');
  });

  it('grants owner to tenant ADMIN / OWNER regardless of ownership', () => {
    expect(resolveEffectiveRole({ ownerUserId: OWNER, userId: OTHER, tenantRole: 'ADMIN' })).toBe('owner');
    expect(resolveEffectiveRole({ ownerUserId: OWNER, userId: OTHER, tenantRole: 'OWNER' })).toBe('owner');
  });

  it('falls back to a direct share role for a regular user', () => {
    expect(resolveEffectiveRole({ ownerUserId: OWNER, userId: OTHER, tenantRole: 'USER', shareRole: 'editor' })).toBe('editor');
  });

  it('uses a public-link role when there is no user or share', () => {
    expect(resolveEffectiveRole({ ownerUserId: OWNER, publicRole: 'viewer' })).toBe('viewer');
  });

  it('prefers ownership/admin over a weaker share', () => {
    expect(resolveEffectiveRole({ ownerUserId: OWNER, userId: OWNER, shareRole: 'viewer' })).toBe('owner');
  });

  it('returns null when the caller has no access', () => {
    expect(resolveEffectiveRole({ ownerUserId: OWNER, userId: OTHER, tenantRole: 'USER' })).toBeNull();
  });
});

describe('roleAtLeast', () => {
  it('orders viewer < editor < owner', () => {
    expect(roleAtLeast('viewer', 'viewer')).toBe(true);
    expect(roleAtLeast('viewer', 'editor')).toBe(false);
    expect(roleAtLeast('editor', 'viewer')).toBe(true);
    expect(roleAtLeast('owner', 'owner')).toBe(true);
    expect(roleAtLeast('editor', 'owner')).toBe(false);
    expect(roleAtLeast(null, 'viewer')).toBe(false);
  });
});
