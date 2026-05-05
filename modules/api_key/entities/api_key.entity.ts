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

  // First 12 chars of raw key for display (e.g. "sk_live_ab12")
  @Column({ type: 'varchar' })
  keyPrefix!: string;

  // JSON array of scope strings: ["read", "write", "admin"]
  @Column({ type: 'simple-array', default: '' })
  scopes!: string[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
