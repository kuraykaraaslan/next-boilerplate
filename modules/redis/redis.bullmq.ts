import { ConnectionOptions, Queue } from 'bullmq';
import { env } from '@/modules/env';

export function getBullMQConnection(): ConnectionOptions {
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
}


export function createQueue<T = unknown>(name: string): Queue<T> {
  return new Queue<T>(name, { connection: getBullMQConnection() });
}