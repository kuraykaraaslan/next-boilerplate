import { Redis, type RedisOptions } from 'ioredis';
import { env } from '@kuraykaraaslan/env';
import Logger from '@kuraykaraaslan/logger';

const BASE_OPTIONS: RedisOptions = { maxRetriesPerRequest: null };

function buildOptions(): RedisOptions {
  // Prefer Sentinel config when REDIS_SENTINELS is provided (comma-separated host:port list).
  // e.g. REDIS_SENTINELS=sentinel1:26379,sentinel2:26379  REDIS_SENTINEL_NAME=mymaster
  if (env.REDIS_SENTINELS) {
    const sentinels = env.REDIS_SENTINELS.split(',').map((s) => {
      const [host, portStr] = s.trim().split(':');
      return { host, port: parseInt(portStr ?? '26379', 10) };
    });
    return {
      ...BASE_OPTIONS,
      sentinels,
      name: env.REDIS_SENTINEL_NAME ?? 'mymaster',
      password: env.REDIS_PASSWORD,
      sentinelPassword: env.REDIS_SENTINEL_PASSWORD,
    };
  }
  return BASE_OPTIONS;
}

function attachLifecycleListeners(client: Redis, label: string): Redis {
  client.on('error', (err) => Logger.error(`[Redis:${label}] connection error: ${err.message}`));
  client.on('reconnecting', () => Logger.warn(`[Redis:${label}] reconnecting…`));
  client.on('ready', () => Logger.info(`[Redis:${label}] ready`));
  return client;
}

const redisInstance = attachLifecycleListeners(
  env.REDIS_SENTINELS
    ? new Redis(buildOptions())
    : new Redis(env.REDIS_URL, buildOptions()),
  'default',
);

/** Create an independent Redis connection (e.g. for Pub/Sub subscribers). */
export const createRedisConnection = (): Redis =>
  attachLifecycleListeners(
    env.REDIS_SENTINELS
      ? new Redis(buildOptions())
      : new Redis(env.REDIS_URL, buildOptions()),
    'pubsub',
  );

export default redisInstance;
