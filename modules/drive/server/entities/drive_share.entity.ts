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
 * Direct (internal) share of a Drive node with another user in the same tenant,
 * carrying a node-scoped role (`viewer` | `editor` | `owner`) independent of the
 * tenant-level role. The owner of the node is implicit and never stored here.
 *
 * Uniqueness of (tenant, file, user) is enforced in the service layer (a revoked
 * share is soft-deleted, so a partial unique index would fight the trash model).
 */
@Entity('drive_shares')
@Index('idx_drive_share_tenant_file', ['tenantId', 'driveFileId'])
@Index('idx_drive_share_tenant_user', ['tenantId', 'sharedWithUserId'])
export class DriveShare {
  @PrimaryGeneratedColumn('uuid', { name: 'driveShareId' })
  driveShareId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  driveFileId!: string;

  @Index()
  @Column({ type: 'uuid' })
  sharedWithUserId!: string;

  // 'viewer' | 'editor' | 'owner'
  @Column({ type: 'varchar', length: 16, default: 'viewer' })
  role!: string;

  @Column({ type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  // Soft-revoke: keep an audit trail of who once had access.
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
