import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * A Plan is the binding between a StoreProduct and a billing recurrence.
 * Price is sourced from the wrapped product (product.basePrice); the plan
 * itself only carries cadence (interval) and trial configuration.
 */
@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid', { name: 'planId' })
  planId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  productId!: string;

  /** DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY */
  @Index()
  @Column({ type: 'varchar' })
  interval!: string;

  @Column({ type: 'int', default: 0 })
  trialDays!: number;

  @Index()
  @Column({ type: 'varchar', default: 'ACTIVE' })
  status!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
