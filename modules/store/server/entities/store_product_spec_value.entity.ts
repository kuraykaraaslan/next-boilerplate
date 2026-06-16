import 'reflect-metadata'
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm'

@Unique(['tenantId', 'productId', 'specId'])
@Entity('store_product_spec_values')
export class StoreProductSpecValue {
  @PrimaryGeneratedColumn('uuid', { name: 'specValueId' })
  specValueId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Index()
  @Column({ type: 'uuid' })
  specId!: string

  @Column({ type: 'varchar' })
  value!: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
