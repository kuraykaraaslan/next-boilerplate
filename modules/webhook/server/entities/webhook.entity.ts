import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn('uuid', { name: 'webhookId' })
  webhookId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  createdByUserId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text' })
  url!: string;

  // HMAC-SHA256 signing secret — never expose to clients
  @Column({ type: 'varchar' })
  secret!: string;

  // Previous secret kept valid during a rotation window so receivers have time
  // to swap. Cleared once `previousSecretExpiresAt` passes. Outgoing requests
  // carry both `X-Webhook-Signature` and (when set) `X-Webhook-Signature-Prev`.
  @Column({ type: 'varchar', nullable: true })
  previousSecret!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  previousSecretExpiresAt!: Date | null;

  // JSON array of subscribed event types
  @Column({ type: 'simple-array' })
  events!: string[];

  // Extra HTTP headers merged into every delivery request. Reserved headers
  // (Content-Type, X-Webhook-*, User-Agent) are stripped before sending.
  @Column({ type: 'jsonb', nullable: true })
  headers!: Record<string, string> | null;

  // Optional per-event payload filters: { '<event>': { '<dot.path>': value } }.
  // A delivery is skipped when the envelope's data does not match the filter for
  // its event. Events with no filter entry always deliver.
  @Column({ type: 'jsonb', nullable: true })
  eventFilters!: Record<string, Record<string, unknown>> | null;

  // Free-form labels for organising endpoints in the admin UI.
  @Column({ type: 'simple-array', nullable: true })
  tags!: string[] | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // Circuit breaker: consecutive terminal delivery failures. Reset to 0 on any
  // success; when it crosses the configured threshold the endpoint is
  // auto-disabled (isActive=false, autoDisabledAt set).
  @Column({ type: 'int', default: 0 })
  consecutiveFailures!: number;

  @Column({ type: 'timestamp', nullable: true })
  autoDisabledAt!: Date | null;

  // SSRF override: when set, the destination host must resolve into one of these
  // IPs/CIDRs (otherwise private/loopback ranges are blocked by default).
  @Column({ type: 'jsonb', nullable: true })
  ipAllowlist!: string[] | null;

  // Optional per-endpoint delivery rate limit (deliveries/minute). Null = unlimited.
  @Column({ type: 'int', nullable: true })
  rateLimitPerMinute!: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
