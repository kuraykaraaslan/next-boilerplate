import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import StorageService from '@kuraykaraaslan/storage/server/storage.service';
import { UploadedFile } from '@kuraykaraaslan/storage/server/entities/uploaded_file.entity';
import type { UploadOrigin } from '@kuraykaraaslan/storage/server/storage.dto';
import DriveCrudService from './drive.crud.service';
import { DRIVE_STORAGE_FOLDER } from './drive.enums';
import type { DriveNode } from './drive.types';

/**
 * Bridges an incoming browser upload into Drive: pushes the bytes through
 * {@link StorageService} (which validates, scans, and writes the audit row),
 * then records a `drive_files` overlay pointing at the resulting object. The
 * authoritative content MIME / size are read back from the UploadedFile row so
 * Drive never trusts the client's headers.
 */
export default class DriveUploadService {
  static async upload(
    tenantId: string,
    ownerUserId: string,
    file: File,
    parentId: string | null,
    origin?: UploadOrigin,
  ): Promise<DriveNode> {
    const result = await StorageService.uploadFile(tenantId, {
      file,
      folder: DRIVE_STORAGE_FOLDER,
      userId: ownerUserId,
      origin,
    });

    let mimeType: string | null = file.type || null;
    let size: number | null = result.size ?? null;

    if (result.uploadedFileId) {
      const ds = await tenantDataSourceFor(tenantId);
      const row = await ds
        .getRepository(UploadedFile)
        .findOne({ where: { tenantId, uploadedFileId: result.uploadedFileId } });
      if (row) {
        mimeType = row.mimeType ?? mimeType;
        size = row.size != null ? Number(row.size) : size;
      }
    }

    return DriveCrudService.registerFile(tenantId, ownerUserId, {
      name: file.name,
      parentId: parentId ?? null,
      uploadedFileId: result.uploadedFileId ?? null,
      storageKey: result.key,
      mimeType,
      size,
    });
  }
}
