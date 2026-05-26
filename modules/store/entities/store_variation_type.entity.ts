import 'reflect-metadata'
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm'

/** Defines a variation axis for a product, e.g. "Color", "Size", "Material" */
@Unique(['tenantId', 'productId', 'name'])
@Entity('store_variation_types')
export class StoreVariationType {
  @PrimaryGeneratedColumn('uuid', { name: 'variationTypeId' })
  variationTypeId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar', default: 'TEXT' })
  displayType!: string

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
