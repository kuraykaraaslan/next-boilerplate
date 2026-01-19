import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index
} from "typeorm";
import type { TenantStatus } from "./tenant.enums";

@Entity('tenants')
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  tenantId!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 'ACTIVE' })
  tenantStatus!: TenantStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
