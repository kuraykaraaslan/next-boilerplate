import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('payslip_lines')
export class PayslipLine {
  @PrimaryGeneratedColumn('uuid', { name: 'payslipLineId' })
  payslipLineId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  payslipId!: string

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar' })
  type!: string

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  amount?: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
