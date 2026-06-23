import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('supplier_contacts')
export class SupplierContact {
  @PrimaryGeneratedColumn('uuid', { name: 'contactId' })
  contactId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  supplierId!: string

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar', nullable: true })
  email?: string

  @Column({ type: 'varchar', nullable: true })
  phone?: string

  @Column({ type: 'varchar', nullable: true })
  role?: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
