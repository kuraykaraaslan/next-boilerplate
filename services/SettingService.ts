//SettingService.tsx


import { Setting } from '@/types/common/SettingTypes';
import { prisma } from '@/libs/prisma';
import redis from '@/libs/redis';

export default class SettingService {


    static REDIS_KEY_ALL = 'settings:all';
    static REDIS_KEY_PREFIX = 'settings:';

    static async getSettings(): Promise<Setting[]> {
        // Önce cache kontrol et
        const cached = await redis.get(this.REDIS_KEY_ALL);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Parse hatası varsa cache'i temizle
                await redis.del(this.REDIS_KEY_ALL);
            }
        }
        // DB'den çek, cache'e yaz
        const settings = await prisma.setting.findMany();
        await redis.set(this.REDIS_KEY_ALL, JSON.stringify(settings), 'EX', 600);
        return settings;
    }

    static async getSettingByKey(key: string): Promise<Setting | null> {
        const redisKey = this.REDIS_KEY_PREFIX + key;
        const cached = await redis.get(redisKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                await redis.del(redisKey);
            }
        }
        // DB'den çek, cache'e yaz
        const setting = await prisma.setting.findFirst({ where: { key } });
        if (setting) {
            await redis.set(redisKey, JSON.stringify(setting), 'EX', 600);
        }
        return setting;
    }

    static async createSetting(key: string, value: string): Promise<Setting> {
        const existingSetting = await this.getSettingByKey(key);
        let result: Setting;
        if (existingSetting) {
            result = await prisma.setting.update({
                where: { key },
                data: { value }
            });
        } else {
            result = await prisma.setting.create({
                data: { key, value }
            });
        }
        // Cache güncelle
        await redis.set(this.REDIS_KEY_PREFIX + key, JSON.stringify(result), 'EX', 600);
        await redis.del(this.REDIS_KEY_ALL); // toplu cache'i sil
        return result;
    }
    

    static async deleteSetting(key: string): Promise<Setting | null> {
        const existingSetting = await this.getSettingByKey(key);
        if (!existingSetting) {
            return null;
        }
        const deleted = await prisma.setting.delete({ where: { key } });
        // Cache temizle
        await redis.del(this.REDIS_KEY_PREFIX + key);
        await redis.del(this.REDIS_KEY_ALL);
        return deleted;
    }

    static async updateSettings(settings: Record<string, string>): Promise<Setting[]> {
        const updatedSettings: Setting[] = [];
        for (const key in settings) {
            const updatedSetting = await prisma.setting.upsert({
                where: { key },
                update: { value: settings[key] },
                create: { key, value: settings[key] }
            });
            updatedSettings.push(updatedSetting);
            // Her bir ayarın cache'ini güncelle
            await redis.set(this.REDIS_KEY_PREFIX + key, JSON.stringify(updatedSetting), 'EX', 600);
        }
        // Toplu cache'i sil
        await redis.del(this.REDIS_KEY_ALL);
        return updatedSettings;
    }

    /**
     * Birden fazla key ile ayarları getirir. Key-value obje döner.
     */
    static async getSettingsByKeys(keys: string[]): Promise<Record<string, any>> {
        const result: Record<string, any> = {};
        if (!Array.isArray(keys) || keys.length === 0) return result;
        // Redis'ten toplu çekmeye çalış
        const redisKeys = keys.map(k => this.REDIS_KEY_PREFIX + k);
        const cachedArr = await redis.mget(...redisKeys);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const cached = cachedArr[i];
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    result[key] = parsed.value;
                    continue;
                } catch { /* ignore */ }
            }
            // Cache yoksa DB'den çek
            const setting = await prisma.setting.findFirst({ where: { key } });
            if (setting) {
                result[key] = setting.value;
                await redis.set(this.REDIS_KEY_PREFIX + key, JSON.stringify(setting), 'EX', 600);
            }
        }
        return result;
    }

}