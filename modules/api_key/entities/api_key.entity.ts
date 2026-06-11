import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid', { name: 'apiKeyId' })
  apiKeyId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  createdByUserId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // SHA-256 hash of the raw key — never store the raw key
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  keyHash!: string;

  // JSON array of scope strings: ["read", "write", "admin"]
  @Column({ type: 'simple-array', default: '' })
  scopes!: string[];

  // Environment namespace baked into the raw-key prefix: `live` → `sk_live_…`,
  // `test` → `sk_test_…`. Lets a tenant keep dev/staging/prod keys distinct and
  // prevents accidental cross-environment reuse.
  @Column({ type: 'varchar', default: 'live' })
  keyEnv!: string;

  // CIDR / IP allowlist for this key. Empty = no per-key restriction (the
  // tenant-wide default allowlist, if any, still applies).
  @Column({ type: 'simple-array', default: '' })
  ipAllowlist!: string[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt!: Date | null;

  // Last source IP observed on a successful verify — feeds anomaly detection.
  @Column({ type: 'varchar', nullable: true })
  lastUsedIp!: string | null;

  // Monotonic counter of successful verifications. Lets admins spot stale keys
  // and report on per-key activity beyond "was it used recently".
  @Column({ type: 'integer', default: 0 })
  usageCount!: number;

  // Successor key minted by a rotation. Set on the OLD key so consumers can
  // discover the replacement during the grace window.
  @Column({ type: 'uuid', nullable: true })
  successorKeyId!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
