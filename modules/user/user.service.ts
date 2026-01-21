import AppDataSource from "@/libs/typeorm";
import { UserEntity } from './user.entity';
import { User, SafeUser, UpdateUser, SafeUserSchema, UserSchema } from './user.types';
import type { UserRole, UserStatus } from './user.enums';
import bcrypt from "bcrypt";
import UserMessages from './user.messages';

export default class UserService {

  private static async getRepository() {
    return AppDataSource.getRepository(UserEntity);
  }

  static async create({ email, password, phone, userRole }: {
    email: string,
    password: string,
    phone?: string,
    userRole?: UserRole
  }): Promise<SafeUser> {
    const repository = await this.getRepository();

    if (!email) {
      throw new Error(UserMessages.INVALID_EMAIL);
    }

    const existingUser = await repository.findOne({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new Error(UserMessages.EMAIL_ALREADY_EXISTS);
    }

    if (!password) {
      throw new Error(UserMessages.INVALID_PASSWORD);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = repository.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      userRole: userRole ?? 'USER',
      userStatus: 'ACTIVE'
    });

    const savedUser = await repository.save(user);
    return SafeUserSchema.parse(savedUser);
  }

  static async getAll({ page, pageSize, search, userId }: {
    page: number,
    pageSize: number,
    search?: string,
    userId?: string
  }): Promise<{ users: SafeUser[], total: number }> {
    const repository = await this.getRepository();

    const queryBuilder = repository.createQueryBuilder('user');

    if (userId) {
      queryBuilder.andWhere('user.userId = :userId', { userId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR user.name ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [users, total] = await queryBuilder
      .skip(page * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      users: users.map((user) => SafeUserSchema.parse(user)),
      total
    };
  }

  static async getById(userId: string): Promise<SafeUser> {
    const repository = await this.getRepository();

    const user = await repository.findOne({
      where: { userId }
    });

    if (!user) {
      throw new Error(UserMessages.USER_NOT_FOUND);
    }

    return SafeUserSchema.parse(user);
  }

  static async update({ userId, data }: { userId: string, data: UpdateUser }): Promise<SafeUser> {
    const repository = await this.getRepository();

    if (!userId) {
      throw new Error(UserMessages.USER_NOT_FOUND);
    }

    const user = await repository.findOne({
      where: { userId }
    });

    if (!user) {
      throw new Error(UserMessages.USER_NOT_FOUND);
    }

    await repository.update({ userId }, {
      email: data.email,
      phone: data.phone,
      userRole: data.userRole as UserRole | undefined,
      userStatus: data.userStatus as UserStatus | undefined
    });

    const updatedUser = await repository.findOne({
      where: { userId }
    });

    return SafeUserSchema.parse(updatedUser);
  }

  static async delete(userId: string): Promise<void> {
    const repository = await this.getRepository();

    const user = await repository.findOne({
      where: { userId }
    });

    if (!user) {
      throw new Error(UserMessages.USER_NOT_FOUND);
    }

    await repository.delete({ userId });
  }

  static async getByEmail(email: string): Promise<User | null> {
    const repository = await this.getRepository();

    const user = await repository.findOne({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return null;
    }

    return UserSchema.parse(user);
  }
}
