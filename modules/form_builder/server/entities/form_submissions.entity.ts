import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('form_submissions')
export class FormSubmission {
  @PrimaryGeneratedColumn('uuid', { name: 'submissionId' })
  submissionId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  formId!: string

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, unknown>

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
