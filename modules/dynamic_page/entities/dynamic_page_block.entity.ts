import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index, Unique,
} from 'typeorm'

@Unique(['tenantId', 'type'])
@Entity('dynamic_page_blocks')
export class DynamicPageBlock {
  @PrimaryGeneratedColumn('uuid', { name: 'blockId' })
  blockId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  type!: string

  @Column({ type: 'varchar' })
  label!: string

  @Column({ type: 'varchar', default: 'General' })
  category!: string

  @Column({ nullable: true, type: 'text' })
  description?: string

  @Column({ type: 'jsonb', default: '{}' })
  schema!: object

  @Column({ type: 'jsonb', default: '{}' })
  defaultProps!: object

  @Column({ type: 'text', default: '' })
  template!: string

  @Column({ nullable: true, type: 'text' })
  script?: string

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
