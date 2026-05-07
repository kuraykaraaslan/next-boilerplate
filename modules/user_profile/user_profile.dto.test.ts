import { describe, it, expect } from 'vitest';
import { UpdateProfileRequestSchema, UpdateSocialLinkItemSchema } from './user_profile.dto';

const validSocialLink = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  platform: 'GITHUB',
  url: 'https://github.com/johndoe',
  order: 0,
};

describe('UpdateSocialLinkItemSchema', () => {
  it('accepts a valid social link item', () => {
    const result = UpdateSocialLinkItemSchema.safeParse(validSocialLink);
    expect(result.success).toBe(true);
  });

  it('accepts a null url', () => {
    const result = UpdateSocialLinkItemSchema.safeParse({ ...validSocialLink, url: null });
    expect(result.success).toBe(true);
  });

  it('rejects a non-UUID id', () => {
    const result = UpdateSocialLinkItemSchema.safeParse({ ...validSocialLink, id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid platform value', () => {
    const result = UpdateSocialLinkItemSchema.safeParse({ ...validSocialLink, platform: 'MYSPACE' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-URL string for url', () => {
    const result = UpdateSocialLinkItemSchema.safeParse({ ...validSocialLink, url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects a negative order value', () => {
    const result = UpdateSocialLinkItemSchema.safeParse({ ...validSocialLink, order: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer order value', () => {
    const result = UpdateSocialLinkItemSchema.safeParse({ ...validSocialLink, order: 1.5 });
    expect(result.success).toBe(false);
  });

  it('accepts order of 0', () => {
    const result = UpdateSocialLinkItemSchema.safeParse({ ...validSocialLink, order: 0 });
    expect(result.success).toBe(true);
  });
});

describe('UpdateProfileRequestSchema', () => {
  it('accepts a fully populated profile update', () => {
    const result = UpdateProfileRequestSchema.safeParse({
      name: 'John Doe',
      biography: 'Software engineer',
      profilePicture: 'https://example.com/pic.jpg',
      headerImage: 'https://example.com/header.jpg',
      socialLinks: [validSocialLink],
    });
    expect(result.success).toBe(true);
  });

  it('accepts all null fields', () => {
    const result = UpdateProfileRequestSchema.safeParse({
      name: null,
      biography: null,
      profilePicture: null,
      headerImage: null,
      socialLinks: null,
    });
    expect(result.success).toBe(true);
  });

  it('transforms null socialLinks to empty array', () => {
    const result = UpdateProfileRequestSchema.safeParse({
      name: null,
      biography: null,
      profilePicture: null,
      headerImage: null,
      socialLinks: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.socialLinks).toEqual([]);
    }
  });

  it('accepts multiple social links with different platforms', () => {
    const result = UpdateProfileRequestSchema.safeParse({
      name: 'Jane',
      biography: null,
      profilePicture: null,
      headerImage: null,
      socialLinks: [
        { ...validSocialLink, platform: 'GITHUB' },
        { ...validSocialLink, id: '550e8400-e29b-41d4-a716-446655440001', platform: 'LINKEDIN', url: 'https://linkedin.com/in/jane', order: 1 },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.socialLinks).toHaveLength(2);
    }
  });

  it('rejects socialLinks containing an invalid link item', () => {
    const result = UpdateProfileRequestSchema.safeParse({
      name: null,
      biography: null,
      profilePicture: null,
      headerImage: null,
      socialLinks: [{ ...validSocialLink, platform: 'INVALID_PLATFORM' }],
    });
    expect(result.success).toBe(false);
  });
});
