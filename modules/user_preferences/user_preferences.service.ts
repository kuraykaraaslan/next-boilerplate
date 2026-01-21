import AppDataSource from "@/libs/typeorm";
import { UserPreferencesEntity } from "./user_preferences.entity";
import { UserPreferences, UserPreferencesSchema } from "./user_preferences.types";

export default class UserPreferencesService {

  private static readonly repository = AppDataSource.getRepository(UserPreferencesEntity);

  static async getByUserId(userId: string): Promise<UserPreferences | null> {
    const preferences = await this.repository.findOne({
      where: { userId }
    });

    if (!preferences) {
      return null;
    }

    return UserPreferencesSchema.parse(preferences);
  }

  static async create(userId: string, data?: Partial<UserPreferences>): Promise<UserPreferences> {
    const existing = await this.repository.findOne({
      where: { userId }
    });

    if (existing) {
      throw new Error("Preferences already exist for this user");
    }

    const defaults = UserPreferencesSchema.parse({});

    const preferences = this.repository.create({
      userId,
      ...defaults,
      ...data
    });

    const saved = await this.repository.save(preferences);
    return UserPreferencesSchema.parse(saved);
  }

  static async update(userId: string, data: Partial<UserPreferences>): Promise<UserPreferences> {
    const preferences = await this.repository.findOne({
      where: { userId }
    });

    if (!preferences) {
      throw new Error("Preferences not found");
    }

    await this.repository.update({ userId }, data);

    const updated = await this.repository.findOne({
      where: { userId }
    });

    return UserPreferencesSchema.parse(updated);
  }

  static async upsert(userId: string, data: Partial<UserPreferences>): Promise<UserPreferences> {
    const existing = await this.repository.findOne({
      where: { userId }
    });

    if (existing) {
      return this.update(userId, data);
    }

    return this.create(userId, data);
  }

  static async delete(userId: string): Promise<void> {
    const preferences = await this.repository.findOne({
      where: { userId }
    });

    if (!preferences) {
      throw new Error("Preferences not found");
    }

    await this.repository.delete({ userId });
  }

  static async getOrCreateDefault(userId: string): Promise<UserPreferences> {
    const existing = await this.repository.findOne({
      where: { userId }
    });

    if (existing) {
      return UserPreferencesSchema.parse(existing);
    }

    return this.create(userId);
  }
}
