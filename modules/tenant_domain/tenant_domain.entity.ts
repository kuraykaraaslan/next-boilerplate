import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from "typeorm";
import { TenantEntity } from "../tenant/tenant.entity";
import type { DomainStatus } from "./tenant_domain.enums";

@Entity('tenant_domains')
@Index(["domain"], { unique: true })
@Index(["tenantId"])
export class TenantDomainEntity {
  @PrimaryGeneratedColumn('uuid')
  tenantDomainId!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @Column({ type: 'varchar', unique: true })
  domain!: string;

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  @Column({ type: 'varchar', default: 'PENDING' })
  domainStatus!: DomainStatus;

  @Column({ type: 'varchar', nullable: true })
  verificationToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
