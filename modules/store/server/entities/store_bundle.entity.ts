import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'
import { DEFAULT_CURRENCY } from '@nb/common'

@Entity('store_bundles')
export class StoreBundle {
  @PrimaryGeneratedColumn('uuid', { name: 'bundleId' })
  bundleId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar' })
  slug!: string

  @Column({ nullable: true, type: 'text' })
  description?: string

  /** Richtext stored as Tiptap/ProseMirror JSON */
  @Column({ type: 'jsonb', nullable: true })
  richDescription?: unknown

  /** If null, price is computed as sum of included items */
  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  bundlePrice?: number

  @Column({ nullable: true, type: 'decimal', precision: 4, scale: 2, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  discountPercent?: number

  @Column({ type: 'varchar', length: 3, default: DEFAULT_CURRENCY })
  currency!: string

  @Column({ nullable: true, type: 'varchar' })
  imageUrl?: string

  @Index()
  @Column({ type: 'varchar', default: 'DRAFT' })
  status!: string

  @Column({ nullable: true, type: 'timestamp' })
  availableFrom?: Date

  @Column({ nullable: true, type: 'timestamp' })
  availableTo?: Date

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
