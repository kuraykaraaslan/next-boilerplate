import 'reflect-metadata'
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity('store_product_images')
export class StoreProductImage {
  @PrimaryGeneratedColumn('uuid', { name: 'imageId' })
  imageId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ nullable: true, type: 'uuid' })
  variantId?: string

  @Column({ type: 'varchar' })
  url!: string

  @Column({ nullable: true, type: 'varchar' })
  altText?: string

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date
}
