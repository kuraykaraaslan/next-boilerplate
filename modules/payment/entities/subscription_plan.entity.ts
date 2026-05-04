import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid', { name: 'planId' })
  planId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monthlyPrice!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  yearlyPrice!: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'int', default: 0 })
  trialDays!: number;

  @Index()
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Index()
  @Column({ type: 'varchar', default: 'ACTIVE' })
  status!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
