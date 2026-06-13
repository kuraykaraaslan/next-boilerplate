import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid', { name: 'userProfileId' })
  userProfileId!: string;

  @Column({ unique: true, type: 'uuid' })
  userId!: string;

  @Column({ nullable: true, type: 'varchar' })
  name?: string;

  @Column({ nullable: true, type: 'varchar' })
  firstName?: string | null;

  @Column({ nullable: true, type: 'varchar' })
  lastName?: string | null;

  @Column({ nullable: true, type: 'varchar' })
  displayName?: string | null;

  @Column({ type: 'varchar', default: 'GIVEN_FIRST' })
  nameOrder!: string;

  @Column({ nullable: true, type: 'varchar' })
  pronouns?: string | null;

  @Column({ nullable: true, type: 'text' })
  biography?: string;

  @Column({ nullable: true, type: 'varchar' })
  profilePicture?: string;

  @Column({ nullable: true, type: 'varchar' })
  headerImage?: string;

  @Column({ type: 'jsonb', default: '[]' })
  socialLinks!: unknown[];

  @Column({ type: 'varchar', default: 'PUBLIC' })
  visibility!: string;

  @Column({ type: 'jsonb', default: '{}' })
  fieldVisibility!: Record<string, string>;

  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'varchar', default: 'UNVERIFIED' })
  verificationStatus!: string;

  @Column({ type: 'jsonb', default: '{}' })
  customFields!: Record<string, unknown>;

  @Column({ nullable: true, type: 'timestamp' })
  anonymizedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
