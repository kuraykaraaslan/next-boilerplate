import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('inventory_stock_items')
export class InventoryStockItem {
  @PrimaryGeneratedColumn('uuid', { name: 'stockItemId' })
  stockItemId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  warehouseId!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  locationId?: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  productId?: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  variantId?: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  uomId?: string

  @Column({ type: 'varchar' })
  sku!: string

  @Column({ type: 'int', default: 0 })
  quantity!: number

  @Column({ type: 'int', default: 0 })
  reserved!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
