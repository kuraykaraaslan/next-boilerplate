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

  @Column({ type: 'varchar', default: 'SYSTEM' })
  theme!: Theme;

  @Column({ type: 'varchar', default: 'EN' })
  language!: Language;

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

  @Column({ type: 'varchar', default: 'DD/MM/YYYY' })
  dateFormat!: DateFormat;

  @Column({ type: 'varchar', default: '24H' })
  timeFormat!: TimeFormat;

  @Column({ type: 'varchar', default: 'MON' })
  firstDayOfWeek!: FirstDayOfWeek;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
