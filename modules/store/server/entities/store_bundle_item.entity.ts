import 'reflect-metadata'
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm'

@Unique(['tenantId', 'bundleId', 'productId', 'variantId'])
@Entity('store_bundle_items')
export class StoreBundleItem {
  @PrimaryGeneratedColumn('uuid', { name: 'bundleItemId' })
  bundleItemId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  bundleId!: string

  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ nullable: true, type: 'uuid' })
  variantId?: string

  @Column({ type: 'int', default: 1 })
  quantity!: number

  /** Override item price within the bundle (null = use product/variant base price) */
  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  overridePrice?: number

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
