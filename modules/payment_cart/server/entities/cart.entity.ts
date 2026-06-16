import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';
import { DEFAULT_CURRENCY } from '@nb/common';

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid', { name: 'cartId' })
  cartId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  userId?: string;

  @Index()
  @Column({ nullable: true, type: 'varchar' })
  guestToken?: string;

  @Index()
  @Column({ type: 'varchar', default: 'ACTIVE' })
  status!: string;

  @Column({ type: 'varchar', length: 3, default: DEFAULT_CURRENCY })
  currency!: string;

  @Column({ nullable: true, type: 'varchar' })
  couponCode?: string | null;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  subtotal?: number;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  discountTotal?: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: unknown;

  @Column({ nullable: true, type: 'timestamp' })
  expiresAt?: Date;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
