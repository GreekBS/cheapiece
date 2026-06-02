import "server-only";

export type MarketTimingLog = {
  msg: "market_timing";
  request_id: string;
  route: string;
  pathname_raw?: string;
  tenant_id: string;
  op: string;
  duration_ms: number;
  status: "ok" | "error";
  error_code: string | null;
};

/** Single-line JSON for log drains (stdout). */
export function logMarketTiming(line: MarketTimingLog): void {
  // eslint-disable-next-line no-console -- intentional structured logging
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: "info", ...line }));
}
