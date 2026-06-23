import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('order_status_events')
export class OrderStatusEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'eventId' })
  eventId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  orderId!: string

  @Column({ type: 'varchar' })
  status!: string

  @Column({ type: 'varchar', nullable: true })
  note?: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
