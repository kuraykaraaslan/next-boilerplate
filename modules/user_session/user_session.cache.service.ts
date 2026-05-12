import redis from "@/modules/redis";
import Logger from "@/modules/logger";

export default class UserSessionCacheService {
  static async clearUserSessionCache(userId: string): Promise<void> {
    try {
      const pattern = `session:${userId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      Logger.error(`Failed to clear session cache for user ${userId}`);
    }
  }
}
