/** Temporary Phase 2 instrumentation — remove after perf verification. */

export type MerchantStoreLayoutKind = "root" | "workspace" | "vendor-shell";

export function logMerchantStoreLayoutExecution(args: {
  layout: MerchantStoreLayoutKind;
  vendorId: string;
  pathname: string | null;
  workspaceQueries?: string[];
}): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level: "info",
    domain: "merchant_store_perf",
    event: "layout_execute",
    ...args,
  });

  // eslint-disable-next-line no-console -- temporary verification logging
  console.info(line);
}
