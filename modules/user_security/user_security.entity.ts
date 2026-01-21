import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn
} from "typeorm";
import { UserEntity } from "../user/user.entity";
import type { OTPMethod } from "./user_security.enums";

@Entity('user_securities')
export class UserSecurityEntity {
  @PrimaryGeneratedColumn('uuid')
  userSecurityId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'jsonb', default: [] })
  otpMethods!: OTPMethod[];

  @Column({ type: 'varchar', nullable: true })
  otpSecret?: string;

  @Column({ type: 'jsonb', default: [] })
  otpBackupCodes!: string[];

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  lastLoginIp?: string;

  @Column({ type: 'varchar', nullable: true })
  lastLoginDevice?: string;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
