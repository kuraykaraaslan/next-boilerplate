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

  @Column()
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: UserEntity;

  @Column()
  accessToken!: string;

  @Column()
  refreshToken!: string;

  @Column({ nullable: true })
  deviceFingerprint?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ default: "ACTIVE" })
  sessionStatus!: SessionStatus;

  @Column({ default: false })
  otpVerifyNeeded!: boolean;

  @Column({ type: "timestamp" })
  sessionExpiry!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
