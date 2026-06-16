import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('wishlist_items')
export class WishlistItem {
  @PrimaryGeneratedColumn('uuid', { name: 'wishlistItemId' })
  wishlistItemId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  wishlistId!: string;

  @Index()
  @Column({ type: 'uuid' })
  productId!: string;

  @Column({ nullable: true, type: 'uuid' })
  variantId?: string;

  @Column({ nullable: true, type: 'text' })
  note?: string;

  // Last-observed price/stock (for price-drop & back-in-stock detection).
  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  lastKnownPrice?: number | null;

  @Column({ nullable: true, type: 'varchar', length: 3 })
  lastKnownCurrency?: string | null;

  @Column({ nullable: true, type: 'boolean' })
  lastKnownInStock?: boolean | null;

  // Conversion tracking: when this wishlist item was added to a cart.
  @Column({ nullable: true, type: 'timestamp' })
  addedToCartAt?: Date | null;

  // De-dup notification timestamps so we don't spam on every sweep.
  @Column({ nullable: true, type: 'timestamp' })
  notifiedPriceDropAt?: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  notifiedBackInStockAt?: Date | null;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
