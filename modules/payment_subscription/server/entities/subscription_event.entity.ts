import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

/**
 * Lifecycle audit trail for a subscription. One row per workflow transition
 * (pause / resume / cancel / expire / plan change). Mirrors order_status_events.
 */
@Entity('subscription_events')
export class SubscriptionEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'eventId' })
  eventId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  subscriptionId!: string

  /** Status the subscription moved into, e.g. PAUSED, CANCELLED, EXPIRED. */
  @Column({ type: 'varchar' })
  status!: string

  /** Transition that produced this event, e.g. pause, resume, cancel, expire. */
  @Column({ type: 'varchar' })
  action!: string

  @Column({ type: 'varchar', nullable: true })
  note?: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
