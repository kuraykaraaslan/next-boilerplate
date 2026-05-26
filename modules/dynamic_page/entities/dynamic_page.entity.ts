import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index, Unique,
} from 'typeorm'

@Unique(['tenantId', 'slug'])
@Entity('dynamic_pages')
export class DynamicPage {
  @PrimaryGeneratedColumn('uuid', { name: 'dynamicPageId' })
  dynamicPageId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  slug!: string

  @Column({ type: 'varchar' })
  title!: string

  @Column({ nullable: true, type: 'text' })
  description?: string

  @Column({ type: 'jsonb', default: '[]' })
  keywords!: string[]

  @Column({ type: 'jsonb', default: '[]' })
  sections!: object

  @Column({ type: 'jsonb', nullable: true })
  metadata?: object

  @Index()
  @Column({ type: 'varchar', default: 'DRAFT' })
  status!: string

  @Column({ type: 'int', default: 2 })
  schemaVersion!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
