import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique
} from "typeorm";
import { UserEntity } from "../user/user.entity";
import type { SocialAccountProvider } from "./user_social_account.enums";

@Entity('user_social_accounts')
@Unique(["provider", "providerId"])
@Index(["userId"])
export class UserSocialAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  userSocialAccountId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'varchar' })
  provider!: SocialAccountProvider;

  @Column({ type: 'varchar' })
  providerId!: string;

  @Column({ type: 'text', nullable: true })
  accessToken?: string;

  @Column({ type: 'text', nullable: true })
  refreshToken?: string;

  @Column({ type: 'varchar', nullable: true })
  profilePicture?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
