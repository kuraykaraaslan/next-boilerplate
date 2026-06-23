import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm'

@Entity('journal_entries')
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid', { name: 'entryId' })
  entryId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  journalId?: string

  @Column({ type: 'varchar' })
  number!: string

  @Column({ type: 'varchar', nullable: true })
  description?: string

  @Column({ type: 'varchar' })
  status!: string

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalDebit!: number

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalCredit!: number

  @Column({ type: 'timestamp', nullable: true })
  entryDate?: Date

  @Column({ type: 'timestamp', nullable: true })
  postedAt?: Date

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date
}
