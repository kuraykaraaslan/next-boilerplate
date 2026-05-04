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

  @Column({ nullable: true, type: 'text' })
  biography?: string;

  @Column({ nullable: true, type: 'varchar' })
  profilePicture?: string;

  @Column({ nullable: true, type: 'varchar' })
  headerImage?: string;

  @Column({ type: 'jsonb', default: '[]' })
  socialLinks!: unknown[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
