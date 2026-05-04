import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid', { name: 'auditLogId' })
  auditLogId!: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  actorId?: string;

  @Column({ type: 'varchar', default: 'SYSTEM' })
  actorType!: string;

  @Index()
  @Column({ type: 'varchar' })
  action!: string;

  @Index()
  @Column({ nullable: true, type: 'varchar' })
  resourceType?: string;

  @Column({ nullable: true, type: 'varchar' })
  resourceId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: unknown;

  @Column({ nullable: true, type: 'varchar' })
  ipAddress?: string;

  @Column({ nullable: true, type: 'text' })
  userAgent?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
