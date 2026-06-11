import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('loyalty_accounts')
export class LoyaltyAccount {
  @PrimaryGeneratedColumn('uuid', { name: 'loyaltyAccountId' })
  loyaltyAccountId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'int', default: 0 })
  balance!: number;

  @Column({ type: 'int', default: 0 })
  lifetimePoints!: number;

  @Column({ type: 'varchar', default: 'BRONZE' })
  tier!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: unknown;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
