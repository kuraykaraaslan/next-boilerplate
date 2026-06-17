import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PublisherStatus = 'pending' | 'verified' | 'suspended';

/**
 * A verified marketplace publisher. Tied to the tenant that applied. Only
 * `verified` publishers may create listings. System-scoped (cross-tenant
 * registry) — no per-tenant isolation; `ownerTenantId` is just the applicant.
 */
@Entity('marketplace_publishers')
export class Publisher {
  @PrimaryGeneratedColumn('uuid', { name: 'publisherId' })
  publisherId!: string;

  @Index()
  @Column({ type: 'uuid' })
  ownerTenantId!: string;

  /** Publisher namespace, e.g. `acme` → listings are `@acme/<moduleId>`. */
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  slug!: string;

  @Column({ type: 'varchar' })
  displayName!: string;

  @Column({ type: 'varchar', nullable: true })
  contact!: string | null;

  @Column({ type: 'varchar', nullable: true })
  website!: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status!: PublisherStatus;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  verifiedBy!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
