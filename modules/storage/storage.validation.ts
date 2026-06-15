import { AppError, ErrorCode } from '@/modules/common/app-error'
import { STORAGE_MESSAGES } from './storage.messages'

/**
 * Real upload validation — defends against content-type spoofing and oversized
 * or disallowed files BEFORE the bytes reach the bucket. No mock: every check
 * inspects the actual file content (magic bytes), not just the declared type.
 *
 *  1. Size       — enforced against `maxFileSizeMb`.
 *  2. Extension  — enforced against `allowedExtensions`.
 *  3. Magic byte — the file's real signature must be consistent with its
 *                  extension / declared MIME (blocks `evil.exe` renamed to
 *                  `cat.png`).
 *
 * Optionally strips EXIF/metadata from JPEGs (privacy: GPS, device, thumbnails).
 */

export interface UploadValidationPolicy {
  maxBytes: number            // 0 = unlimited
  allowedExtensions: string[] // empty = allow all
  allowedMimeTypes: string[]  // empty = allow all (matched against content-derived MIME)
  stripExif: boolean
}

/** Leading magic-byte signatures keyed by canonical extension. */
const SIGNATURES: Array<{ ext: string; test: (b: Uint8Array) => boolean }> = [
  { ext: 'jpg',  test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png',  test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'gif',  test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  { ext: 'webp', test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
  { ext: 'bmp',  test: (b) => b[0] === 0x42 && b[1] === 0x4d },
  { ext: 'pdf',  test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { ext: 'zip',  test: (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07) },
  { ext: 'gz',   test: (b) => b[0] === 0x1f && b[1] === 0x8b },
  { ext: 'mp4',  test: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 }, // 'ftyp'
  { ext: 'mp3',  test: (b) => (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { ext: 'ico',  test: (b) => b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00 },
]

// Extensions that are plain text / structured text — content sniffing is not
// meaningful, so we accept them on extension + size alone.
const TEXTUAL = new Set(['txt', 'csv', 'json', 'xml', 'svg', 'md', 'html', 'yaml', 'yml'])

// Office/zip-container formats share the ZIP signature.
const ZIP_FAMILY = new Set(['zip', 'docx', 'xlsx', 'pptx', 'odt', 'ods', 'epub'])

/**
 * Canonical MIME type per extension. Used to derive the *real* MIME from the
 * (already magic-byte-validated) extension instead of trusting the client's
 * `file.type` header. Unknown extensions fall back to octet-stream.
 */
const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', avif: 'image/avif', ico: 'image/x-icon',
  svg: 'image/svg+xml',
  pdf: 'application/pdf', zip: 'application/zip', gz: 'application/gzip',
  mp4: 'video/mp4', mp3: 'audio/mpeg',
  txt: 'text/plain', csv: 'text/csv', json: 'application/json', xml: 'application/xml',
  md: 'text/markdown', html: 'text/html', yaml: 'application/x-yaml', yml: 'application/x-yaml',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  epub: 'application/epub+zip',
}

/**
 * Derive the real MIME type from the validated extension. Because
 * `magicConsistent` has already confirmed the bytes match the extension, the
 * extension is a trustworthy (content-grounded) signal — unlike the
 * client-supplied `file.type` header.
 */
export function deriveMimeType(ext: string): string {
  return EXT_MIME[ext] ?? 'application/octet-stream'
}

function extOf(filename: string): string {
  const i = filename.lastIndexOf('.')
  return i === -1 ? '' : filename.slice(i + 1).toLowerCase()
}

/** True when the buffer's magic bytes are consistent with the claimed extension. */
function magicConsistent(ext: string, head: Uint8Array): boolean {
  if (TEXTUAL.has(ext)) return true
  if (ZIP_FAMILY.has(ext)) return SIGNATURES.find((s) => s.ext === 'zip')!.test(head)
  const sig = SIGNATURES.find((s) => s.ext === ext)
  if (!sig) return true // unknown type → no signature to assert (extension allowlist already gates)
  return sig.test(head)
}

/**
 * Strip EXIF / metadata APPn (and COM) segments from a JPEG, keeping image
 * scan data intact. Pure JS, no dependency. Non-JPEG buffers are returned
 * unchanged. Removes GPS location, camera/device info, and thumbnails.
 */
export function stripJpegMetadata(buf: Uint8Array): Uint8Array {
  if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) return buf
  const out: number[] = [0xff, 0xd8] // SOI
  let i = 2
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) break
    const marker = buf[i + 1]
    // Start of Scan — copy the rest verbatim (compressed image data).
    if (marker === 0xda) { for (let j = i; j < buf.length; j++) out.push(buf[j]); break }
    const len = (buf[i + 2] << 8) + buf[i + 3]
    const isMeta = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe // APPn or COM
    if (!isMeta) { for (let j = i; j < i + 2 + len; j++) out.push(buf[j]) }
    i += 2 + len
  }
  return Uint8Array.from(out)
}

/**
 * Validate (and optionally sanitise) an upload. Returns the file to actually
 * store (same instance, or a new one with metadata stripped) plus the *real*
 * content-derived MIME type — never the client-supplied `file.type`.
 */
export async function validateUpload(
  file: File,
  policy: UploadValidationPolicy,
): Promise<{ file: File; mimeType: string }> {
  if (!file || file.size === 0) throw new AppError(STORAGE_MESSAGES.EMPTY_FILE, 422, ErrorCode.VALIDATION_ERROR)

  if (policy.maxBytes > 0 && file.size > policy.maxBytes) {
    throw new AppError(STORAGE_MESSAGES.FILE_TOO_LARGE, 413, ErrorCode.VALIDATION_ERROR)
  }

  const ext = extOf(file.name)
  if (policy.allowedExtensions.length > 0 && ext && !policy.allowedExtensions.includes(ext)) {
    throw new AppError(STORAGE_MESSAGES.EXTENSION_NOT_ALLOWED, 422, ErrorCode.VALIDATION_ERROR)
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const head = bytes.subarray(0, 16)
  if (ext && !magicConsistent(ext, head)) {
    throw new AppError(STORAGE_MESSAGES.MIME_MISMATCH, 422, ErrorCode.VALIDATION_ERROR)
  }

  // Derive the true MIME from the (now content-verified) extension and enforce
  // the tenant's MIME allowlist against it — not against the spoofable header.
  const mimeType = deriveMimeType(ext)
  if (policy.allowedMimeTypes.length > 0 && !policy.allowedMimeTypes.includes(mimeType)) {
    throw new AppError(STORAGE_MESSAGES.INVALID_MIME_TYPE, 422, ErrorCode.VALIDATION_ERROR)
  }

  if (policy.stripExif && (ext === 'jpg' || ext === 'jpeg')) {
    const stripped = stripJpegMetadata(bytes)
    if (stripped.length !== bytes.length) {
      return { file: new File([stripped as unknown as BlobPart], file.name, { type: mimeType }), mimeType }
    }
  }
  // Re-stamp the file with the derived MIME so the provider's ContentType and
  // the audit row both carry the real type rather than the client's header.
  if (file.type !== mimeType) {
    return { file: new File([bytes as unknown as BlobPart], file.name, { type: mimeType }), mimeType }
  }
  return { file, mimeType }
}
