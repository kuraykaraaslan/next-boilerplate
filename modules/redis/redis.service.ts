import { Redis } from 'ioredis';
import { env } from '@/modules/env';

export const redisConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || '',
  maxRetriesPerRequest: null as null, // Required by BullMQ
};

const redisInstance = new Redis(redisConnectionOptions);

/** Create an independent Redis connection (e.g. for Pub/Sub subscribers) */
export const createRedisConnection = (): Redis => new Redis(redisConnectionOptions);

export default redisInstance;
