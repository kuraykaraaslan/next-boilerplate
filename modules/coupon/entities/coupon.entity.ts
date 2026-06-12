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
   *   productIds             — limit to specific store products
   *   planIds                — limit to specific subscription plans
   *   categoryIds            — limit to products in these categories
   *   providers              — limit to specific payment providers
   *   appliesTo              — 'line' = each matching line, 'cart' = cart total
   *   minimumAmount          — minimum subtotal for the coupon to apply
   *   minimumAmountCurrency  — ISO 4217 currency minimumAmount is expressed in
   *   countryCodes           — ISO 3166-1 alpha-2 allow-list; null/empty = all
   */
  @Column({ type: 'jsonb', nullable: true })
  scope?: {
    productIds?: string[]
    planIds?: string[]
    categoryIds?: string[]
    providers?: string[]
    appliesTo?: 'line' | 'cart'
    minimumAmount?: number
    minimumAmountCurrency?: string
    countryCodes?: string[]
  };

  @Column({ nullable: true, type: 'int' })
  maxUses?: number;

  @Column({ nullable: true, type: 'int' })
  maxUsesPerTenant?: number;

  /** Maximum redemptions per authenticated user. */
  @Column({ nullable: true, type: 'int' })
  maxUsesPerUser?: number;

  /** BCP-47 locale → localised name, e.g. `{ "tr-TR": "İndirim" }` */
  @Column({ type: 'jsonb', nullable: true })
  nameI18n?: Record<string, string>;

  /** BCP-47 locale → localised description */
  @Column({ type: 'jsonb', nullable: true })
  descriptionI18n?: Record<string, string>;

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
