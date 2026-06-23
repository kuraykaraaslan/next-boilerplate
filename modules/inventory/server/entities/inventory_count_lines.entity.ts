import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('inventory_count_lines')
export class InventoryCountLine {
  @PrimaryGeneratedColumn('uuid', { name: 'countLineId' })
  countLineId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  countId!: string

  @Index()
  @Column({ type: 'uuid' })
  stockItemId!: string

  @Column({ type: 'int', default: 0 })
  systemQty!: number

  @Column({ type: 'int', default: 0 })
  countedQty!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
