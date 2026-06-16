import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('product_review_votes')
export class ProductReviewVote {
  @PrimaryGeneratedColumn('uuid', { name: 'voteId' })
  voteId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  reviewId!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'boolean', default: true })
  isHelpful!: boolean;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
