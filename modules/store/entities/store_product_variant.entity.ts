import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

/**
 * A specific combination of variation options for a product.
 * e.g. "Red + L" or "Blue + S + Cotton".
 * selectedOptions is the ordered list of optionIds that form this variant.
 */
@Entity('store_product_variants')
export class StoreProductVariant {
  @PrimaryGeneratedColumn('uuid', { name: 'variantId' })
  variantId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  /** Ordered array of optionIds that define this variant */
  @Column({ type: 'jsonb' })
  optionIds!: string[]

  @Column({ nullable: true, type: 'varchar' })
  sku?: string

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  price?: number

  @Column({ nullable: true, type: 'int' })
  stockQuantity?: number

  @Column({ nullable: true, type: 'decimal', precision: 8, scale: 3, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  weight?: number

  @Column({ nullable: true, type: 'varchar' })
  imageUrl?: string

  @Index()
  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
