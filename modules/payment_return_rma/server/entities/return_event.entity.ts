import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

// Append-only audit log of RMA status changes.
@Entity('return_events')
export class ReturnEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'returnEventId' })
  returnEventId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  returnRequestId!: string;

  @Column({ type: 'varchar' })
  status!: string;

  @Column({ nullable: true, type: 'text' })
  message?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: unknown;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
