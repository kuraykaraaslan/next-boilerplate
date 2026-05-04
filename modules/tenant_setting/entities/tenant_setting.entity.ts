import 'reflect-metadata';
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('tenant_settings')
export class TenantSetting {
  @PrimaryColumn({ type: 'uuid' })
  tenantId!: string;

  @PrimaryColumn({ type: 'varchar' })
  key!: string;

  @Column({ type: 'text' })
  value!: string;

  @Index()
  @Column({ type: 'varchar', default: 'general' })
  group!: string;

  @Column({ type: 'varchar', default: 'string' })
  type!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
