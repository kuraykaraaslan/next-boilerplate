import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * A tenant's live connection to a connector. Outbound triggers route through
 * `webhookId` (a Webhook row); inbound actions authenticate against `apiKeyId`
 * (an ApiKey row). OAuth tokens live in the separate `integration_oauth_tokens`
 * table (encrypted at rest).
 */
@Unique(['tenantId', 'connectorKey', 'externalAccountId'])
@Entity('connected_apps')
export class ConnectedApp {
  @PrimaryGeneratedColumn('uuid', { name: 'connectedAppId' })
  connectedAppId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  connectorKey!: string;

  @Column({ type: 'varchar', default: 'PENDING_AUTH' })
  status!: string;

  @Column({ type: 'uuid' })
  connectedByUserId!: string;

  @Column({ nullable: true, type: 'varchar' })
  externalAccountId?: string;

  @Column({ nullable: true, type: 'varchar' })
  externalAccountName?: string;

  @Column({ nullable: true, type: 'uuid' })
  webhookId?: string;

  @Column({ nullable: true, type: 'uuid' })
  apiKeyId?: string;

  @Column({ type: 'jsonb', nullable: true })
  config?: Record<string, unknown>;

  @Column({ nullable: true, type: 'timestamp' })
  lastSyncAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
