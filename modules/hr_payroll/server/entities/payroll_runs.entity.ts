import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('payroll_runs')
export class PayrollRun {
  @PrimaryGeneratedColumn('uuid', { name: 'runId' })
  runId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  period!: string

  @Column({ type: 'varchar' })
  status!: string

  @Column({ type: 'date', nullable: true })
  runDate?: Date

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
