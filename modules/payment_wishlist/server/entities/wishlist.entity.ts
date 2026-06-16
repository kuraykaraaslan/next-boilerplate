import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

@Entity('wishlists')
export class Wishlist {
  @PrimaryGeneratedColumn('uuid', { name: 'wishlistId' })
  wishlistId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', default: 'Default' })
  name!: string;

  @Column({ type: 'boolean', default: false })
  isPublic!: boolean;

  @Index()
  @Column({ nullable: true, type: 'varchar' })
  shareToken?: string;

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
