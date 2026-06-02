import type { PostgrestError } from "@supabase/supabase-js";

import { logger } from "@/lib/observability/logger";

import type { CatalogProductRequestQueryMeta } from "../types/catalog-product-request-query-result";

const IS_DEV = process.env.NODE_ENV === "development";

export type SupabaseQueryRunResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export type ExecuteSupabaseQuerySuccess<T> = {
  ok: true;
  data: T;
  meta: CatalogProductRequestQueryMeta;
  durationMs: number;
};

export type ExecuteSupabaseQueryFailure = {
  ok: false;
  errorMessage: string;
  meta: CatalogProductRequestQueryMeta;
  durationMs: number;
  supabaseError: { message: string; code?: string } | null;
};

export type ExecuteSupabaseQueryResult<T> = ExecuteSupabaseQuerySuccess<T> | ExecuteSupabaseQueryFailure;

function buildMeta(
  functionName: string,
  context?: { vendorId?: string; requestId?: string },
): CatalogProductRequestQueryMeta {
  return {
    source: "supabase",
    function: functionName,
    ...(context?.vendorId ? { vendorId: context.vendorId } : {}),
    ...(context?.requestId ? { id: context.requestId } : {}),
  };
}

/** Structured info log for catalog request read observability (admin + merchant lists). */
export function logCatalogRequestQueryOutcome(params: {
  function: string;
  vendorId?: string;
  requestId?: string;
  result: "success" | "error";
  count: number;
  durationMs: number;
}): void {
  // eslint-disable-next-line no-console -- intentional structured logging
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "info",
      domain: "catalog_requests",
      function: params.function,
      vendorId: params.vendorId,
      id: params.requestId,
      result: params.result,
      count: params.count,
      durationMs: params.durationMs,
    }),
  );
}

function failLoudInDev(functionName: string, message: string, code?: string): void {
  if (!IS_DEV) return;
  throw new Error(`[catalog_requests:${functionName}] ${message}${code ? ` (${code})` : ""}`);
}

/**
 * Central Supabase read executor for catalog_product_requests queries.
 * Never swallows errors; DEV throws on failure (fail-loud).
 */
type ExecuteSupabaseQueryOptions<T> = {
  functionName: string;
  vendorId?: string;
  requestId?: string;
  userErrorMessage: string;
  emptyDataMessage: string;
  /** When true, null data without Supabase error is a successful empty result (e.g. maybeSingle miss). */
  allowNullData?: boolean;
  run: () => Promise<SupabaseQueryRunResult<T>>;
};

async function runExecuteSupabaseQuery<T>(
  options: ExecuteSupabaseQueryOptions<T>,
): Promise<ExecuteSupabaseQueryResult<T>> {
  const meta = buildMeta(options.functionName, {
    vendorId: options.vendorId,
    requestId: options.requestId,
  });
  const started = performance.now();

  const { data, error } = await options.run();
  const durationMs = Math.round(performance.now() - started);

  if (error) {
    logger.error({
      domain: "catalog_requests",
      function: options.functionName,
      vendorId: options.vendorId,
      id: options.requestId,
      durationMs,
      result: "error",
      error: { message: error.message, code: error.code },
    });
    logCatalogRequestQueryOutcome({
      function: options.functionName,
      vendorId: options.vendorId,
      requestId: options.requestId,
      result: "error",
      count: 0,
      durationMs,
    });
    failLoudInDev(options.functionName, error.message, error.code);
    return {
      ok: false,
      errorMessage: options.userErrorMessage,
      meta,
      durationMs,
      supabaseError: { message: error.message, code: error.code },
    };
  }

  if (data === null || data === undefined) {
    if (options.allowNullData) {
      logCatalogRequestQueryOutcome({
        function: options.functionName,
        vendorId: options.vendorId,
        requestId: options.requestId,
        result: "success",
        count: 0,
        durationMs,
      });
      return { ok: true, data: data as T, meta, durationMs };
    }

    const emptyMsg = options.emptyDataMessage;
    logger.error({
      domain: "catalog_requests",
      function: options.functionName,
      vendorId: options.vendorId,
      id: options.requestId,
      durationMs,
      result: "error",
      error: { message: emptyMsg },
    });
    logCatalogRequestQueryOutcome({
      function: options.functionName,
      vendorId: options.vendorId,
      requestId: options.requestId,
      result: "error",
      count: 0,
      durationMs,
    });
    failLoudInDev(options.functionName, emptyMsg);
    return {
      ok: false,
      errorMessage: options.userErrorMessage,
      meta,
      durationMs,
      supabaseError: { message: emptyMsg },
    };
  }

  const count = Array.isArray(data) ? data.length : 1;
  logCatalogRequestQueryOutcome({
    function: options.functionName,
    vendorId: options.vendorId,
    requestId: options.requestId,
    result: "success",
    count,
    durationMs,
  });

  return { ok: true, data, meta, durationMs };
}

export async function executeSupabaseQuery<T>(
  options: ExecuteSupabaseQueryOptions<T>,
): Promise<ExecuteSupabaseQueryResult<T>> {
  return runExecuteSupabaseQuery(options);
}

/** maybeSingle: null row without error is success with null data (caller treats as not found). */
export async function executeSupabaseMaybeSingleQuery<T>(
  options: ExecuteSupabaseQueryOptions<T>,
): Promise<ExecuteSupabaseQueryResult<T>> {
  return runExecuteSupabaseQuery({ ...options, allowNullData: true });
}

export function toCatalogProductQueryFailure<TRow>(
  failure: ExecuteSupabaseQueryFailure,
): { data: TRow[]; error: true; errorMessage: string; meta: CatalogProductRequestQueryMeta } {
  return {
    data: [],
    error: true,
    errorMessage: failure.errorMessage,
    meta: failure.meta,
  };
}

export function toCatalogProductQuerySuccess<TRow>(
  rows: TRow[],
  success: ExecuteSupabaseQuerySuccess<unknown>,
): { data: TRow[]; error: false; meta: CatalogProductRequestQueryMeta } {
  return {
    data: rows,
    error: false,
    meta: success.meta,
  };
}
