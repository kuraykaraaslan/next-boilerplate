import { describe, it, expect } from 'vitest';
import { CreateFolderDTO, UpdateNodeDTO, ShareUserDTO, CreatePublicLinkDTO } from '../drive.dto';

describe('CreateFolderDTO', () => {
  it('accepts a name with optional parentId', () => {
    expect(CreateFolderDTO.safeParse({ name: 'Docs' }).success).toBe(true);
    expect(
      CreateFolderDTO.safeParse({ name: 'Docs', parentId: '11111111-1111-4111-8111-111111111111' }).success,
    ).toBe(true);
  });
  it('rejects an empty name', () => {
    expect(CreateFolderDTO.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('UpdateNodeDTO', () => {
  it('requires at least a name or a parentId', () => {
    expect(UpdateNodeDTO.safeParse({}).success).toBe(false);
    expect(UpdateNodeDTO.safeParse({ name: 'x' }).success).toBe(true);
    expect(UpdateNodeDTO.safeParse({ parentId: null }).success).toBe(true);
  });
});

describe('ShareUserDTO', () => {
  it('defaults role to viewer', () => {
    const parsed = ShareUserDTO.parse({ sharedWithUserId: '11111111-1111-4111-8111-111111111111' });
    expect(parsed.role).toBe('viewer');
  });
  it('rejects an unknown role', () => {
    expect(
      ShareUserDTO.safeParse({ sharedWithUserId: '11111111-1111-4111-8111-111111111111', role: 'god' }).success,
    ).toBe(false);
  });
});

describe('CreatePublicLinkDTO', () => {
  it('rejects an owner role on a public link', () => {
    expect(CreatePublicLinkDTO.safeParse({ role: 'owner' }).success).toBe(false);
  });
  it('accepts viewer/editor and an ISO expiry', () => {
    expect(CreatePublicLinkDTO.safeParse({ role: 'editor', expiresAt: '2030-01-01T00:00:00.000Z' }).success).toBe(true);
  });
});
