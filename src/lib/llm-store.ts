import {
  deletePortfolioFromStore,
  getPortfolioFromStore,
  incrementPortfolioStoreCounter,
  isPortfolioStoreConfigured,
  setPortfolioInStoreWithTtl,
} from "@/lib/portfolio-kv";

const KEY_PREFIX = "llm:";

function fullKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

export function isLlmStoreConfigured(): boolean {
  return isPortfolioStoreConfigured();
}

export async function getLlmStoreJson<T>(key: string): Promise<T | null> {
  if (!isLlmStoreConfigured()) return null;
  return getPortfolioFromStore<T>(fullKey(key));
}

export async function setLlmStoreJson<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  if (!isLlmStoreConfigured()) return;
  await setPortfolioInStoreWithTtl(fullKey(key), value, ttlSeconds);
}

export async function deleteLlmStoreJson(key: string): Promise<void> {
  if (!isLlmStoreConfigured()) return;
  await deletePortfolioFromStore(fullKey(key));
}

export async function incrementLlmStoreCounter(
  key: string,
  ttlSeconds: number,
): Promise<number> {
  if (!isLlmStoreConfigured()) return 0;
  return incrementPortfolioStoreCounter(fullKey(key), ttlSeconds);
}
