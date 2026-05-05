import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid', { name: 'couponId' })
  couponId!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Index()
  @Column({ type: 'varchar' })
  discountType!: string;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  discountValue!: number;

  @Column({ nullable: true, type: 'varchar', length: 3 })
  currency?: string;

  // null = applies to all plans
  @Column({ type: 'jsonb', nullable: true })
  applicablePlanIds?: string[];

  // null = applies to all providers
  @Column({ type: 'jsonb', nullable: true })
  applicableProviders?: string[];

  @Column({ nullable: true, type: 'int' })
  maxUses?: number;

  @Column({ nullable: true, type: 'int' })
  maxUsesPerTenant?: number;

  @Column({ type: 'int', default: 0 })
  usedCount!: number;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  minimumAmount?: number;

  @Index()
  @Column({ type: 'varchar', default: 'ACTIVE' })
  status!: string;

  @Column({ nullable: true, type: 'timestamp' })
  startsAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  expiresAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
