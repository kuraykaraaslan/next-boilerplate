import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid', { name: 'movementId' })
  movementId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  stockItemId!: string

  @Column({ type: 'varchar' })
  type!: string

  @Column({ type: 'int', default: 0 })
  quantity!: number

  @Column({ type: 'varchar', nullable: true })
  reason?: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
