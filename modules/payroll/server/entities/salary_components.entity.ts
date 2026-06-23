import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('salary_components')
export class SalaryComponent {
  @PrimaryGeneratedColumn('uuid', { name: 'componentId' })
  componentId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  employeeId!: string

  @Column({ type: 'varchar' })
  type!: string

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  amount?: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
