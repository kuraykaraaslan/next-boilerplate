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
import type { Theme, Language, DateFormat, TimeFormat, FirstDayOfWeek } from "./user_preferences.enums";

@Entity('user_preferences')
export class UserPreferencesEntity {
  @PrimaryGeneratedColumn('uuid')
  userPreferencesId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ default: 'SYSTEM' })
  theme!: Theme;

  @Column({ default: 'EN' })
  language!: Language;

  @Column({ default: true })
  emailNotifications!: boolean;

  @Column({ default: false })
  smsNotifications!: boolean;

  @Column({ default: true })
  pushNotifications!: boolean;

  @Column({ default: true })
  newsletter!: boolean;

  @Column({ default: 'UTC' })
  timezone!: string;

  @Column({ default: 'DD/MM/YYYY' })
  dateFormat!: DateFormat;

  @Column({ default: '24H' })
  timeFormat!: TimeFormat;

  @Column({ default: 'MON' })
  firstDayOfWeek!: FirstDayOfWeek;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
