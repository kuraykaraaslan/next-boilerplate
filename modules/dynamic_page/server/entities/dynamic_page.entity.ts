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

  // Scheduling: page goes live at publishAt and is hidden after expireAt.
  @Index()
  @Column({ nullable: true, type: 'timestamp' })
  publishAt?: Date | null

  @Column({ nullable: true, type: 'timestamp' })
  expireAt?: Date | null

  // Configurable CDN/cache TTL (seconds) for this page's rendered output.
  @Column({ nullable: true, type: 'int' })
  cacheTtlSeconds?: number | null

  // Password protection (bcrypt hash; null = public).
  @Column({ nullable: true, type: 'varchar' })
  passwordHash?: string | null

  // Audience targeting — empty/null = everyone.
  @Column({ type: 'jsonb', nullable: true })
  audienceCountries?: string[] | null

  @Column({ type: 'jsonb', nullable: true })
  audienceLanguages?: string[] | null

  @Column({ type: 'jsonb', nullable: true })
  audienceRoles?: string[] | null

  @Column({ type: 'int', default: 2 })
  schemaVersion!: number

  // Monotonic content revision (bumped on each content update for history).
  @Column({ type: 'int', default: 1 })
  revision!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
