import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '@/modules/tenant/entities/tenant.entity';

@Entity('coupon_redemptions')
export class CouponRedemption {
  @PrimaryGeneratedColumn('uuid', { name: 'redemptionId' })
  redemptionId!: string;

  // Soft reference to system DB Coupon
  @Index()
  @Column({ type: 'uuid' })
  couponId!: string;

  @Column({ type: 'varchar', length: 32 })
  couponCode!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  // Soft reference to tenant DB Payment
  @Index()
  @Column({ nullable: true, type: 'uuid' })
  paymentId?: string;

  // Soft reference to system DB User
  @Column({ nullable: true, type: 'uuid' })
  userId?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  discountAmount!: number;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  originalAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  finalAmount!: number;

  @CreateDateColumn({ type: 'timestamp' })
  appliedAt!: Date;
}
