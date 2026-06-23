import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('navigation_items')
export class NavigationItem {
  @PrimaryGeneratedColumn('uuid', { name: 'itemId' })
  itemId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  menuId!: string

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  parentId?: string

  @Column({ type: 'varchar' })
  label!: string

  @Column({ type: 'varchar' })
  url!: string

  @Column({ type: 'int', default: 0 })
  order!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
