import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('journal_lines')
export class JournalLine {
  @PrimaryGeneratedColumn('uuid', { name: 'lineId' })
  lineId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Index()
  @Column({ type: 'uuid' })
  entryId!: string

  @Index()
  @Column({ type: 'uuid' })
  accountId!: string

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  debit?: number

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  credit?: number

  @Column({ type: 'varchar', nullable: true })
  memo?: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
