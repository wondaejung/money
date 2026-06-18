import { deleteLlmStoreJson, getLlmStoreJson, setLlmStoreJson } from "@/lib/llm-store";

const DEFAULT_LLM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface LlmCacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, LlmCacheEntry<unknown>>();

export function getLlmCacheTtlMs(): number {
  const hours = Number(process.env.LLM_CACHE_TTL_HOURS ?? "24");
  if (!Number.isFinite(hours) || hours <= 0) return DEFAULT_LLM_CACHE_TTL_MS;
  return hours * 60 * 60 * 1000;
}

function cacheStoreKey(key: string): string {
  return `cache:${key}`;
}

export function getLlmCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setLlmCache<T>(key: string, value: T, ttlMs = getLlmCacheTtlMs()): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function getLlmCacheAsync<T>(key: string): Promise<T | null> {
  const memory = getLlmCache<T>(key);
  if (memory) return memory;

  const remote = await getLlmStoreJson<T>(cacheStoreKey(key));
  if (!remote) return null;

  setLlmCache(key, remote);
  return remote;
}

export async function setLlmCacheAsync<T>(key: string, value: T): Promise<void> {
  const ttlMs = getLlmCacheTtlMs();
  setLlmCache(key, value, ttlMs);
  const ttlSeconds = Math.max(60, Math.ceil(ttlMs / 1000));
  await setLlmStoreJson(cacheStoreKey(key), value, ttlSeconds);
}

export function clearLlmCache(key?: string): void {
  if (key) {
    store.delete(key);
    return;
  }
  store.clear();
}

export async function clearLlmCacheAsync(key?: string): Promise<void> {
  if (key) {
    clearLlmCache(key);
    await deleteLlmStoreJson(cacheStoreKey(key));
    return;
  }

  clearLlmCache();
}

export function getLlmCacheExpiresAt(key: string): number | null {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.expiresAt;
}
