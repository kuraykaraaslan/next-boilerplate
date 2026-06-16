import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type ExportJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
export type ExportFormat = 'JSON' | 'NDJSON' | 'CSV' | 'XML';

/**
 * Async tenant data-export job (GDPR data portability). Tracks lifecycle from
 * request → completion, the resulting S3 object + signed URL, integrity
 * checksum, and an expiry after which the artifact is auto-deleted.
 */
@Entity('tenant_export_jobs')
export class TenantExportJob {
  @PrimaryGeneratedColumn('uuid', { name: 'exportJobId' })
  exportJobId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ nullable: true, type: 'uuid' })
  requestedByUserId?: string | null;

  @Index()
  @Column({ type: 'varchar', default: 'PENDING' })
  status!: ExportJobStatus;

  @Column({ type: 'varchar', default: 'JSON' })
  format!: ExportFormat;

  @Column({ type: 'boolean', default: false })
  redacted!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  collections?: string[] | null;

  /** Delivery email for the signed download link (optional). */
  @Column({ nullable: true, type: 'varchar' })
  deliverToEmail?: string | null;

  // Result.
  @Column({ nullable: true, type: 'varchar' })
  storageKey?: string | null;

  @Column({ nullable: true, type: 'text' })
  downloadUrl?: string | null;

  @Column({ nullable: true, type: 'int' })
  sizeBytes?: number | null;

  @Column({ nullable: true, type: 'varchar' })
  sha256?: string | null;

  @Column({ nullable: true, type: 'text' })
  error?: string | null;

  @Index()
  @Column({ nullable: true, type: 'timestamp' })
  expiresAt?: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  completedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
