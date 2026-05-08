import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Unique(['tenantId', 'month'])
@Entity('tenant_usage')
export class TenantUsage {
  @PrimaryGeneratedColumn('uuid', { name: 'usageId' })
  usageId!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 7 })
  month!: string; // 'YYYY-MM'

  @Column({ type: 'int', default: 0 })
  apiCalls!: number;

  @Column({ type: 'bigint', default: 0 })
  aiTokens!: number;

  @Column({ type: 'bigint', default: 0 })
  storageBytes!: number;

  @Column({ type: 'int', default: 0 })
  emailSends!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
