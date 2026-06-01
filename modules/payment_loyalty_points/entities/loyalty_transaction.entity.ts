import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('loyalty_transactions')
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn('uuid', { name: 'loyaltyTransactionId' })
  loyaltyTransactionId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  accountId!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ type: 'varchar' })
  type!: string;

  @Column({ type: 'int' })
  points!: number;

  @Column({ nullable: true, type: 'varchar' })
  reason?: string;

  @Index()
  @Column({ nullable: true, type: 'varchar' })
  referenceType?: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  referenceId?: string;

  @Column({ type: 'int' })
  balanceAfter!: number;

  @Index()
  @Column({ nullable: true, type: 'timestamp' })
  expiresAt?: Date;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
