import 'reflect-metadata';
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenant_databases')
export class TenantDatabase {
  @PrimaryColumn({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'text' })
  databaseUrl!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
