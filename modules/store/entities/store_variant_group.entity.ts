import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('store_variant_groups')
export class StoreVariantGroup {
  @PrimaryGeneratedColumn('uuid', { name: 'variantGroupId' })
  variantGroupId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ nullable: true, type: 'varchar', length: 200 })
  name?: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
