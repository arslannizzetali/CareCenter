import { Redis } from "ioredis";
import { env } from "./index.js";

const globalForRedis = globalThis as unknown as { redis?: Redis };

const redis = new Redis(process.env.REDIS_URL!, {
  enableOfflineQueue: true,  // false ise true yap
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function ensureRedisConnected(): Promise<void> {
  if (redis.status === "wait") {
    await redis.connect();
  }
}
export { redis };