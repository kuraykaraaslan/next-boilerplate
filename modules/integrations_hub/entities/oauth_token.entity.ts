import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * OAuth tokens for a connected app, encrypted at rest via
 * `@/modules/common/field-encryption` (AES-256-GCM). One row per connected app.
 */
@Entity('integration_oauth_tokens')
export class OAuthToken {
  @PrimaryGeneratedColumn('uuid', { name: 'oauthTokenId' })
  oauthTokenId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  connectedAppId!: string;

  @Column({ type: 'text' })
  accessTokenEnc!: string;

  @Column({ nullable: true, type: 'text' })
  refreshTokenEnc?: string;

  @Column({ nullable: true, type: 'varchar' })
  scope?: string;

  @Column({ nullable: true, type: 'varchar' })
  tokenType?: string;

  @Column({ nullable: true, type: 'timestamp' })
  expiresAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
