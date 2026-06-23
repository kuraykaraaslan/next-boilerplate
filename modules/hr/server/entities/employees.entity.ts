import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid', { name: 'employeeId' })
  employeeId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  firstName!: string

  @Column({ type: 'varchar' })
  lastName!: string

  @Column({ type: 'varchar' })
  email!: string

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  departmentId?: string

  @Column({ nullable: true, type: 'varchar' })
  title?: string

  @Index()
  @Column({ type: 'varchar', default: 'ACTIVE' })
  status!: string

  @Column({ nullable: true, type: 'timestamp' })
  hiredAt?: Date

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  userId?: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
