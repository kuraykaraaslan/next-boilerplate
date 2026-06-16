import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index, Unique,
  ManyToOne, JoinColumn,
} from 'typeorm'
import { DynamicPage } from './dynamic_page.entity'

@Unique(['dynamicPageId', 'lang'])
@Entity('dynamic_page_translations')
export class DynamicPageTranslation {
  @PrimaryGeneratedColumn('uuid', { name: 'translationId' })
  translationId!: string

  @Index()
  @Column({ type: 'uuid' })
  dynamicPageId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar', length: 10 })
  lang!: string

  @Column({ type: 'varchar' })
  title!: string

  @Column({ nullable: true, type: 'text' })
  description?: string

  @Column({ type: 'jsonb', default: '[]' })
  sections!: object

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @ManyToOne(() => DynamicPage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dynamicPageId' })
  page!: DynamicPage
}
