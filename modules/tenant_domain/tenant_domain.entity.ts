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

  @Column({ unique: true })
  domain!: string;

  @Column({ default: false })
  isPrimary!: boolean;

  @Column({ default: 'PENDING' })
  domainStatus!: DomainStatus;

  @Column({ nullable: true })
  verificationToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
