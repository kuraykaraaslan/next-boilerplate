import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "../user/user.entity";
import type { SessionStatus } from "./user_session.enums";

@Entity("user_sessions")
@Index(["userId"])
@Index(["accessToken"])
@Index(["refreshToken"])
export class UserSessionEntity {
  @PrimaryGeneratedColumn("uuid")
  userSessionId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: UserEntity;

  @Column({ type: 'text' })
  accessToken!: string;

  @Column({ type: 'text' })
  refreshToken!: string;

  @Column({ type: 'varchar', nullable: true })
  deviceFingerprint?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', default: "ACTIVE" })
  sessionStatus!: SessionStatus;

  @Column({ type: 'boolean', default: false })
  otpVerifyNeeded!: boolean;

  @Column({ type: "timestamp" })
  sessionExpiry!: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
