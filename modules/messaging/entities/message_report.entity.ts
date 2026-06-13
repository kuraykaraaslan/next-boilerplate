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
 * A user-submitted report against a message. Always available regardless of the
 * tenant's moderation mode. The unique index on (tenantId, messageId,
 * reporterUserId) makes reporting idempotent per user.
 */
@Entity('message_reports')
@Index('uq_message_report_reporter', ['tenantId', 'messageId', 'reporterUserId'], { unique: true })
@Index('idx_message_report_queue', ['tenantId', 'status', 'createdAt'])
@Index('idx_message_report_message', ['tenantId', 'messageId'])
export class MessageReport {
  @PrimaryGeneratedColumn('uuid', { name: 'messageReportId' })
  messageReportId!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  conversationId!: string;

  @Column({ type: 'uuid' })
  messageId!: string;

  @Column({ type: 'uuid' })
  reporterUserId!: string;

  // ReportReasonEnum: spam | harassment | hate | sexual | violence | self_harm | other
  @Column({ type: 'varchar', length: 24 })
  reason!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  // ReportStatusEnum: OPEN | REVIEWING | RESOLVED | DISMISSED
  @Column({ type: 'varchar', length: 12, default: 'OPEN' })
  status!: string;

  @Column({ type: 'uuid', nullable: true })
  resolvedByUserId!: string | null;

  // ModerationActionEnum applied at resolution: approve | reject | hide | dismiss
  @Column({ type: 'varchar', length: 16, nullable: true })
  resolutionAction!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
