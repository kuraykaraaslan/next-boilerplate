import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('redirect_rules')
export class RedirectRule {
  @PrimaryGeneratedColumn('uuid', { name: 'redirectId' })
  redirectId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  fromPath!: string

  @Column({ type: 'varchar' })
  toPath!: string

  @Column({ type: 'int', default: 0 })
  statusCode!: number

  @Column({ type: 'boolean', default: false })
  isActive!: boolean

  @Column({ type: 'int', default: 0 })
  hits!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
