import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('fulfillment_events')
export class FulfillmentEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'fulfillmentEventId' })
  fulfillmentEventId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  fulfillmentId!: string;

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
