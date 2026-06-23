import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid', { name: 'purchaseOrderId' })
  purchaseOrderId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  supplierId!: string

  @Column({ type: 'varchar' })
  number!: string

  @Column({ type: 'varchar' })
  status!: string

  @Column({ type: 'varchar', nullable: true })
  currency?: string

  @Column({ type: 'varchar', nullable: true })
  reference?: string

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total!: number

  @Column({ type: 'timestamp', nullable: true })
  orderedAt?: Date

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
