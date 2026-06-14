import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

/**
 * A support ticket. `ticketNumber` is a human-readable, per-tenant per-year
 * monotonic sequence (e.g. `TICK-2026-00001`) allocated the same race-safe way
 * the invoice module allocates invoice numbers. Conversation lives in
 * `SupportTicketMessage` rows.
 */
@Entity('support_tickets')
@Index('idx_ticket_tenant_status', ['tenantId', 'status'])
@Index('uq_ticket_number', ['tenantId', 'ticketNumber'], { unique: true })
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid', { name: 'ticketId' })
  ticketId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 32 })
  ticketNumber!: string;

  // The requester may be an authenticated tenant user; always carries an email.
  @Column({ type: 'uuid', nullable: true })
  requesterUserId!: string | null;

  @Column({ type: 'varchar', length: 320 })
  requesterEmail!: string;

  @Column({ type: 'varchar', length: 300 })
  subject!: string;

  // TicketStatus — OPEN | PENDING | RESOLVED | CLOSED
  @Column({ type: 'varchar', length: 16, default: 'OPEN' })
  status!: string;

  // TicketPriority — LOW | NORMAL | HIGH | URGENT
  @Column({ type: 'varchar', length: 16, default: 'NORMAL' })
  priority!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  category!: string | null;

  @Column({ type: 'uuid', nullable: true })
  assignedToUserId!: string | null;

  // When the first AGENT reply landed (first-response SLA tracking).
  @Column({ type: 'timestamp', nullable: true })
  firstResponseAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  slaDueAt!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
