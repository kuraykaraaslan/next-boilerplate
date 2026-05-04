import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Unique(['provider', 'providerId'])
@Entity('user_social_accounts')
export class UserSocialAccount {
  @PrimaryGeneratedColumn('uuid', { name: 'userSocialAccountId' })
  userSocialAccountId!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  provider!: string;

  @Column({ type: 'varchar' })
  providerId!: string;

  @Column({ nullable: true, type: 'text' })
  accessToken?: string;

  @Column({ nullable: true, type: 'text' })
  refreshToken?: string;

  @Column({ nullable: true, type: 'varchar' })
  profilePicture?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
