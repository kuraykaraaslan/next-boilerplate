import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index, Unique,
} from 'typeorm'

@Unique(['tenantId', 'slug'])
@Entity('dynamic_collections')
export class DynamicCollection {
  @PrimaryGeneratedColumn('uuid', { name: 'collectionId' })
  collectionId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  slug!: string

  @Column({ type: 'varchar' })
  label!: string

  @Column({ nullable: true, type: 'text' })
  description?: string

  @Column({ type: 'jsonb', default: '[]' })
  fields!: object[]

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
