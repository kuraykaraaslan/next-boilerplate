import 'reflect-metadata'
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm'

/** A concrete option value for a variation type, e.g. "Red", "L", "Cotton" */
@Unique(['tenantId', 'variationTypeId', 'value'])
@Entity('store_variation_options')
export class StoreVariationOption {
  @PrimaryGeneratedColumn('uuid', { name: 'optionId' })
  optionId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  variationTypeId!: string

  @Column({ type: 'varchar' })
  label!: string

  @Column({ type: 'varchar' })
  value!: string

  /** Hex color or image URL for swatch display */
  @Column({ nullable: true, type: 'varchar' })
  swatch?: string

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
