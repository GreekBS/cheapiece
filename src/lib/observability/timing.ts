import "server-only";

import * as Sentry from "@sentry/nextjs";

import { getPublicMarketplaceTenantId } from "@/lib/marketplace/public-tenant";

import { logMarketTiming } from "./log";
import { getMarketRequestObservability } from "./request-headers";

export type MarketTimingOp = "category_resolve" | "products_page" | "offers_list" | "catalog_product" | "brands_query";

function extractErrorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && typeof (err as { code: string }).code === "string") {
    return (err as { code: string }).code;
  }
  if (err instanceof Error) return err.name;
  return "unknown";
}

function resolveTenantIdForLog(): string {
  try {
    return getPublicMarketplaceTenantId();
  } catch {
    return "";
  }
}

/**
 * Wraps a Supabase-backed operation: structured log + optional Sentry span.
 * Sentry span attributes: normalized route + op only (no slug / path in tags).
 */
export async function withMarketTiming<T>(op: MarketTimingOp, fn: () => Promise<T>): Promise<T> {
  const { request_id, route, pathname_raw } = getMarketRequestObservability();
  const tenant_id = resolveTenantIdForLog();
  const t0 = performance.now();

  const exec = async (): Promise<T> => {
    try {
      const result = await fn();
      const duration_ms = Math.round(performance.now() - t0);
      logMarketTiming({
        msg: "market_timing",
        request_id,
        route,
        pathname_raw: pathname_raw || undefined,
        tenant_id,
        op,
        duration_ms,
        status: "ok",
        error_code: null,
      });
      return result;
    } catch (err) {
      const duration_ms = Math.round(performance.now() - t0);
      const error_code = extractErrorCode(err);
      logMarketTiming({
        msg: "market_timing",
        request_id,
        route,
        pathname_raw: pathname_raw || undefined,
        tenant_id,
        op,
        duration_ms,
        status: "error",
        error_code,
      });
      Sentry.captureException(err, {
        tags: { route_normalized: route, db_operation: op },
        extra: { request_id, error_code },
      });
      throw err;
    }
  };

  const hasSentry = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
  if (!hasSentry) {
    return exec();
  }

  return await Sentry.startSpan(
    {
      name: `market.${op}`,
      op: "db.supabase",
      attributes: {
        route_normalized: route,
        db_operation: op,
      },
    },
    async () => exec(),
  );
}
