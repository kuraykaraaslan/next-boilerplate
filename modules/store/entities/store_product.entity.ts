import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'
import { DEFAULT_CURRENCY } from '@/modules/common'

@Entity('store_products')
export class StoreProduct {
  @PrimaryGeneratedColumn('uuid', { name: 'productId' })
  productId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  categoryId!: string

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar' })
  slug!: string

  @Column({ nullable: true, type: 'text' })
  shortDescription?: string

  @Column({ nullable: true, type: 'text' })
  details?: string

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  basePrice!: number

  @Column({ type: 'varchar', length: 3, default: DEFAULT_CURRENCY })
  currency!: string

  @Column({ nullable: true, type: 'varchar' })
  sku?: string

  @Column({ nullable: true, type: 'int' })
  stockQuantity?: number

  @Column({ type: 'boolean', default: true })
  trackInventory!: boolean

  @Column({ type: 'boolean', default: true })
  allowBackorder!: boolean

  @Column({ nullable: true, type: 'decimal', precision: 8, scale: 3, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  weight?: number

  @Column({ nullable: true, type: 'varchar', length: 10 })
  weightUnit?: string

  @Column({ nullable: true, type: 'jsonb' })
  dimensions?: { length?: number; width?: number; height?: number; unit?: string }

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[]

  @Index()
  @Column({ type: 'varchar', default: 'DRAFT' })
  status!: string

  @Column({ type: 'boolean', default: false })
  isFeatured!: boolean

  @Column({ type: 'boolean', default: false })
  isDigital!: boolean

  @Column({ nullable: true, type: 'varchar' })
  digitalDownloadUrl?: string

  @Column({ nullable: true, type: 'jsonb' })
  seo?: { title?: string; description?: string; keywords?: string[] }

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
