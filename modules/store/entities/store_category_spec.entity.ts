import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index, Unique,
} from 'typeorm'

@Unique(['tenantId', 'categoryId', 'key'])
@Entity('store_category_specs')
export class StoreCategorySpec {
  @PrimaryGeneratedColumn('uuid', { name: 'specId' })
  specId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  categoryId!: string

  @Column({ type: 'varchar' })
  key!: string

  @Column({ type: 'varchar' })
  label!: string

  @Column({ type: 'varchar', default: 'TEXT' })
  type!: string

  @Column({ nullable: true, type: 'varchar' })
  unit?: string

  @Column({ nullable: true, type: 'varchar' })
  placeholder?: string

  @Column({ type: 'jsonb', nullable: true })
  options?: string[]

  @Column({ type: 'boolean', default: false })
  isRequired!: boolean

  @Column({ type: 'boolean', default: true })
  isFilterable!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
