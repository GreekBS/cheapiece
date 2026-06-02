import "server-only";

import type { ProductMarketViewModel } from "@/modules/catalog-products-read/ui/dto/product-market.vm";

import { getRedisClient } from "./redis";

const PDP_TTL_SECONDS = 90;
const PDP_CACHE_SCHEMA_VERSION = "v2";

export type PdpCacheEnvelope = ProductMarketViewModel;

export function buildPdpCacheKey(tenantId: string, productId: string, statsVersion: number): string {
  return `mkt:${tenantId}:pdp:${PDP_CACHE_SCHEMA_VERSION}:${productId}:sv${statsVersion}`;
}

export function buildPdpCacheKeyPattern(tenantId: string, productId: string, schemaVersion = PDP_CACHE_SCHEMA_VERSION): string {
  return `mkt:${tenantId}:pdp:${schemaVersion}:${productId}:sv*`;
}

export async function getPdpFromCache(
  tenantId: string,
  productId: string,
  statsVersion: number,
): Promise<PdpCacheEnvelope | null> {
  const redis = await getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const raw = await redis.get(buildPdpCacheKey(tenantId, productId, statsVersion));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PdpCacheEnvelope;
  } catch (err) {
    console.error("[pdp-cache] get failed", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function setPdpCache(
  tenantId: string,
  productId: string,
  envelope: PdpCacheEnvelope,
): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) {
    return;
  }

  try {
    const key = buildPdpCacheKey(tenantId, productId, envelope.statsVersion);
    await redis.set(key, JSON.stringify(envelope), { EX: PDP_TTL_SECONDS });
  } catch (err) {
    console.error("[pdp-cache] set failed", err instanceof Error ? err.message : err);
  }
}

async function collectKeysByPattern(redis: NonNullable<Awaited<ReturnType<typeof getRedisClient>>>, pattern: string): Promise<string[]> {
  const keys: string[] = [];
  for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
    keys.push(key);
  }
  return keys;
}

export async function invalidatePdpCache(tenantId: string, productId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) {
    return;
  }

  try {
    const patterns = [
      buildPdpCacheKeyPattern(tenantId, productId, "v2"),
      buildPdpCacheKeyPattern(tenantId, productId, "v1"),
    ];
    const keys = new Set<string>();
    for (const pattern of patterns) {
      for (const key of await collectKeysByPattern(redis, pattern)) {
        keys.add(key);
      }
    }
    if (keys.size > 0) {
      await redis.del([...keys]);
    }
  } catch (err) {
    console.error("[pdp-cache] invalidate failed", err instanceof Error ? err.message : err);
  }
}
