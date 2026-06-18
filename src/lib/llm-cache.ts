const DEFAULT_LLM_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface LlmCacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, LlmCacheEntry<unknown>>();

export function getLlmCacheTtlMs(): number {
  const hours = Number(process.env.LLM_CACHE_TTL_HOURS ?? "12");
  if (!Number.isFinite(hours) || hours <= 0) return DEFAULT_LLM_CACHE_TTL_MS;
  return hours * 60 * 60 * 1000;
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

export function clearLlmCache(key?: string): void {
  if (key) {
    store.delete(key);
    return;
  }
  store.clear();
}

export function getLlmCacheExpiresAt(key: string): number | null {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.expiresAt;
}
