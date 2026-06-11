import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

@Entity('product_reviews')
export class ProductReview {
  @PrimaryGeneratedColumn('uuid', { name: 'productReviewId' })
  productReviewId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  productId!: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  userId?: string;

  @Column({ nullable: true, type: 'varchar' })
  authorName?: string;

  @Column({ type: 'int' })
  rating!: number;

  @Column({ nullable: true, type: 'varchar' })
  title?: string;

  @Column({ type: 'text' })
  body!: string;

  @Index()
  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string;

  @Index()
  @Column({ type: 'boolean', default: false })
  isVerifiedPurchase!: boolean;

  @Column({ type: 'int', default: 0 })
  helpfulCount!: number;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  orderId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: unknown;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
