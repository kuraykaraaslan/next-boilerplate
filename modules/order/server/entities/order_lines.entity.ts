import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('order_lines')
export class OrderLine {
  @PrimaryGeneratedColumn('uuid', { name: 'lineId' })
  lineId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  orderId!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  productId?: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  variantId?: string

  @Column({ type: 'varchar' })
  description!: string

  @Column({ type: 'int', default: 0 })
  quantity!: number

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  unitPrice!: number

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  amount!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
