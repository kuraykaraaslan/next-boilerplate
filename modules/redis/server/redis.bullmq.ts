import { Redis } from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { env } from '@nb/env';
import Logger from '@nb/logger';

// Single shared BullMQ connection — reused across all queues so we don't leak
// one connection handle per createQueue() call.
let _bullmqConnection: Redis | null = null;

export function getBullMQConnection(): Redis {
  if (!_bullmqConnection) {
    _bullmqConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    _bullmqConnection.on('error', (err) =>
      Logger.error(`[Redis:bullmq] connection error: ${err.message}`),
    );
    _bullmqConnection.on('ready', () => Logger.info('[Redis:bullmq] ready'));
  }
  return _bullmqConnection;
}

export function createQueue<T = unknown>(name: string): Queue<T> {
  return new Queue<T>(name, { connection: getBullMQConnection() });
}

/** Create a BullMQ Worker with the shared connection. */
export function createWorker<T = unknown>(
  name: string,
  processor: ConstructorParameters<typeof Worker<T>>[1],
  opts?: Omit<ConstructorParameters<typeof Worker<T>>[2], 'connection'>,
): Worker<T> {
  return new Worker<T>(name, processor, { ...opts, connection: getBullMQConnection() });
}

/** Gracefully close the shared BullMQ connection (call on process shutdown). */
export async function closeBullMQConnection(): Promise<void> {
  if (_bullmqConnection) {
    await _bullmqConnection.quit().catch(() => {});
    _bullmqConnection = null;
  }
}
