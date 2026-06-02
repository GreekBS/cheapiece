#!/usr/bin/env node
/**
 * Long-running worker: drains canonical_product_stats_dirty via
 * Supabase RPC public.canonical_product_stats_process_batch(p_batch_size).
 *
 * Env (after load: repo-root .env then .env.local overrides; existing process.env keys
 * are only replaced when the same key appears in those files):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 *   PRODUCT_STATS_BATCH_SIZE (default 500)
 *   PRODUCT_STATS_IDLE_SLEEP_MS_MIN (default 3000)
 *   PRODUCT_STATS_IDLE_SLEEP_MS_MAX (default 5000)
 *   PRODUCT_STATS_MAX_BATCHES_PER_SEC (default 0 = unlimited)
 *   PRODUCT_STATS_FAIL_BACKOFF_MS_START (default 1000)
 *   PRODUCT_STATS_FAIL_BACKOFF_MS_MAX (default 60000)
 *   PRODUCT_STATS_IDLE_PICKED_ZERO_MS_START (default 3000) — exponential idle when RPC picked === 0
 *   PRODUCT_STATS_IDLE_PICKED_ZERO_MS_MAX (default 30000)
 *   PRODUCT_STATS_IDLE_PICKED_ZERO_FACTOR (default 2)
 *   PRODUCT_STATS_HEALTH_PORT (optional, e.g. 9090 → GET /health JSON)
 */

"use strict";

const http = require("http");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

/** Project root when started as `node worker/product-stats-worker.js` (PM2 cwd = root). */
const REPO_ROOT = path.join(__dirname, "..");

function logStructured(level, message, fields = {}) {
  const line = {
    ts: new Date().toISOString(),
    level,
    svc: "product-stats-worker",
    msg: message,
    ...fields,
  };
  console.log(JSON.stringify(line));
}

function loadEnvFiles() {
  dotenv.config({ path: path.join(REPO_ROOT, ".env") });
  dotenv.config({ path: path.join(REPO_ROOT, ".env.local"), override: true });
}

function ensureSupabaseEnvOrExit() {
  const url = String(process.env.SUPABASE_URL ?? "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (url && key) return;

  const missing = [];
  if (!url) missing.push("SUPABASE_URL");
  if (!key) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  logStructured("fatal", "missing_supabase_env", {
    missing,
    hint: "Set in .env.local (preferred) or process env; see REPO_ROOT in this log context",
  });
  process.exit(1);
}

loadEnvFiles();
ensureSupabaseEnvOrExit();

const BATCH_SIZE = Math.min(
  5000,
  Math.max(1, Number.parseInt(process.env.PRODUCT_STATS_BATCH_SIZE ?? "500", 10) || 500),
);

const IDLE_MIN = Math.max(
  0,
  Number.parseInt(process.env.PRODUCT_STATS_IDLE_SLEEP_MS_MIN ?? "3000", 10) || 3000,
);
const IDLE_MAX = Math.max(
  IDLE_MIN,
  Number.parseInt(process.env.PRODUCT_STATS_IDLE_SLEEP_MS_MAX ?? "5000", 10) || 5000,
);

const MAX_BATCHES_PER_SEC = Math.max(
  0,
  Number.parseInt(process.env.PRODUCT_STATS_MAX_BATCHES_PER_SEC ?? "0", 10) || 0,
);

const BACKOFF_START = Math.max(
  250,
  Number.parseInt(process.env.PRODUCT_STATS_FAIL_BACKOFF_MS_START ?? "1000", 10) || 1000,
);
const BACKOFF_MAX = Math.max(
  BACKOFF_START,
  Number.parseInt(process.env.PRODUCT_STATS_FAIL_BACKOFF_MS_MAX ?? "60000", 10) || 60000,
);

const IDLE_PICKED_ZERO_START = Math.max(
  50,
  Number.parseInt(process.env.PRODUCT_STATS_IDLE_PICKED_ZERO_MS_START ?? "3000", 10) || 3000,
);
const IDLE_PICKED_ZERO_MAX = Math.max(
  IDLE_PICKED_ZERO_START,
  Number.parseInt(process.env.PRODUCT_STATS_IDLE_PICKED_ZERO_MS_MAX ?? "30000", 10) || 30000,
);
const IDLE_PICKED_ZERO_FACTOR_RAW = Number.parseFloat(
  process.env.PRODUCT_STATS_IDLE_PICKED_ZERO_FACTOR ?? "2",
);
const IDLE_PICKED_ZERO_FACTOR =
  Number.isFinite(IDLE_PICKED_ZERO_FACTOR_RAW) && IDLE_PICKED_ZERO_FACTOR_RAW >= 1
    ? IDLE_PICKED_ZERO_FACTOR_RAW
    : 2;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomIdleMs() {
  return IDLE_MIN + Math.floor(Math.random() * (IDLE_MAX - IDLE_MIN + 1));
}

/** Simple token bucket for max batches per second (wall clock). */
function createRateLimiter(maxPerSecond) {
  if (!maxPerSecond || maxPerSecond <= 0) {
    return async () => {};
  }
  const intervalMs = Math.ceil(1000 / maxPerSecond);
  let nextAllowed = Date.now();

  return async () => {
    const now = Date.now();
    if (now < nextAllowed) {
      await sleep(nextAllowed - now);
    }
    nextAllowed = Math.max(Date.now(), nextAllowed) + intervalMs;
  };
}

const state = {
  startedAt: null,
  lastRpcAt: null,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
  consecutiveFailures: 0,
  batchesTotal: 0,
  shuttingDown: false,
};

let healthServer = null;

/** Non-negative integer RPC picked count only; unknown shape → null (no exponential idle). */
function parseRpcPicked(pickedRaw) {
  if (pickedRaw === null || pickedRaw === undefined) return null;
  const n = Number(pickedRaw);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  return n;
}

async function maybeStartHealthServer() {
  const raw = process.env.PRODUCT_STATS_HEALTH_PORT ?? "";
  if (!raw.trim()) return;

  const port = Number.parseInt(raw, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    logStructured("warn", "health_port_invalid", { PRODUCT_STATS_HEALTH_PORT: raw });
    return;
  }

  await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const p = req.url?.split("?")[0];
      if (p !== "/" && p !== "/health") {
        res.statusCode = 404;
        res.end();
        return;
      }
      const h = getHealth();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.statusCode = h.ok ? 200 : 503;
      res.end(JSON.stringify(h));
    });

    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => {
      healthServer = server;
      resolve();
    });
  });

  logStructured("info", "health_listen", { port, paths: ["/", "/health"] });
}

async function shutdownHealthServer() {
  const s = healthServer;
  healthServer = null;
  if (!s) return;
  await new Promise((resolve) => {
    s.close(() => resolve());
  });
}

function getHealth() {
  return {
    ok: state.consecutiveFailures < 50,
    startedAt: state.startedAt,
    lastRpcAt: state.lastRpcAt,
    lastSuccessAt: state.lastSuccessAt,
    lastErrorAt: state.lastErrorAt,
    lastErrorMessage: state.lastErrorMessage,
    consecutiveFailures: state.consecutiveFailures,
    batchesTotal: state.batchesTotal,
    shuttingDown: state.shuttingDown,
  };
}

function buildSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function callProcessBatch(client, backoffMsRef) {
  const t0 = Date.now();

  try {
    const { data, error } = await client.rpc("canonical_product_stats_process_batch", {
      p_batch_size: BATCH_SIZE,
    });

    state.lastRpcAt = new Date().toISOString();

    if (error) {
      throw error;
    }

    state.consecutiveFailures = 0;
    state.lastSuccessAt = state.lastRpcAt;
    backoffMsRef.current = BACKOFF_START;

    const durationMs = Date.now() - t0;
    const picked = data?.picked ?? data?.picked_count ?? null;
    const upserted = data?.upserted_stats ?? data?.upserted ?? null;
    const deletedDirty = data?.deleted_dirty ?? null;
    const remaining = data?.remaining_dirty_rows ?? data?.remaining_dirty ?? null;
    const dbDuration = data?.duration_ms ?? null;

    state.batchesTotal += 1;

    const remainingNum =
      remaining === null || remaining === undefined || remaining === ""
        ? null
        : Number(remaining);
    const remainingDirty =
      remainingNum !== null && Number.isFinite(remainingNum) ? remainingNum : null;

    logStructured("info", "batch_ok", {
      batchSize: BATCH_SIZE,
      picked,
      upserted_stats: upserted,
      deleted_dirty: deletedDirty,
      remaining_dirty_rows: remainingDirty,
      duration_ms: durationMs,
      rpc_reported_duration_ms: dbDuration,
    });

    if (remainingDirty === null) {
      logStructured("warn", "remaining_dirty_rows_missing", {
        hint: "treating as non-empty; next batch immediate",
      });
    }

    const pickedCount = parseRpcPicked(picked);

    return {
      ok: true,
      remainingDirty,
      pickedCount,
    };
  } catch (err) {
    state.consecutiveFailures += 1;
    state.lastErrorAt = new Date().toISOString();
    state.lastErrorMessage = err?.message ?? String(err);

    const durationMs = Date.now() - t0;
    logStructured("error", "batch_failed", {
      batchSize: BATCH_SIZE,
      duration_ms: durationMs,
      error: state.lastErrorMessage,
      consecutiveFailures: state.consecutiveFailures,
    });

    return { ok: false, remainingDirty: null, pickedCount: null };
  }
}

async function main() {
  state.startedAt = new Date().toISOString();
  logStructured("info", "worker_start", {
    batchSize: BATCH_SIZE,
    idleSleepMs: { min: IDLE_MIN, max: IDLE_MAX },
    idlePickedZeroMs: {
      start: IDLE_PICKED_ZERO_START,
      max: IDLE_PICKED_ZERO_MAX,
      factor: IDLE_PICKED_ZERO_FACTOR,
    },
    maxBatchesPerSec: MAX_BATCHES_PER_SEC || null,
  });

  const rateLimit = createRateLimiter(MAX_BATCHES_PER_SEC);
  const backoffMsRef = { current: BACKOFF_START };
  const idlePickedZeroRef = { current: IDLE_PICKED_ZERO_START };

  let client = buildSupabaseClient();

  await maybeStartHealthServer();

  const shutdown = async () => {
    if (state.shuttingDown) return;
    state.shuttingDown = true;
    logStructured("warn", "shutdown_signal", getHealth());
    await shutdownHealthServer().catch((e) =>
      logStructured("error", "health_server_close_failed", { error: e?.message ?? String(e) }),
    );
  };

  process.on("SIGINT", () => {
    shutdown();
  });
  process.on("SIGTERM", () => {
    shutdown();
  });

  while (!state.shuttingDown) {
    await rateLimit();

    let result;
    try {
      result = await callProcessBatch(client, backoffMsRef);
    } catch (unexpected) {
      logStructured("error", "unexpected_loop_error", {
        error: unexpected?.message ?? String(unexpected),
      });
      result = { ok: false, remainingDirty: null, pickedCount: null };
    }

    if (!result.ok) {
      const wait = Math.min(
        BACKOFF_MAX,
        backoffMsRef.current + Math.floor(Math.random() * 250),
      );
      backoffMsRef.current = Math.min(BACKOFF_MAX, Math.floor(backoffMsRef.current * 1.5));

      try {
        client = buildSupabaseClient();
        logStructured("info", "supabase_client_recreated", { after_ms: wait });
      } catch (e) {
        logStructured("error", "client_recreate_failed", { error: e?.message ?? String(e) });
      }

      await sleep(wait);
      continue;
    }

    const pickedCount = result.pickedCount;

    if (pickedCount === 0) {
      const sleepMs = idlePickedZeroRef.current;
      logStructured("info", "worker_idle", {
        sleep_ms: sleepMs,
        reason: "picked_zero",
      });
      await sleep(sleepMs);
      idlePickedZeroRef.current = Math.min(
        IDLE_PICKED_ZERO_MAX,
        Math.ceil(idlePickedZeroRef.current * IDLE_PICKED_ZERO_FACTOR),
      );
      continue;
    }

    if (pickedCount !== null && pickedCount > 0) {
      idlePickedZeroRef.current = IDLE_PICKED_ZERO_START;
    }

    const remaining = result.remainingDirty;

    if (remaining === null || remaining > 0) {
      continue;
    }

    await sleep(randomIdleMs());
  }

  await shutdownHealthServer().catch(() => {});
  logStructured("info", "worker_exit", getHealth());
  process.exit(0);
}

if (require.main === module) {
  main().catch((e) => {
    logStructured("fatal", "worker_crash", { error: e?.message ?? String(e) });
    process.exit(1);
  });
}

module.exports = { getHealth, main };
