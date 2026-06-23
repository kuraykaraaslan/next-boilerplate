import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('goods_receipt_lines')
export class GoodsReceiptLine {
  @PrimaryGeneratedColumn('uuid', { name: 'lineId' })
  lineId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  receiptId!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  purchaseOrderLineId?: string

  @Column({ type: 'int', default: 0 })
  quantity!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
