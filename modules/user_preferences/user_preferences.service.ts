import { prisma } from "@/libs/prisma";
import { UserPreferences, UserPreferencesDefault, UserPreferencesSchema } from "./user_preferences.types";

export default class UserPreferencesService {

  static async getByUserId(userId: string): Promise<UserPreferences | null> {
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId }
    });

    if (!preferences) {
      return null;
    }

    return UserPreferencesSchema.parse(preferences);
  }

  static async create(userId: string, data?: Partial<UserPreferences>): Promise<UserPreferences> {
    const existing = await prisma.userPreferences.findUnique({
      where: { userId }
    });

    if (existing) {
      throw new Error("Preferences already exist for this user");
    }

    const preferences = await prisma.userPreferences.create({
      data: {
        userId,
        ...UserPreferencesDefault,
        ...data
      }
    });

    return UserPreferencesSchema.parse(preferences);
  }

  static async update(userId: string, data: Partial<UserPreferences>): Promise<UserPreferences> {
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId }
    });

    if (!preferences) {
      throw new Error("Preferences not found");
    }

    const updated = await prisma.userPreferences.update({
      where: { userId },
      data
    });

    return UserPreferencesSchema.parse(updated);
  }

  static async upsert(userId: string, data: Partial<UserPreferences>): Promise<UserPreferences> {
    const defaults = UserPreferencesSchema.parse({});

    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...defaults,
        ...data
      }
    });

    return UserPreferencesSchema.parse(preferences);
  }

  static async delete(userId: string): Promise<void> {
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId }
    });

    if (!preferences) {
      throw new Error("Preferences not found");
    }

    await prisma.userPreferences.delete({ where: { userId } });
  }

  static async getOrCreateDefault(userId: string): Promise<UserPreferences> {
    const existing = await prisma.userPreferences.findUnique({
      where: { userId }
    });

    if (existing) {
      return UserPreferencesSchema.parse(existing);
    }

    return this.create(userId);
  }
}
