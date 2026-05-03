// libs/redis/bullmq.ts
import { ConnectionOptions } from "bullmq";
import { env } from "@/libs/env";

export function getBullMQConnection(): ConnectionOptions {
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
}
