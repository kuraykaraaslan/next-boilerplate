import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * A single message in a support ticket thread. `internal` flags an agent-only
 * note that is never returned to the requester (the service filters it out
 * unless `includeInternal` is set, which only the admin read path passes).
 */
@Entity('support_ticket_messages')
@Index('idx_ticket_message_tenant_ticket', ['tenantId', 'ticketId'])
export class SupportTicketMessage {
  @PrimaryGeneratedColumn('uuid', { name: 'ticketMessageId' })
  ticketMessageId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  ticketId!: string;

  @Column({ type: 'uuid', nullable: true })
  authorUserId!: string | null;

  // TicketAuthorType — REQUESTER | AGENT | SYSTEM
  @Column({ type: 'varchar', length: 16 })
  authorType!: string;

  @Column({ type: 'text' })
  body!: string;

  // Agent-only internal note — hidden from the requester.
  @Column({ type: 'boolean', default: false })
  internal!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  attachments!: Record<string, unknown>[] | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
