import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index, Unique,
} from 'typeorm'

/**
 * Membership of a product in a variant group.
 * A product can belong to at most one variant group per tenant.
 * Visibility is symmetric: every product in the group sees every other product.
 */
@Unique(['tenantId', 'productId'])
@Entity('store_variant_group_items')
export class StoreVariantGroupItem {
  @PrimaryGeneratedColumn('uuid', { name: 'itemId' })
  itemId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  variantGroupId!: string

  @Column({ type: 'uuid' })
  productId!: string

  @Column({ nullable: true, type: 'varchar', length: 200 })
  label?: string

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
