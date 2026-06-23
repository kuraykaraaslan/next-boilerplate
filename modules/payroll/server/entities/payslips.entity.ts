import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('payslips')
export class Payslip {
  @PrimaryGeneratedColumn('uuid', { name: 'payslipId' })
  payslipId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  runId!: string

  @Index()
  @Column({ type: 'uuid' })
  employeeId!: string

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  gross?: string

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  deductions?: string

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  net?: string

  @Column({ type: 'varchar' })
  status!: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
