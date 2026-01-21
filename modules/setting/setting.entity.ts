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
  @PrimaryColumn({ type: 'varchar' })
  key!: string;

  @Column({ type: 'text' })
  value!: string;

  @Column({ type: 'varchar', default: 'general' })
  group!: string;

  @Column({ type: 'varchar', default: 'string' })
  type!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt!: Date | null;
}
