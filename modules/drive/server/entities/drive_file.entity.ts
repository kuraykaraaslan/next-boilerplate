import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

/**
 * A node in a tenant's Drive tree — either a `folder` (a container) or a `file`
 * (a thin overlay over a `UploadedFile` row from the storage module).
 *
 * The actual bytes live in the tenant's storage bucket; this row carries the
 * Drive-side metadata the storage layer doesn't model: a human name, a parent
 * folder (`parentId`, self-reference), ownership, and a denormalized
 * mime/size copy so listings render without round-tripping to storage.
 *
 * - Files reference their storage object via `uploadedFileId` + `storageKey`
 *   (the key is what `StorageService.getPresignedUrl` / `deleteFile` need).
 * - Folders leave the storage fields null.
 * - `@DeleteDateColumn deletedAt` powers the trash bin: soft-deleted rows are
 *   excluded from normal queries and restored with `repo.restore`.
 */
@Entity('drive_files')
@Index('idx_drive_file_tenant_parent', ['tenantId', 'parentId'])
@Index('idx_drive_file_tenant_owner', ['tenantId', 'ownerUserId'])
export class DriveFile {
  @PrimaryGeneratedColumn('uuid', { name: 'driveFileId' })
  driveFileId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  ownerUserId!: string;

  // Null = root level. Self-reference to another DriveFile of type 'folder'.
  @Index()
  @Column({ type: 'uuid', nullable: true })
  parentId!: string | null;

  // 'file' | 'folder'
  @Column({ type: 'varchar', length: 16 })
  type!: string;

  @Column({ type: 'varchar' })
  name!: string;

  // ── Storage linkage (files only; null for folders) ───────────────────────
  @Column({ type: 'uuid', nullable: true })
  uploadedFileId!: string | null;

  // The storage object key — what presign / delete operate on.
  @Column({ type: 'varchar', nullable: true })
  storageKey!: string | null;

  // Denormalized copy from the UploadedFile row so listings are cheap.
  @Column({ type: 'varchar', nullable: true })
  mimeType!: string | null;

  @Column({ type: 'bigint', nullable: true })
  size!: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
