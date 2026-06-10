import { Redis } from 'ioredis';
import { env } from '@/modules/env';
import Logger from '@/modules/logger';

// Single connection string (REDIS_URL). BullMQ requires maxRetriesPerRequest: null.
const redisOptions = { maxRetriesPerRequest: null as null };

function attachLifecycleListeners(client: Redis, label: string): Redis {
  client.on('error', (err) => Logger.error(`[Redis:${label}] connection error: ${err.message}`));
  client.on('reconnecting', () => Logger.warn(`[Redis:${label}] reconnecting…`));
  client.on('ready', () => Logger.info(`[Redis:${label}] ready`));
  return client;
}

const redisInstance = attachLifecycleListeners(new Redis(env.REDIS_URL, redisOptions), 'default');

/** Create an independent Redis connection (e.g. for Pub/Sub subscribers) */
export const createRedisConnection = (): Redis =>
  attachLifecycleListeners(new Redis(env.REDIS_URL, redisOptions), 'pubsub');

export default redisInstance;
