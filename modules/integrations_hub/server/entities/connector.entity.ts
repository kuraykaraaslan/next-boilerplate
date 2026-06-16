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
 * A per-tenant connector catalog entry — the definition of a third-party
 * integration (Slack, Zapier, HubSpot, …). OAuth client secrets are NEVER
 * stored here; only the name of the setting key that holds them, resolved at
 * runtime via SettingService.
 */
@Unique(['tenantId', 'key'])
@Entity('connectors')
export class Connector {
  @PrimaryGeneratedColumn('uuid', { name: 'connectorId' })
  connectorId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 64 })
  key!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', default: 'other' })
  category!: string;

  @Column({ type: 'varchar' })
  authType!: string;

  @Column({ nullable: true, type: 'varchar' })
  iconUrl?: string;

  @Column({ type: 'boolean', default: true })
  isEnabled!: boolean;

  /** Catalog of trigger keys this connector can emit (maps to webhook events). */
  @Column({ type: 'jsonb', nullable: true })
  triggers?: { key: string; label: string; event: string }[];

  /** Catalog of inbound action keys this connector exposes. */
  @Column({ type: 'jsonb', nullable: true })
  actions?: { key: string; label: string }[];

  @Column({ nullable: true, type: 'varchar' })
  oauthAuthUrl?: string;

  @Column({ nullable: true, type: 'varchar' })
  oauthTokenUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  oauthScopes?: string[];

  /** Setting key holding the OAuth client id. */
  @Column({ nullable: true, type: 'varchar' })
  clientIdSettingKey?: string;

  /** Setting key holding the OAuth client secret. */
  @Column({ nullable: true, type: 'varchar' })
  clientSecretSettingKey?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
