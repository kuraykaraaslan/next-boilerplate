import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Unique(['tenantId', 'code'])
@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid', { name: 'couponId' })
  couponId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

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

  /**
   * Flexible coupon scope. Any missing/null dimension means "applies to all".
   *
   *   productIds      — limit to specific store products
   *   planIds         — limit to specific subscription plans
   *   categoryIds     — limit to products in these categories
   *   providers       — limit to specific payment providers
   *   appliesTo       — 'line' = discount each matching line, 'cart' = discount cart total
   *   minimumAmount   — minimum subtotal (in coupon.currency)
   */
  @Column({ type: 'jsonb', nullable: true })
  scope?: {
    productIds?: string[]
    planIds?: string[]
    categoryIds?: string[]
    providers?: string[]
    appliesTo?: 'line' | 'cart'
    minimumAmount?: number
  };

  @Column({ nullable: true, type: 'int' })
  maxUses?: number;

  @Column({ nullable: true, type: 'int' })
  maxUsesPerTenant?: number;

  @Column({ type: 'int', default: 0 })
  usedCount!: number;

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
