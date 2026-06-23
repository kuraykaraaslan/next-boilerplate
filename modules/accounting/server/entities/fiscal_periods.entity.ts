import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('fiscal_periods')
export class FiscalPeriod {
  @PrimaryGeneratedColumn('uuid', { name: 'periodId' })
  periodId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'timestamp', nullable: true })
  startDate?: Date

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date

  @Column({ type: 'varchar' })
  status!: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
