// Pure, dependency-free Drive policy helpers (no DB / storage / env imports) so
// they can be unit-tested in isolation and reused on either side of the stack.

import { DriveRole } from './drive.enums';

/** Tenant-level roles that grant blanket Drive access (admins manage all). */
export type TenantRole = 'OWNER' | 'ADMIN' | 'USER' | string;

export interface AccessInputs {
  ownerUserId: string;
  /** Current user id, or undefined for an anonymous public-link caller. */
  userId?: string;
  /** Caller's tenant-level role (admins/owners get owner access). */
  tenantRole?: TenantRole;
  /** Node-scoped role from a direct share for this user, if any. */
  shareRole?: DriveRole | null;
  /** Role granted by a valid public link, if the caller arrived via one. */
  publicRole?: DriveRole | null;
}

/**
 * Pure access resolution. Precedence: ownership / tenant-admin → direct share →
 * public link. Returns the highest applicable role, or null when the caller has
 * no access at all.
 */
export function resolveEffectiveRole(input: AccessInputs): DriveRole | null {
  if (input.userId && input.userId === input.ownerUserId) return 'owner';
  if (input.tenantRole === 'OWNER' || input.tenantRole === 'ADMIN') return 'owner';
  if (input.shareRole) return input.shareRole;
  if (input.publicRole) return input.publicRole;
  return null;
}

/** Coarse preview kind the UI switches on to pick a renderer. */
export type PreviewKind = 'image' | 'pdf' | 'text' | 'audio' | 'video' | 'none';

/**
 * Classify a content-derived MIME type into a coarse preview kind. Images render
 * in <img>, PDFs in <iframe>, text inline, audio/video natively; everything else
 * is download-only.
 */
export function previewKindFor(mimeType: string | null | undefined): PreviewKind {
  if (!mimeType) return 'none';
  const m = mimeType.toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m === 'application/pdf') return 'pdf';
  if (m.startsWith('audio/')) return 'audio';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('text/') || m === 'application/json' || m === 'application/xml' || m === 'application/x-yaml') {
    return 'text';
  }
  return 'none';
}
