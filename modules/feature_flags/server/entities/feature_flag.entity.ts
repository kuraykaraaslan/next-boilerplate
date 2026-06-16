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
import type { TargetingRule } from '../feature_flags.types';

/**
 * A tenant-scoped feature flag. The `key` is the stable identifier consumers
 * evaluate against (e.g. `new-checkout`). Evaluation precedence is:
 * per-subject override → first matching targeting rule → percentage rollout.
 * See {@link evaluateFlag}.
 */
@Entity('feature_flags')
@Unique('uq_feature_flags_tenant_key', ['tenantId', 'key'])
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid', { name: 'flagId' })
  flagId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // Stable evaluation key, unique per tenant. Lowercase kebab/snake by convention.
  @Column({ type: 'varchar' })
  key!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // Master switch. When false the flag is off for everyone regardless of rules.
  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  // Percentage [0..100] of subjects the flag is on for once it passes the master
  // switch and no targeting rule matched. Deterministic per (key, subject).
  @Column({ type: 'integer', default: 0 })
  rolloutPercentage!: number;

  // Ordered attribute-based targeting rules; first match wins. JSON array of
  // `{ attribute, operator, values, enabled }`.
  @Column({ type: 'jsonb', nullable: true })
  targetingRules!: TargetingRule[] | null;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
