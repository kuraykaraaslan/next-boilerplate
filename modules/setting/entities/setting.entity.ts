import 'reflect-metadata';
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('settings')
export class Setting {
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

  // When true the value cannot be changed by tenant admins (only platform operators).
  @Column({ type: 'boolean', default: false })
  isLocked!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
