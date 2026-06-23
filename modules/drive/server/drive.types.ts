import { z } from 'zod';
import { DriveNodeTypeSchema, DriveRoleSchema } from './drive.enums';

/** Safe, client-facing view of a Drive node. */
export const DriveNodeSchema = z.object({
  driveFileId: z.string().uuid(),
  tenantId: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  type: DriveNodeTypeSchema,
  name: z.string(),
  uploadedFileId: z.string().uuid().nullable(),
  storageKey: z.string().nullable(),
  mimeType: z.string().nullable(),
  // bigint columns come back as strings from the driver; coerce to number.
  size: z.coerce.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});
export type DriveNode = z.infer<typeof DriveNodeSchema>;

/** A node returned to the client, annotated with the caller's effective role. */
export const DriveNodeViewSchema = DriveNodeSchema.extend({
  role: DriveRoleSchema,
});
export type DriveNodeView = z.infer<typeof DriveNodeViewSchema>;

/** One hop of a folder breadcrumb (root → … → current). */
export interface DriveBreadcrumb {
  driveFileId: string | null; // null = root
  name: string;
}

/** A read-only entry surfaced from the storage UploadedFile ledger. */
export interface DriveSystemFile {
  uploadedFileId: string;
  name: string;
  storageKey: string;
  mimeType: string | null;
  size: number | null;
  /** Best-effort source hint derived from the key prefix (e.g. 'avatars'). */
  source: string | null;
  createdAt: Date;
  /** True when a drive_files overlay already adopted this object. */
  adopted: boolean;
}

export const DriveShareViewSchema = z.object({
  driveShareId: z.string().uuid(),
  driveFileId: z.string().uuid(),
  sharedWithUserId: z.string().uuid(),
  role: DriveRoleSchema,
  createdAt: z.date(),
});
export type DriveShareView = z.infer<typeof DriveShareViewSchema>;

export const DrivePublicLinkViewSchema = z.object({
  drivePublicLinkId: z.string().uuid(),
  driveFileId: z.string().uuid(),
  token: z.string(),
  role: z.enum(['viewer', 'editor']),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
});
export type DrivePublicLinkView = z.infer<typeof DrivePublicLinkViewSchema>;
