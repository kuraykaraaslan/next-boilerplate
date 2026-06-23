import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

/** Configurable product-tag master-data (tenant-scoped). */
@Entity('store_product_tags')
export class StoreProductTag {
  @PrimaryGeneratedColumn('uuid', { name: 'tagId' })
  tagId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar' })
  slug!: string

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
