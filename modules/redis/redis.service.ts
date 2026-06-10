import { Redis } from 'ioredis';
import { env } from '@/modules/env';

// Single connection string (REDIS_URL). BullMQ requires maxRetriesPerRequest: null.
const redisOptions = { maxRetriesPerRequest: null as null };

const redisInstance = new Redis(env.REDIS_URL, redisOptions);

/** Create an independent Redis connection (e.g. for Pub/Sub subscribers) */
export const createRedisConnection = (): Redis => new Redis(env.REDIS_URL, redisOptions);

export default redisInstance;
