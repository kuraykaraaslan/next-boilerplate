import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('leave_types')
export class LeaveType {
  @PrimaryGeneratedColumn('uuid', { name: 'leaveTypeId' })
  leaveTypeId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar' })
  code!: string

  @Column({ type: 'boolean', default: false })
  paid!: boolean

  @Column({ type: 'int', default: 0 })
  maxDaysPerYear!: number

  @Column({ nullable: true, type: 'varchar' })
  color?: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
