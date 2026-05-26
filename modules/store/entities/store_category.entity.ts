import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('store_categories')
export class StoreCategory {
  @PrimaryGeneratedColumn('uuid', { name: 'categoryId' })
  categoryId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  parentId?: string

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar', unique: false })
  slug!: string

  @Column({ nullable: true, type: 'text' })
  description?: string

  @Column({ nullable: true, type: 'varchar' })
  imageUrl?: string

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Index()
  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
