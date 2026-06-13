import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index, Unique,
} from 'typeorm'

@Unique(['tenantId', 'slug'])
// Fast listing of a tenant's published posts in reverse-chronological order.
@Index('IDX_blog_posts_tenant_status_published', ['tenantId', 'status', 'publishedAt'])
@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn('uuid', { name: 'postId' })
  postId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  title!: string

  @Column({ type: 'varchar' })
  slug!: string

  @Column({ type: 'text' })
  content!: string

  @Column({ nullable: true, type: 'text' })
  description?: string

  // A tenant member's userId — no cross-DB FK, just the id.
  @Index()
  @Column({ nullable: true, type: 'uuid' })
  authorId?: string

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  categoryId?: string

  @Column({ nullable: true, type: 'varchar' })
  image?: string

  @Column({ type: 'simple-array', nullable: true })
  keywords?: string[]

  @Index()
  @Column({ type: 'varchar', default: 'DRAFT' })
  status!: string

  @Column({ type: 'int', default: 0 })
  views!: number

  @Column({ nullable: true, type: 'timestamp' })
  publishedAt?: Date

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
