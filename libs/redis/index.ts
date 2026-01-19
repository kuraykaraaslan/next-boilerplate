import { Redis } from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = process.env.REDIS_PORT || "6379";
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";

const redisInstance = new Redis({
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required by BullMQ
});

/**
 * Returns a new Redis connection for BullMQ workers/queues
 * BullMQ requires separate connections for Queue and Worker
 */
export function getBullMQConnection(): Redis {
  return new Redis({
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });
}

export default redisInstance;