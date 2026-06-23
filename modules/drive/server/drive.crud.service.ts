import 'reflect-metadata';
import { IsNull, Not } from 'typeorm';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import StorageService from '@kuraykaraaslan/storage/server/storage.service';
import { DriveFile } from './entities/drive_file.entity';
import { DriveShare } from './entities/drive_share.entity';
import { DrivePublicLink } from './entities/drive_public_link.entity';
import { DriveNode, DriveNodeSchema, DriveBreadcrumb } from './drive.types';
import DriveMessages from './drive.messages';
import { runLifecycleHooks } from './drive.plugins';

function toNode(row: DriveFile): DriveNode {
  return DriveNodeSchema.parse(row);
}

/**
 * Folder tree + node lifecycle for Drive. Folders are pure `drive_files` rows;
 * files additionally carry a storage object (`storageKey`) whose bytes are
 * managed through {@link StorageService}. Deletion is two-phase: soft-delete to
 * the trash bin (recoverable), then permanent removal (also purges the bytes).
 */
export default class DriveCrudService {
  /** Ensure no live sibling already uses `name` under `parentId`. */
  private static async assertNameFree(
    tenantId: string,
    parentId: string | null,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const clash = await ds.getRepository(DriveFile).findOne({
      where: {
        tenantId,
        parentId: parentId ?? IsNull(),
        name,
        deletedAt: IsNull(),
        ...(excludeId ? { driveFileId: Not(excludeId) } : {}),
      },
    });
    if (clash) throw new AppError(DriveMessages.NAME_TAKEN, 409, ErrorCode.CONFLICT);
  }

  /** Resolve and validate a destination folder (null = root). */
  private static async assertFolderExists(tenantId: string, parentId: string | null): Promise<void> {
    if (!parentId) return;
    const ds = await tenantDataSourceFor(tenantId);
    const parent = await ds.getRepository(DriveFile).findOne({ where: { tenantId, driveFileId: parentId } });
    if (!parent) throw new AppError(DriveMessages.PARENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (parent.type !== 'folder') throw new AppError(DriveMessages.PARENT_NOT_FOLDER, 400, ErrorCode.VALIDATION_ERROR);
  }

  static async getNode(tenantId: string, driveFileId: string, withDeleted = false): Promise<DriveFile> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(DriveFile).findOne({ where: { tenantId, driveFileId }, withDeleted });
    if (!row) throw new AppError(DriveMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return row;
  }

  /** List the direct children of a folder (root when `parentId` is null). */
  static async listChildren(
    tenantId: string,
    parentId: string | null,
    page = 1,
    pageSize = 100,
  ): Promise<{ nodes: DriveNode[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const [rows, total] = await ds.getRepository(DriveFile).findAndCount({
      where: { tenantId, parentId: parentId ?? IsNull() },
      // Folders first, then files; alphabetical within each.
      order: { type: 'ASC', name: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { nodes: rows.map(toNode), total };
  }

  /** List soft-deleted nodes for the trash bin. */
  static async listTrash(tenantId: string, page = 1, pageSize = 100): Promise<{ nodes: DriveNode[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const qb = ds
      .getRepository(DriveFile)
      .createQueryBuilder('f')
      .withDeleted()
      .where('f.tenantId = :tenantId', { tenantId })
      .andWhere('f.deletedAt IS NOT NULL')
      .orderBy('f.deletedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    return { nodes: rows.map(toNode), total };
  }

  /** Root → … → folder breadcrumb trail for the given node (or root). */
  static async breadcrumb(tenantId: string, driveFileId: string | null): Promise<DriveBreadcrumb[]> {
    const trail: DriveBreadcrumb[] = [{ driveFileId: null, name: 'Drive' }];
    if (!driveFileId) return trail;
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(DriveFile);
    const chain: DriveBreadcrumb[] = [];
    let cursor: string | null = driveFileId;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const row: DriveFile | null = await repo.findOne({ where: { tenantId, driveFileId: cursor } });
      if (!row) break;
      chain.unshift({ driveFileId: row.driveFileId, name: row.name });
      cursor = row.parentId;
    }
    return [...trail, ...chain];
  }

  static async createFolder(
    tenantId: string,
    ownerUserId: string,
    name: string,
    parentId: string | null,
  ): Promise<DriveNode> {
    await this.assertFolderExists(tenantId, parentId);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(DriveFile);
    await this.assertNameFree(tenantId, parentId ?? null, name);
    const saved = await repo.save(
      repo.create({
        tenantId,
        ownerUserId,
        parentId: parentId ?? null,
        type: 'folder',
        name,
        uploadedFileId: null,
        storageKey: null,
        mimeType: null,
        size: null,
      }),
    );
    return toNode(saved);
  }

  /**
   * Register an already-uploaded storage object as a Drive file. Called by the
   * upload service after {@link StorageService.uploadFile}, and by "adopt" to
   * pull an existing UploadedFile into Drive.
   */
  static async registerFile(
    tenantId: string,
    ownerUserId: string,
    input: {
      name: string;
      parentId: string | null;
      uploadedFileId: string | null;
      storageKey: string;
      mimeType: string | null;
      size: number | null;
    },
  ): Promise<DriveNode> {
    await this.assertFolderExists(tenantId, input.parentId);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(DriveFile);
    const name = await this.dedupeName(tenantId, input.parentId, input.name);
    const saved = await repo.save(
      repo.create({
        tenantId,
        ownerUserId,
        parentId: input.parentId,
        type: 'file',
        name,
        uploadedFileId: input.uploadedFileId,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        size: input.size,
      }),
    );
    runLifecycleHooks(tenantId, 'onUploaded', { driveFileId: saved.driveFileId, storageKey: input.storageKey });
    return toNode(saved);
  }

  /** Append " (n)" until the name is free in the destination folder. */
  private static async dedupeName(
    tenantId: string,
    parentId: string | null,
    name: string,
  ): Promise<string> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(DriveFile);
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    let candidate = name;
    let n = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const clash = await repo.findOne({
        where: { tenantId, parentId: parentId ?? IsNull(), name: candidate, deletedAt: IsNull() },
      });
      if (!clash) return candidate;
      candidate = `${base} (${n})${ext}`;
      n += 1;
    }
  }

  static async rename(tenantId: string, driveFileId: string, name: string): Promise<DriveNode> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(DriveFile);
    const row = await repo.findOne({ where: { tenantId, driveFileId } });
    if (!row) throw new AppError(DriveMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await this.assertNameFree(tenantId, row.parentId, name, driveFileId);
    row.name = name;
    return toNode(await repo.save(row));
  }

  static async move(tenantId: string, driveFileId: string, newParentId: string | null): Promise<DriveNode> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(DriveFile);
    const row = await repo.findOne({ where: { tenantId, driveFileId } });
    if (!row) throw new AppError(DriveMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await this.assertFolderExists(tenantId, newParentId);

    // Prevent moving a folder into itself or one of its descendants.
    if (row.type === 'folder' && newParentId) {
      if (newParentId === driveFileId) throw new AppError(DriveMessages.CANNOT_MOVE_INTO_SELF, 400, ErrorCode.VALIDATION_ERROR);
      let cursor: string | null = newParentId;
      const seen = new Set<string>();
      while (cursor && !seen.has(cursor)) {
        seen.add(cursor);
        if (cursor === driveFileId) throw new AppError(DriveMessages.CANNOT_MOVE_INTO_SELF, 400, ErrorCode.VALIDATION_ERROR);
        const parent: DriveFile | null = await repo.findOne({ where: { tenantId, driveFileId: cursor } });
        cursor = parent?.parentId ?? null;
      }
    }

    await this.assertNameFree(tenantId, newParentId ?? null, row.name, driveFileId);
    row.parentId = newParentId ?? null;
    const saved = await repo.save(row);
    runLifecycleHooks(tenantId, 'onMoved', { driveFileId, parentId: newParentId });
    return toNode(saved);
  }

  /** Move a node (and, for folders, its whole subtree) to the trash. */
  static async softDelete(tenantId: string, driveFileId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(DriveFile);
    const row = await repo.findOne({ where: { tenantId, driveFileId } });
    if (!row) throw new AppError(DriveMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const ids = await this.collectSubtreeIds(tenantId, driveFileId);
    await repo.softDelete(ids);
    runLifecycleHooks(tenantId, 'onDeleted', { driveFileId, soft: true });
  }

  /** Restore a trashed node back into its (still-existing) parent. */
  static async restore(tenantId: string, driveFileId: string): Promise<DriveNode> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(DriveFile);
    const row = await repo.findOne({ where: { tenantId, driveFileId }, withDeleted: true });
    if (!row) throw new AppError(DriveMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (!row.deletedAt) throw new AppError(DriveMessages.NOT_IN_TRASH, 400, ErrorCode.VALIDATION_ERROR);
    const ids = await this.collectSubtreeIds(tenantId, driveFileId, true);
    await repo.restore(ids);
    const restored = await repo.findOne({ where: { tenantId, driveFileId } });
    return toNode(restored!);
  }

  /**
   * Permanently delete a node and its subtree: purge each file's bytes from
   * storage (best-effort), drop share/public-link rows, then remove the
   * drive_files rows.
   */
  static async hardDelete(tenantId: string, driveFileId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(DriveFile);
    const root = await repo.findOne({ where: { tenantId, driveFileId }, withDeleted: true });
    if (!root) throw new AppError(DriveMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const ids = await this.collectSubtreeIds(tenantId, driveFileId, true);
    const rows = await repo.find({ where: ids.map((id) => ({ tenantId, driveFileId: id })), withDeleted: true });

    for (const node of rows) {
      if (node.type === 'file' && node.storageKey) {
        await StorageService.hardDeleteFile(tenantId, { key: node.storageKey }).catch(() => {});
      }
    }
    await ds.getRepository(DriveShare).delete(ids.map((id) => ({ tenantId, driveFileId: id })));
    await ds.getRepository(DrivePublicLink).delete(ids.map((id) => ({ tenantId, driveFileId: id })));
    await repo.remove(rows);
    runLifecycleHooks(tenantId, 'onDeleted', { driveFileId, soft: false });
  }

  /** Collect a node id plus all descendant folder/file ids (BFS). */
  private static async collectSubtreeIds(
    tenantId: string,
    rootId: string,
    withDeleted = false,
  ): Promise<string[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(DriveFile);
    const ids = [rootId];
    const queue = [rootId];
    while (queue.length) {
      const parentId = queue.shift()!;
      const children = await repo.find({ where: { tenantId, parentId }, withDeleted });
      for (const c of children) {
        ids.push(c.driveFileId);
        if (c.type === 'folder') queue.push(c.driveFileId);
      }
    }
    return ids;
  }
}
