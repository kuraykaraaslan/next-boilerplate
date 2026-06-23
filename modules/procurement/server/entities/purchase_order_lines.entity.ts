import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('purchase_order_lines')
export class PurchaseOrderLine {
  @PrimaryGeneratedColumn('uuid', { name: 'lineId' })
  lineId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  purchaseOrderId!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  productId?: string

  @Column({ type: 'varchar' })
  description!: string

  @Column({ type: 'int', default: 0 })
  quantity!: number

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  unitPrice!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
