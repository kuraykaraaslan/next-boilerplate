import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index, Unique,
} from 'typeorm'

@Unique(['tenantId', 'slug'])
@Entity('blog_categories')
export class BlogCategory {
  @PrimaryGeneratedColumn('uuid', { name: 'categoryId' })
  categoryId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  title!: string

  @Column({ type: 'varchar' })
  slug!: string

  @Column({ nullable: true, type: 'text' })
  description?: string

  @Column({ nullable: true, type: 'varchar' })
  image?: string

  @Column({ type: 'simple-array', nullable: true })
  keywords?: string[]

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
