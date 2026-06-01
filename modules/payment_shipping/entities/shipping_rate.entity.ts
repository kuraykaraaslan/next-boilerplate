import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('shipping_rates')
export class ShippingRate {
  @PrimaryGeneratedColumn('uuid', { name: 'shippingRateId' })
  shippingRateId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  shippingMethodId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  // ISO-2 country code; null = applies to any country.
  @Column({ nullable: true, type: 'varchar' })
  countryCode?: string;

  // State / province; null = applies to any region within the country.
  @Column({ nullable: true, type: 'varchar' })
  region?: string;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  minWeight?: number;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  maxWeight?: number;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  minSubtotal?: number;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  maxSubtotal?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price!: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  // Subtotal at/above which shipping becomes free; null = never free via threshold.
  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  freeThreshold?: number;

  @Column({ nullable: true, type: 'int' })
  estimatedDaysMin?: number;

  @Column({ nullable: true, type: 'int' })
  estimatedDaysMax?: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
