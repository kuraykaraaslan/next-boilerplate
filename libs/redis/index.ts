import { Redis } from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = process.env.REDIS_PORT || "6379";
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";

export const redisConnectionOptions = {
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null as null, // Required by BullMQ
};

const redisInstance = new Redis(redisConnectionOptions);

/** Create an independent Redis connection (e.g. for Pub/Sub subscribers) */
export const createRedisConnection = (): Redis => new Redis(redisConnectionOptions);

export default redisInstance;