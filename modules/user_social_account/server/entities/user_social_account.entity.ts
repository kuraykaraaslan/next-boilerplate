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

  // OAuth access-token expiry — drives proactive refresh + token-health checks.
  @Column({ nullable: true, type: 'timestamp' })
  accessTokenExpiresAt?: Date | null;

  // Granted OAuth scopes (audit + capability checks).
  @Column({ type: 'jsonb', nullable: true })
  scopes?: string[] | null;

  @Column({ nullable: true, type: 'timestamp' })
  lastRefreshedAt?: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  profilePicture?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
