import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/libs/typeorm', () => ({
  getSystemDataSource: vi.fn(),
}));

vi.mock('@/libs/redis', () => ({ default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() } }));
vi.mock('@/libs/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { getSystemDataSource } from '@/libs/typeorm';
import UserProfileService from './user_profile.service';

const USER_ID = '00000000-0000-1000-8000-000000000001';
const LINK_ID = '00000000-0000-1000-8000-000000000002';

const mockSocialLink = {
  id: LINK_ID,
  platform: 'GITHUB',
  url: 'https://github.com/johndoe',
  order: 0,
};

const mockProfileEntity = {
  userId: USER_ID,
  name: 'John Doe',
  biography: 'Developer',
  profilePicture: null,
  headerImage: null,
  socialLinks: [mockSocialLink],
};

function clean(obj: any) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function buildRepoMock(overrides: Record<string, any> = {}) {
  const findOne = vi.fn(async () => null);
  const save = vi.fn(async (data: any) => ({ ...mockProfileEntity, ...clean(data) }));
  const create = vi.fn((data: any) => ({ ...mockProfileEntity, ...clean(data) }));
  const update = vi.fn(async () => ({ affected: 1 }));
  const del = vi.fn(async () => undefined);

  const repo = { findOne, save, create, update, delete: del, ...overrides };

  (getSystemDataSource as any).mockResolvedValue({
    getRepository: () => repo,
  });

  return repo;
}

describe('UserProfileService.getByUserId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when profile does not exist', async () => {
    buildRepoMock();
    const result = await UserProfileService.getByUserId('user-1');
    expect(result).toBeNull();
  });

  it('returns parsed profile when found', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(mockProfileEntity);

    const result = await UserProfileService.getByUserId('user-1');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('John Doe');
    expect(result!.socialLinks).toHaveLength(1);
  });
});

describe('UserProfileService.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when profile already exists', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(mockProfileEntity);

    await expect(UserProfileService.create('user-1')).rejects.toThrow(
      'Profile already exists for this user'
    );
  });

  it('creates a profile with default empty socialLinks when no data given', async () => {
    buildRepoMock();

    const result = await UserProfileService.create('user-1');
    expect(result.socialLinks).toBeDefined();
  });

  it('creates a profile with provided name and biography', async () => {
    const repo = buildRepoMock();
    repo.save.mockResolvedValueOnce({ ...mockProfileEntity, name: 'Jane', biography: 'Designer' });

    const result = await UserProfileService.create('user-1', { name: 'Jane', biography: 'Designer' });
    expect(result.name).toBe('Jane');
    expect(result.biography).toBe('Designer');
  });
});

describe('UserProfileService.update', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when profile not found', async () => {
    buildRepoMock();
    await expect(
      UserProfileService.update('user-1', { name: 'Updated Name' })
    ).rejects.toThrow('Profile not found');
  });

  it('returns updated profile after update', async () => {
    const repo = buildRepoMock();
    const updated = { ...mockProfileEntity, name: 'Updated Name' };
    repo.findOne
      .mockResolvedValueOnce(mockProfileEntity)
      .mockResolvedValueOnce(updated);

    const result = await UserProfileService.update('user-1', { name: 'Updated Name' });
    expect(result.name).toBe('Updated Name');
  });
});

describe('UserProfileService.upsert', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates when profile exists', async () => {
    const repo = buildRepoMock();
    const updated = { ...mockProfileEntity, biography: 'Updated bio' };
    repo.findOne
      .mockResolvedValueOnce(mockProfileEntity)
      .mockResolvedValueOnce(updated);

    const result = await UserProfileService.upsert('user-1', { biography: 'Updated bio' });
    expect(result.biography).toBe('Updated bio');
  });

  it('creates when profile does not exist', async () => {
    buildRepoMock();

    const result = await UserProfileService.upsert('user-1', { name: 'New User' });
    expect(result).toBeDefined();
  });
});

describe('UserProfileService.delete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when profile not found', async () => {
    buildRepoMock();
    await expect(UserProfileService.delete('user-1')).rejects.toThrow('Profile not found');
  });

  it('calls delete on repository when profile exists', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(mockProfileEntity);

    await UserProfileService.delete('user-1');
    expect(repo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
  });
});

describe('UserProfileService.addSocialLink', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when profile not found', async () => {
    buildRepoMock();
    await expect(
      UserProfileService.addSocialLink('user-1', mockSocialLink)
    ).rejects.toThrow('Profile not found');
  });

  it('appends the new link and returns updated profile', async () => {
    const repo = buildRepoMock();
    const newLink = { id: '550e8400-e29b-41d4-a716-446655440001', platform: 'LINKEDIN', url: 'https://linkedin.com/in/john', order: 1 };
    const updatedProfile = { ...mockProfileEntity, socialLinks: [mockSocialLink, newLink] };

    repo.findOne
      .mockResolvedValueOnce(mockProfileEntity)
      .mockResolvedValueOnce(updatedProfile);

    const result = await UserProfileService.addSocialLink('user-1', newLink as any);
    expect(result.socialLinks).toHaveLength(2);
  });
});

describe('UserProfileService.removeSocialLink', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when profile not found', async () => {
    buildRepoMock();
    await expect(
      UserProfileService.removeSocialLink('user-1', LINK_ID)
    ).rejects.toThrow('Profile not found');
  });

  it('removes the link and returns updated profile', async () => {
    const repo = buildRepoMock();
    const updatedProfile = { ...mockProfileEntity, socialLinks: [] };

    repo.findOne
      .mockResolvedValueOnce(mockProfileEntity)
      .mockResolvedValueOnce(updatedProfile);

    const result = await UserProfileService.removeSocialLink('user-1', LINK_ID);
    expect(result.socialLinks).toHaveLength(0);
  });
});

describe('UserProfileService.updateSocialLink', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when profile not found', async () => {
    buildRepoMock();
    await expect(
      UserProfileService.updateSocialLink('user-1', LINK_ID, { url: 'https://github.com/new' })
    ).rejects.toThrow('Profile not found');
  });

  it('updates the matching link by id and returns updated profile', async () => {
    const repo = buildRepoMock();
    const updatedLink = { ...mockSocialLink, url: 'https://github.com/new' };
    const updatedProfile = { ...mockProfileEntity, socialLinks: [updatedLink] };

    repo.findOne
      .mockResolvedValueOnce(mockProfileEntity)
      .mockResolvedValueOnce(updatedProfile);

    const result = await UserProfileService.updateSocialLink('user-1', LINK_ID, { url: 'https://github.com/new' });
    expect(result.socialLinks[0].url).toBe('https://github.com/new');
  });
});
