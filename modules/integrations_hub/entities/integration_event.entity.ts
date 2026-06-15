import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/** Append-only audit of outbound trigger fires and inbound action invocations. */
@Entity('integration_events')
export class IntegrationEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'integrationEventId' })
  integrationEventId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  connectedAppId!: string;

  @Column({ type: 'varchar' })
  direction!: string;

  @Column({ type: 'varchar' })
  eventKey!: string;

  @Column({ type: 'varchar' })
  status!: string;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown>;

  @Column({ nullable: true, type: 'text' })
  error?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
