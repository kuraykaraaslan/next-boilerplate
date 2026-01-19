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
import type { SocialLinkItem } from "./user_profile.types";

@Entity('user_profiles')
export class UserProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  userProfileId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ nullable: true })
  name?: string;

  @Column({ type: 'text', nullable: true })
  biography?: string;

  @Column({ nullable: true })
  profilePicture?: string;

  @Column({ nullable: true })
  headerImage?: string;

  @Column({ type: 'jsonb', default: [] })
  socialLinks!: SocialLinkItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
