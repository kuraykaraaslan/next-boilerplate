import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Unique(['tenantId'])
@Entity('tenant_subscriptions')
export class TenantSubscription {
  @PrimaryGeneratedColumn('uuid', { name: 'subscriptionId' })
  subscriptionId!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  planId!: string;

  @Index()
  @Column({ type: 'varchar', default: 'ACTIVE' })
  status!: string;

  @Column({ type: 'varchar', default: 'MONTHLY' })
  billingInterval!: string;

  @Column({ type: 'timestamp' })
  currentPeriodStart!: Date;

  @Column({ type: 'timestamp' })
  currentPeriodEnd!: Date;

  @Column({ nullable: true, type: 'timestamp' })
  trialEndsAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  cancelledAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  gracePeriodEndsAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
