import { z } from 'zod'

// ============================================================================
// MIME groups
// ----------------------------------------------------------------------------
// Tenants don't think in raw MIME strings — they think "allow images and
// documents". A group is a human-pickable bucket that expands to the concrete
// MIME types it covers. The per-tenant `allowedMimeGroups` setting stores the
// selected group keys; `expandMimeGroups` turns them into the flat allowlist
// consumed by `validateUpload`. `allowedMimeTypes` remains available for
// fine-grained, one-off additions on top of the chosen groups.
// ============================================================================

export const MimeGroupSchema = z.enum([
  'images',
  'documents',
  'spreadsheets',
  'presentations',
  'archives',
  'audio',
  'video',
  'data',
])
export type MimeGroup = z.infer<typeof MimeGroupSchema>
export const MIME_GROUPS = MimeGroupSchema.options

/**
 * Group → concrete MIME types. Kept in sync with what `deriveMimeType`
 * (storage.validation.ts) can actually produce from file content; listing a
 * MIME here that content-sniffing never yields just means it can never match.
 */
export const MIME_GROUP_TYPES: Record<MimeGroup, string[]> = {
  images: [
    'image/jpeg', 'image/png', 'image/webp', 'image/avif',
    'image/gif', 'image/bmp', 'image/x-icon', 'image/svg+xml',
  ],
  documents: [
    'application/pdf', 'text/plain', 'text/markdown', 'text/html',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text', 'application/epub+zip',
  ],
  spreadsheets: [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
  ],
  presentations: [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  archives: ['application/zip', 'application/gzip'],
  audio: ['audio/mpeg'],
  video: ['video/mp4'],
  data: ['application/json', 'application/xml', 'application/x-yaml'],
}

/**
 * Expand selected group keys into the de-duplicated set of MIME types they
 * cover. Unknown group keys are ignored (forward-compatible with UI drift).
 */
export function expandMimeGroups(groups: string[]): string[] {
  const out = new Set<string>()
  for (const g of groups) {
    const key = g.trim().toLowerCase()
    const types = (MIME_GROUP_TYPES as Record<string, string[]>)[key]
    if (types) for (const t of types) out.add(t)
  }
  return [...out]
}
