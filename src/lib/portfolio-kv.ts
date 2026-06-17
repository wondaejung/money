import { kv } from "@vercel/kv";
import { Redis } from "@upstash/redis";
import { createClient, type RedisClientType } from "redis";

type PortfolioStoreBackend = "redis-url" | "upstash-rest" | "vercel-kv";

function getBackend(): PortfolioStoreBackend | null {
  if (process.env.REDIS_URL) return "redis-url";
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return "upstash-rest";
  }
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return "vercel-kv";
  }
  return null;
}

export function isPortfolioStoreConfigured(): boolean {
  return getBackend() !== null;
}

const globalForRedis = globalThis as typeof globalThis & {
  portfolioRedis?: RedisClientType;
};

async function getUrlRedisClient(): Promise<RedisClientType> {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not configured.");
  }

  if (!globalForRedis.portfolioRedis) {
    const client = createClient({ url });
    client.on("error", (error) => {
      console.error("Redis client error:", error);
    });
    await client.connect();
    globalForRedis.portfolioRedis = client;
  }

  return globalForRedis.portfolioRedis;
}

function getRestRedisClient(): Redis | typeof kv {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return Redis.fromEnv();
  }
  return kv;
}

export async function getPortfolioFromStore<T>(key: string): Promise<T | null> {
  const backend = getBackend();
  if (!backend) return null;

  if (backend === "redis-url") {
    const client = await getUrlRedisClient();
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  return getRestRedisClient().get<T>(key);
}

export async function setPortfolioInStore<T>(
  key: string,
  value: T,
): Promise<void> {
  const backend = getBackend();
  if (!backend) {
    throw new Error("Portfolio store is not configured.");
  }

  if (backend === "redis-url") {
    const client = await getUrlRedisClient();
    await client.set(key, JSON.stringify(value));
    return;
  }

  await getRestRedisClient().set(key, value);
}
