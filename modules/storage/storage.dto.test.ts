import { describe, it, expect } from 'vitest';
import {
  UploadFileDTOSchema,
  UploadFromUrlDTOSchema,
  DeleteFileDTOSchema,
  GetFileUrlDTOSchema,
} from './storage.dto';

describe('UploadFileDTOSchema', () => {
  it('accepts a valid File with required field', () => {
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    const result = UploadFileDTOSchema.safeParse({ file });
    expect(result.success).toBe(true);
  });

  it('accepts full optional fields', () => {
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    const result = UploadFileDTOSchema.safeParse({
      file,
      folder: 'images',
      filename: 'custom-name.jpg',
      provider: 'aws-s3',
      tenantId: 'tenant-123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when file is missing', () => {
    const result = UploadFileDTOSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid provider value', () => {
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    const result = UploadFileDTOSchema.safeParse({ file, provider: 'invalid-provider' });
    expect(result.success).toBe(false);
  });
});

describe('UploadFromUrlDTOSchema', () => {
  it('accepts a valid URL', () => {
    const result = UploadFromUrlDTOSchema.safeParse({ url: 'https://example.com/image.jpg' });
    expect(result.success).toBe(true);
  });

  it('accepts all optional fields', () => {
    const result = UploadFromUrlDTOSchema.safeParse({
      url: 'https://example.com/image.jpg',
      folder: 'images',
      filename: 'my-image.jpg',
      provider: 'cloudflare-r2',
      tenantId: 'tenant-456',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when url is missing', () => {
    const result = UploadFromUrlDTOSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid storage provider', () => {
    const result = UploadFromUrlDTOSchema.safeParse({
      url: 'https://example.com/image.jpg',
      provider: 'azure-blob',
    });
    expect(result.success).toBe(false);
  });
});

describe('DeleteFileDTOSchema', () => {
  it('accepts a valid key', () => {
    const result = DeleteFileDTOSchema.safeParse({ key: 'tenant-1/images/photo.jpg' });
    expect(result.success).toBe(true);
  });

  it('accepts with optional provider', () => {
    const result = DeleteFileDTOSchema.safeParse({
      key: 'tenant-1/images/photo.jpg',
      provider: 'minio',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when key is missing', () => {
    const result = DeleteFileDTOSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('GetFileUrlDTOSchema', () => {
  it('accepts a valid key', () => {
    const result = GetFileUrlDTOSchema.safeParse({ key: 'tenant-1/users/avatar.png' });
    expect(result.success).toBe(true);
  });

  it('accepts with optional provider and tenantId', () => {
    const result = GetFileUrlDTOSchema.safeParse({
      key: 'tenant-1/users/avatar.png',
      provider: 'digitalocean-spaces',
      tenantId: 'tenant-1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when key is missing', () => {
    const result = GetFileUrlDTOSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
