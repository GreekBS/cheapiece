import "server-only";

import { headers } from "next/headers";

export type MarketRequestObservability = {
  request_id: string;
  route: string;
  pathname_raw: string;
};

/** Reads correlation headers set by `src/middleware.ts` (safe outside request: fallbacks). */
export function getMarketRequestObservability(): MarketRequestObservability {
  try {
    const h = headers();
    return {
      request_id: h.get("x-request-id") ?? "unknown",
      route: h.get("x-route-label") ?? "unknown",
      pathname_raw: h.get("x-log-pathname") ?? "",
    };
  } catch {
    return { request_id: "unknown", route: "unknown", pathname_raw: "" };
  }
}
