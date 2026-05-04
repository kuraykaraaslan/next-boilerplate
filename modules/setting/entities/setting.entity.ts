import 'reflect-metadata';
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('settings')
export class Setting {
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
