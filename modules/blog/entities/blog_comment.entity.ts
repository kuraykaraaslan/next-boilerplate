import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('blog_comments')
export class BlogComment {
  @PrimaryGeneratedColumn('uuid', { name: 'commentId' })
  commentId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  postId!: string

  // Self-reference for threaded replies (no FK; same table).
  @Index()
  @Column({ nullable: true, type: 'uuid' })
  parentId?: string

  @Column({ type: 'text' })
  content!: string

  // Logged-in author (tenant member userId) — null for anonymous comments.
  @Index()
  @Column({ nullable: true, type: 'uuid' })
  userId?: string

  // Anonymous author identity (used when userId is absent).
  @Column({ nullable: true, type: 'varchar' })
  name?: string

  @Column({ nullable: true, type: 'varchar' })
  email?: string

  @Index()
  @Column({ type: 'varchar', default: 'NOT_PUBLISHED' })
  status!: string

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
