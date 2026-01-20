// libs/redis/bullmq.ts
import { ConnectionOptions } from "bullmq";

export function getBullMQConnection(): ConnectionOptions {
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
}
