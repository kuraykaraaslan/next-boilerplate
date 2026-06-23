import { z } from 'zod';
import { DrivePublicRoleSchema, DriveRoleSchema } from './drive.enums';

export const ListDriveDTO = z.object({
  // null/absent → root level.
  parentId: z.string().uuid().nullable().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),
});
export type ListDriveInput = z.infer<typeof ListDriveDTO>;

export const CreateFolderDTO = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().nullable().optional(),
});
export type CreateFolderInput = z.infer<typeof CreateFolderDTO>;

export const RenameDTO = z.object({
  name: z.string().min(1).max(255),
});
export type RenameInput = z.infer<typeof RenameDTO>;

export const MoveDTO = z.object({
  parentId: z.string().uuid().nullable(),
});
export type MoveInput = z.infer<typeof MoveDTO>;

// PATCH accepts a rename and/or a move in one call.
export const UpdateNodeDTO = z
  .object({
    name: z.string().min(1).max(255).optional(),
    parentId: z.string().uuid().nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.parentId !== undefined, {
    message: 'Provide a new name and/or a new parentId.',
  });
export type UpdateNodeInput = z.infer<typeof UpdateNodeDTO>;

export const ShareUserDTO = z.object({
  sharedWithUserId: z.string().uuid(),
  role: DriveRoleSchema.default('viewer'),
});
export type ShareUserInput = z.infer<typeof ShareUserDTO>;

export const CreatePublicLinkDTO = z.object({
  role: DrivePublicRoleSchema.default('viewer'),
  // ISO datetime; absent → never expires.
  expiresAt: z.string().datetime().nullable().optional(),
});
export type CreatePublicLinkInput = z.infer<typeof CreatePublicLinkDTO>;

export const ListSystemDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),
});
export type ListSystemInput = z.infer<typeof ListSystemDTO>;

export const AdoptSystemFileDTO = z.object({
  parentId: z.string().uuid().nullable().optional(),
});
export type AdoptSystemFileInput = z.infer<typeof AdoptSystemFileDTO>;
