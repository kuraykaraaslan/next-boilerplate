import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

/**
 * Persistent audit row for every successful upload through StorageService.
 *
 * - Created by `StorageService.uploadFile` / `uploadFromUrl` after the
 *   provider returns a successful `ProviderUploadResult`.
 * - Soft-deleted by `StorageService.deleteFile` (we keep the row for audit;
 *   the bytes are gone from the S3-compatible bucket).
 * - Joined with `TenantUsage.storageBytes` for billing / quota.
 */
@Entity('uploaded_files')
export class UploadedFile {
  @PrimaryGeneratedColumn('uuid', { name: 'uploadedFileId' })
  uploadedFileId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  userId?: string;

  @Index()
  @Column({ type: 'varchar' })
  key!: string; // S3 / R2 / Spaces / MinIO object key

  @Column({ type: 'varchar' })
  bucket!: string;

  @Column({ type: 'varchar' })
  provider!: string; // aws-s3, cloudflare-r2, digitalocean-spaces, minio

  @Column({ type: 'bigint' })
  size!: number;

  @Column({ type: 'varchar' })
  mimeType!: string;

  @Column({ nullable: true, type: 'varchar' })
  url?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
