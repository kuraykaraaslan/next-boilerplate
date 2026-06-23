import { z } from 'zod';

/** A Drive node is either a container (folder) or a stored object (file). */
export const DriveNodeTypeSchema = z.enum(['file', 'folder']);
export type DriveNodeType = z.infer<typeof DriveNodeTypeSchema>;

/**
 * Node-scoped access role, ordered viewer < editor < owner.
 * - viewer: read + preview + download
 * - editor: viewer + rename/move/upload into
 * - owner:  editor + delete + manage shares
 */
export const DriveRoleSchema = z.enum(['viewer', 'editor', 'owner']);
export type DriveRole = z.infer<typeof DriveRoleSchema>;

/** Public links may only grant non-destructive roles. */
export const DrivePublicRoleSchema = z.enum(['viewer', 'editor']);
export type DrivePublicRole = z.infer<typeof DrivePublicRoleSchema>;

/** The bucket folder Drive uploads land in (a valid core storage folder). */
export const DRIVE_STORAGE_FOLDER = 'files';

const RANK: Record<DriveRole, number> = { viewer: 1, editor: 2, owner: 3 };

/** True when `role` is at least `min` in the viewer<editor<owner ordering. */
export function roleAtLeast(role: DriveRole | null, min: DriveRole): boolean {
  return role != null && RANK[role] >= RANK[min];
}
