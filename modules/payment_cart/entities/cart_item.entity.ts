import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn('uuid', { name: 'cartItemId' })
  cartItemId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  cartId!: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  productId?: string;

  @Column({ nullable: true, type: 'uuid' })
  variantId?: string;

  @Column({ nullable: true, type: 'varchar' })
  sku?: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: unknown;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
