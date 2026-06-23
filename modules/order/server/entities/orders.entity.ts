import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid', { name: 'orderId' })
  orderId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  number!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  customerId?: string

  @Column({ type: 'varchar' })
  status!: string

  @Column({ type: 'varchar', nullable: true })
  currency?: string

  @Column({ type: 'varchar', nullable: true })
  reference?: string

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  total!: number

  @Column({ type: 'timestamp', nullable: true })
  placedAt?: Date

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
