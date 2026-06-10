import { Redis } from 'ioredis';
import { ConnectionOptions, Queue } from 'bullmq';
import { env } from '@/modules/env';

export function getBullMQConnection(): ConnectionOptions {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}


export function createQueue<T = unknown>(name: string): Queue<T> {
  return new Queue<T>(name, { connection: getBullMQConnection() });
}
