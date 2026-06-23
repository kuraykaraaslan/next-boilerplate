import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('form_fields')
export class FormField {
  @PrimaryGeneratedColumn('uuid', { name: 'fieldId' })
  fieldId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  formId!: string

  @Column({ type: 'varchar' })
  label!: string

  @Column({ type: 'varchar' })
  type!: string

  @Column({ type: 'boolean', default: false })
  required!: boolean

  @Column({ type: 'int', default: 0 })
  order!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
