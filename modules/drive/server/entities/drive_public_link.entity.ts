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
 * A "anyone with the link" public share for a Drive node. Access is granted by
 * possession of the unguessable `token` (no login required); the link can carry
 * a `viewer` or `editor` role and an optional `expiresAt`. Revoking a link
 * soft-deletes it so the token can never be reused.
 */
@Entity('drive_public_links')
@Index('idx_drive_public_link_tenant_file', ['tenantId', 'driveFileId'])
export class DrivePublicLink {
  @PrimaryGeneratedColumn('uuid', { name: 'drivePublicLinkId' })
  drivePublicLinkId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  driveFileId!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  token!: string;

  // 'viewer' | 'editor'
  @Column({ type: 'varchar', length: 16, default: 'viewer' })
  role!: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
