import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('inventory_counts')
export class InventoryCount {
  @PrimaryGeneratedColumn('uuid', { name: 'countId' })
  countId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  warehouseId!: string

  @Column({ type: 'varchar', default: 'OPEN' })
  status!: string

  @Column({ type: 'varchar', nullable: true })
  reference?: string

  @Column({ type: 'int', default: 0 })
  lineCount!: number

  @Column({ type: 'int', default: 0 })
  totalDiff!: number

  @Column({ type: 'timestamp', nullable: true })
  countedAt?: Date

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
