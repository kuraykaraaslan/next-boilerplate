import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique
} from "typeorm";
import { TenantEntity } from "../tenant/tenant.entity";
import { UserEntity } from "../user/user.entity";
import type { TenantMemberRole, TenantMemberStatus } from "./tenant_member.enums";

@Entity('tenant_members')
@Index(["tenantId", "userId"], { unique: true })
@Index(["tenantId"])
@Index(["userId"])
export class TenantMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  tenantMemberId!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ default: 'USER' })
  memberRole!: TenantMemberRole;

  @Column({ default: 'ACTIVE' })
  memberStatus!: TenantMemberStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
