import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_securities')
export class UserSecurity {
  @PrimaryGeneratedColumn('uuid', { name: 'userSecurityId' })
  userSecurityId!: string;

  @Column({ unique: true, type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: ['EMAIL', 'SMS', 'TOTP_APP'], array: true, default: '{}' })
  otpMethods!: string[];

  @Column({ nullable: true, type: 'varchar' })
  otpSecret?: string;

  @Column({ type: 'jsonb', default: '[]' })
  otpBackupCodes!: unknown[];

  @Column({ nullable: true, type: 'timestamp' })
  lastLoginAt?: Date;

  @Column({ nullable: true, type: 'varchar' })
  lastLoginIp?: string;

  @Column({ nullable: true, type: 'varchar' })
  lastLoginDevice?: string;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ nullable: true, type: 'timestamp' })
  lockedUntil?: Date;

  @Column({ type: 'boolean', default: false })
  passkeyEnabled!: boolean;

  @Column({ type: 'jsonb', default: '[]' })
  passkeys!: unknown[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
