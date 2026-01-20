import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from "typeorm";

@Entity('settings')
@Index(["group"])
export class SettingEntity {
  @PrimaryColumn()
  key!: string;

  @Column({ type: 'text' })
  value!: string;

  @Column({ default: 'general' })
  group!: string;

  @Column({ default: 'string' })
  type!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt!: Date | null;
}
