import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from "typeorm";
import type { UserRole, UserStatus } from "./user.enums";

@Entity('users')
@Index(["email"])
@Index(["phone"])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  userId!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column()
  password!: string;

  
  @Column({ default: 'USER' })
  userRole!: UserRole;

  @Column({ default: 'ACTIVE' })
  userStatus!: UserStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
