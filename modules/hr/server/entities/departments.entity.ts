import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid', { name: 'departmentId' })
  departmentId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar' })
  code!: string

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  managerId?: string

  @Column({ type: 'boolean', default: false })
  isActive!: boolean

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
