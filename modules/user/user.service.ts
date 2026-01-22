import { prisma } from "@/libs/prisma";
import type { Prisma } from '@/prisma/client';
import { User, SafeUser, UpdateUser, SafeUserSchema, UserSchema } from './user.types';
import type { UserRole, UserStatus } from './user.enums';
import bcrypt from "bcrypt";
import UserMessages from './user.messages';

export default class UserService {

  static async create({ email, password, phone, userRole }: {
    email: string,
    password: string,
    phone?: string,
    userRole?: UserRole
  }): Promise<SafeUser> {

    if (!email) {
      throw new Error(UserMessages.INVALID_EMAIL);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new Error(UserMessages.EMAIL_ALREADY_EXISTS);
    }

    if (!password) {
      throw new Error(UserMessages.INVALID_PASSWORD);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        phone,
        userRole: userRole ?? 'USER',
        userStatus: 'ACTIVE'
      }
    });

    return SafeUserSchema.parse(user);
  }

  static async getAll({ page, pageSize, search, userId }: {
    page: number,
    pageSize: number,
    search?: string,
    userId?: string
  }): Promise<{ users: SafeUser[], total: number }> {

    const where: Prisma.UserWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: page * pageSize,
        take: pageSize
      }),
      prisma.user.count({ where })
    ]);

    return {
      users: users.map((user) => SafeUserSchema.parse(user)),
      total
    };
  }

  static async getById(userId: string): Promise<SafeUser> {

    const user = await prisma.user.findUnique({
      where: { userId }
    });

    if (!user) {
      throw new Error(UserMessages.USER_NOT_FOUND);
    }

    return SafeUserSchema.parse(user);
  }

  static async update({ userId, data }: { userId: string, data: UpdateUser }): Promise<SafeUser> {

    if (!userId) {
      throw new Error(UserMessages.USER_NOT_FOUND);
    }

    const user = await prisma.user.findUnique({
      where: { userId }
    });

    if (!user) {
      throw new Error(UserMessages.USER_NOT_FOUND);
    }

    const updatedUser = await prisma.user.update({
      where: { userId },
      data: {
        email: data.email,
        phone: data.phone,
        userRole: data.userRole as UserRole | undefined,
        userStatus: data.userStatus as UserStatus | undefined
      }
    });

    return SafeUserSchema.parse(updatedUser);
  }

  static async delete(userId: string): Promise<void> {

    const user = await prisma.user.findUnique({
      where: { userId }
    });

    if (!user) {
      throw new Error(UserMessages.USER_NOT_FOUND);
    }

    await prisma.user.delete({ where: { userId } });
  }

  static async getByEmail(email: string): Promise<User | null> {

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return null;
    }

    return UserSchema.parse(user);
  }
}
