import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid', { name: 'userPreferencesId' })
  userPreferencesId!: string;

  @Column({ unique: true, type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', default: 'SYSTEM' })
  theme!: string;

  @Column({ type: 'varchar', default: 'EN' })
  language!: string;

  @Column({ type: 'boolean', default: true })
  emailNotifications!: boolean;

  @Column({ type: 'boolean', default: false })
  smsNotifications!: boolean;

  @Column({ type: 'boolean', default: true })
  pushNotifications!: boolean;

  @Column({ type: 'boolean', default: true })
  newsletter!: boolean;

  @Column({ type: 'varchar', default: 'UTC' })
  timezone!: string;

  @Column({ type: 'varchar', default: 'DD_MM_YYYY' })
  dateFormat!: string;

  @Column({ type: 'varchar', default: 'H24' })
  timeFormat!: string;

  @Column({ type: 'varchar', default: 'MON' })
  firstDayOfWeek!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
