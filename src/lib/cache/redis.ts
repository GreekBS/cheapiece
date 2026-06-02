import "server-only";

import { createClient } from "redis";

type AppRedisClient = ReturnType<typeof createClient>;

let client: AppRedisClient | null = null;
let connectPromise: Promise<AppRedisClient | null> | null = null;

function getRedisUrl(): string | undefined {
  const url = process.env.REDIS_URL?.trim();
  return url && url.length > 0 ? url : undefined;
}

/**
 * Lazy singleton Redis client. Returns null when REDIS_URL is unset or connection fails.
 * Cache is non-authoritative — callers must fall back to DB.
 */
export async function getRedisClient(): Promise<AppRedisClient | null> {
  const url = getRedisUrl();
  if (!url) {
    return null;
  }

  if (client?.isOpen) {
    return client;
  }

  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        const next = createClient({ url });
        next.on("error", (err: Error) => {
          console.error("[redis] client error", err.message);
        });
        await next.connect();
        client = next;
        return client;
      } catch (err) {
        console.error("[redis] connect failed", err instanceof Error ? err.message : err);
        client = null;
        return null;
      } finally {
        connectPromise = null;
      }
    })();
  }

  return connectPromise;
}

export function isRedisConfigured(): boolean {
  return Boolean(getRedisUrl());
}
