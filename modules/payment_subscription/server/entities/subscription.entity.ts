import 'reflect-metadata'
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm'
import { DEFAULT_CURRENCY } from '@kuraykaraaslan/common'

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid', { name: 'subscriptionId' })
  subscriptionId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  userId?: string

  @Index()
  @Column({ type: 'uuid' })
  planId!: string

  @Index()
  @Column({ type: 'varchar' })
  provider!: string

  @Index()
  @Column({ nullable: true, type: 'varchar' })
  providerSubscriptionId?: string

  @Index()
  @Column({ nullable: true, type: 'varchar' })
  providerCustomerId?: string

  @Index()
  @Column({ type: 'varchar', default: 'TRIALING' })
  status!: string

  @Column({ type: 'varchar', default: 'MONTHLY' })
  billingCycle!: string

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number

  @Column({ type: 'varchar', length: 3, default: DEFAULT_CURRENCY })
  currency!: string

  @Column({ nullable: true, type: 'timestamp' })
  trialEndsAt?: Date

  @Column({ nullable: true, type: 'timestamp' })
  currentPeriodStart?: Date

  @Column({ nullable: true, type: 'timestamp' })
  currentPeriodEnd?: Date

  @Column({ nullable: true, type: 'timestamp' })
  cancelledAt?: Date

  @Column({ nullable: true, type: 'varchar' })
  cancellationReason?: string

  @Column({ type: 'boolean', default: false })
  cancelAtPeriodEnd!: boolean

  @Column({ nullable: true, type: 'timestamp' })
  pausedAt?: Date

  @Column({ nullable: true, type: 'timestamp' })
  pausedUntil?: Date

  @Column({ nullable: true, type: 'int' })
  pastDueCount?: number

  // Accumulated metered/usage units for the current period, keyed by metric.
  // Reset at renewal after the overage is billed.
  @Column({ type: 'jsonb', nullable: true })
  meteredUsage?: Record<string, number>

  @Column({ type: 'jsonb', nullable: true })
  metadata?: unknown

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
