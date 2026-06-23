import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid', { name: 'supplierId' })
  supplierId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar' })
  code!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  categoryId?: string

  @Column({ type: 'varchar', nullable: true })
  email?: string

  @Column({ type: 'varchar', nullable: true })
  phone?: string

  @Column({ type: 'varchar', nullable: true })
  taxNumber?: string

  @Column({ type: 'boolean', default: false })
  isActive!: boolean

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
