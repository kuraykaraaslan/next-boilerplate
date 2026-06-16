import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Append-only price/stock observation for a wishlisted product, captured by the
 * wishlist price-watch sweep. Powers price-tracking history charts and
 * price-drop / back-in-stock detection.
 */
@Entity('wishlist_price_points')
export class WishlistPricePoint {
  @PrimaryGeneratedColumn('uuid', { name: 'pricePointId' })
  pricePointId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  wishlistItemId!: string;

  @Index()
  @Column({ type: 'uuid' })
  productId!: string;

  @Column({ nullable: true, type: 'uuid' })
  variantId?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  price!: number;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ type: 'boolean', default: true })
  inStock!: boolean;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  recordedAt!: Date;
}
