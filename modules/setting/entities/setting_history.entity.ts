import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('setting_history')
@Index(['tenantId', 'key', 'createdAt'])
export class SettingHistory {
  @PrimaryGeneratedColumn('uuid')
  historyId!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  key!: string;

  @Column({ type: 'text' })
  previousValue!: string;

  @Column({ type: 'text' })
  newValue!: string;

  @Column({ type: 'uuid', nullable: true })
  changedByUserId?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
