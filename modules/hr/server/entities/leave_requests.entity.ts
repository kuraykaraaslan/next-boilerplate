import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('leave_requests')
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid', { name: 'leaveId' })
  leaveId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  employeeId!: string

  @Column({ type: 'varchar', default: 'ANNUAL' })
  type!: string

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  leaveTypeId?: string

  @Column({ type: 'timestamp' })
  startDate!: Date

  @Column({ type: 'timestamp' })
  endDate!: Date

  @Index()
  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string

  @Column({ nullable: true, type: 'varchar' })
  reason?: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
