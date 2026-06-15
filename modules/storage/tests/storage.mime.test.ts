import { describe, it, expect } from 'vitest'
import { deriveMimeType, validateUpload, type UploadValidationPolicy } from '../storage.validation'

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])

const policy = (over: Partial<UploadValidationPolicy> = {}): UploadValidationPolicy => ({
  maxBytes: 0,
  allowedExtensions: [],
  allowedMimeTypes: [],
  stripExif: false,
  ...over,
})

describe('deriveMimeType', () => {
  it('maps known extensions to canonical MIME types', () => {
    expect(deriveMimeType('png')).toBe('image/png')
    expect(deriveMimeType('jpg')).toBe('image/jpeg')
    expect(deriveMimeType('pdf')).toBe('application/pdf')
  })

  it('falls back to octet-stream for unknown extensions', () => {
    expect(deriveMimeType('xyz')).toBe('application/octet-stream')
  })
})

describe('validateUpload MIME handling', () => {
  it('returns the content-derived MIME, ignoring the spoofed client header', async () => {
    // Client claims application/pdf, but the bytes (and extension) are PNG.
    const file = new File([PNG_HEADER as unknown as BlobPart], 'image.png', { type: 'application/pdf' })
    const { mimeType, file: out } = await validateUpload(file, policy())
    expect(mimeType).toBe('image/png')
    expect(out.type).toBe('image/png')
  })

  it('rejects a MIME type not in the allowlist', async () => {
    const file = new File([PNG_HEADER as unknown as BlobPart], 'image.png', { type: 'image/png' })
    await expect(
      validateUpload(file, policy({ allowedMimeTypes: ['image/jpeg'] })),
    ).rejects.toThrow(/Invalid MIME type/i)
  })

  it('accepts a MIME type that is in the allowlist', async () => {
    const file = new File([JPEG_HEADER as unknown as BlobPart], 'photo.jpg', { type: 'image/jpeg' })
    const { mimeType } = await validateUpload(file, policy({ allowedMimeTypes: ['image/jpeg', 'image/png'] }))
    expect(mimeType).toBe('image/jpeg')
  })

  it('still rejects content that does not match its extension (magic-byte)', async () => {
    const file = new File([PNG_HEADER as unknown as BlobPart], 'evil.jpg', { type: 'image/jpeg' })
    await expect(validateUpload(file, policy())).rejects.toThrow(/does not match/i)
  })
})
