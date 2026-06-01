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

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
