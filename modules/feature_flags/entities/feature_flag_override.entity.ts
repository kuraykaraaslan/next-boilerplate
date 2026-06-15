import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * An explicit per-subject override that short-circuits flag evaluation. A
 * `user` subject pins the flag for one user; a `segment` subject pins it for an
 * attribute segment value the caller supplies in the evaluation context.
 */
@Entity('feature_flag_overrides')
@Unique('uq_ff_override', ['tenantId', 'flagKey', 'subjectType', 'subjectId'])
export class FeatureFlagOverride {
  @PrimaryGeneratedColumn('uuid', { name: 'overrideId' })
  overrideId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'varchar' })
  flagKey!: string;

  // 'user' → matches evaluation context userId; 'segment' → matches the value of
  // context attribute named by subjectId's segment (see evaluateFlag).
  @Column({ type: 'varchar' })
  subjectType!: string;

  @Column({ type: 'varchar' })
  subjectId!: string;

  @Column({ type: 'boolean' })
  enabled!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
