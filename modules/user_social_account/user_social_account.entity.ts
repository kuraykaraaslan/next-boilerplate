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

  @Column()
  provider!: SocialAccountProvider;

  @Column()
  providerId!: string;

  @Column({ nullable: true })
  accessToken?: string;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ nullable: true })
  profilePicture?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
