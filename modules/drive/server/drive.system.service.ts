import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { UploadedFile } from '@kuraykaraaslan/storage/server/entities/uploaded_file.entity';
import { DriveFile } from './entities/drive_file.entity';
import DriveCrudService from './drive.crud.service';
import type { DriveSystemFile, DriveNode } from './drive.types';
import DriveMessages from './drive.messages';

/** Object key shape is `${tenantId}/${folder}/${name}`; pull the parts out. */
function keyParts(key: string): { name: string; source: string | null } {
  const segs = key.split('/').filter(Boolean);
  const name = segs[segs.length - 1] ?? key;
  const source = segs.length >= 2 ? segs[1] : null; // the folder segment
  return { name, source };
}

/**
 * Read-only "Common / System Files" view: every storage object the tenant owns,
 * including files uploaded by other modules (avatars, invoices, gallery, …),
 * surfaced so an admin sees everything in one place. Admin/owner only — callers
 * must gate on tenant role before invoking. Nothing here mutates storage.
 */
export default class DriveSystemService {
  static async listSystemFiles(
    tenantId: string,
    page = 1,
    pageSize = 100,
  ): Promise<{ files: DriveSystemFile[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const [rows, total] = await ds.getRepository(UploadedFile).findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Mark objects that already have a Drive overlay so the UI can hide "adopt".
    const ids = rows.map((r) => r.uploadedFileId);
    const adopted = ids.length
      ? new Set(
          (
            await ds.getRepository(DriveFile).find({
              where: { tenantId, uploadedFileId: In(ids) },
              select: { uploadedFileId: true },
            })
          )
            .map((d) => d.uploadedFileId)
            .filter((v): v is string => v != null),
        )
      : new Set<string>();

    const files: DriveSystemFile[] = rows.map((r) => {
      const { name, source } = keyParts(r.key);
      return {
        uploadedFileId: r.uploadedFileId,
        name,
        storageKey: r.key,
        mimeType: r.mimeType ?? null,
        size: r.size != null ? Number(r.size) : null,
        source,
        createdAt: r.createdAt,
        adopted: adopted.has(r.uploadedFileId),
      };
    });
    return { files, total };
  }

  /**
   * Adopt an existing storage object into Drive as a managed file (a reference,
   * not a copy — the bytes are shared). Lets an admin pull e.g. an exported
   * archive into a Drive folder to share or organize it.
   */
  static async adopt(
    tenantId: string,
    ownerUserId: string,
    uploadedFileId: string,
    parentId: string | null,
  ): Promise<DriveNode> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(UploadedFile).findOne({ where: { tenantId, uploadedFileId } });
    if (!row) throw new AppError(DriveMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const { name } = keyParts(row.key);
    return DriveCrudService.registerFile(tenantId, ownerUserId, {
      name,
      parentId: parentId ?? null,
      uploadedFileId: row.uploadedFileId,
      storageKey: row.key,
      mimeType: row.mimeType ?? null,
      size: row.size != null ? Number(row.size) : null,
    });
  }
}
