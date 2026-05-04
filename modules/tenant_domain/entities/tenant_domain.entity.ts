import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('tenant_domains')
export class TenantDomain {
  @PrimaryGeneratedColumn('uuid', { name: 'tenantDomainId' })
  tenantDomainId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', unique: true })
  domain!: string;

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  @Column({ type: 'varchar', default: 'PENDING' })
  domainStatus!: string;

  @Column({ nullable: true, type: 'varchar' })
  verificationToken?: string;

  @Column({ nullable: true, type: 'timestamp' })
  verifiedAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
