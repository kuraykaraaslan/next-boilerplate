import 'reflect-metadata';
import { IsNull } from 'typeorm';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { DriveFile } from './entities/drive_file.entity';
import { DriveShare } from './entities/drive_share.entity';
import { DriveRole, roleAtLeast } from './drive.enums';
import { resolveEffectiveRole, type TenantRole } from './drive.policy';
import DriveMessages from './drive.messages';

// Pure access resolution lives in drive.policy (dependency-free, unit-tested);
// re-exported here so existing callers keep importing it from the service.
export { resolveEffectiveRole, type AccessInputs } from './drive.policy';

/**
 * DB-backed access check for an authenticated user. Walks the node's ancestor
 * chain so a share/ownership on a parent folder cascades to its contents.
 * Throws 404 if the node doesn't exist, 403 if the caller has no access.
 * Returns the node plus the caller's effective role.
 */
export async function authorizeNode(
  tenantId: string,
  driveFileId: string,
  userId: string,
  tenantRole: TenantRole,
  opts: { minRole?: DriveRole; withDeleted?: boolean } = {},
): Promise<{ node: DriveFile; role: DriveRole }> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(DriveFile);
  const shareRepo = ds.getRepository(DriveShare);

  const node = await repo.findOne({
    where: { tenantId, driveFileId },
    withDeleted: opts.withDeleted ?? false,
  });
  if (!node) throw new AppError(DriveMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  // Tenant admins and the owner short-circuit the ancestor walk.
  let role = resolveEffectiveRole({ ownerUserId: node.ownerUserId, userId, tenantRole });

  // Otherwise, look for a direct share on this node or any ancestor folder.
  if (!role) {
    let cursor: DriveFile | null = node;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor.driveFileId)) {
      seen.add(cursor.driveFileId);
      const share = await shareRepo.findOne({
        where: { tenantId, driveFileId: cursor.driveFileId, sharedWithUserId: userId, deletedAt: IsNull() },
      });
      if (share) {
        role = share.role as DriveRole;
        break;
      }
      if (cursor.ownerUserId === userId) {
        role = 'owner';
        break;
      }
      cursor = cursor.parentId
        ? await repo.findOne({ where: { tenantId, driveFileId: cursor.parentId } })
        : null;
    }
  }

  if (!role) throw new AppError(DriveMessages.FORBIDDEN, 403, ErrorCode.FORBIDDEN);
  if (opts.minRole && !roleAtLeast(role, opts.minRole)) {
    throw new AppError(
      opts.minRole === 'owner' ? DriveMessages.FORBIDDEN_MANAGE : DriveMessages.FORBIDDEN,
      403,
      ErrorCode.FORBIDDEN,
    );
  }
  return { node, role };
}
