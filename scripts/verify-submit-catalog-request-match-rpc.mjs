/**
 * Runtime verification: submit_catalog_product_request_with_match (authenticated).
 *
 * Usage (from repo root):
 *   node scripts/verify-submit-catalog-request-match-rpc.mjs
 *
 * Auth — use ONE of:
 *   A) Logged-in browser session (recommended):
 *      SUPABASE_ACCESS_TOKEN=<access_token from DevTools → Application → localStorage>
 *   B) Email/password:
 *      RPC_TEST_EMAIL + RPC_TEST_PASSWORD
 *
 * Optional overrides:
 *   RPC_TEST_TENANT_ID, RPC_TEST_VENDOR_ID
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

function createAuthedClient(accessToken) {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

async function resolveAccessToken() {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (token) {
    const probe = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await probe.auth.getUser(token);
    if (error || !data.user) {
      console.error("SUPABASE_ACCESS_TOKEN invalid or expired:", error?.message ?? "no user");
      process.exit(1);
    }
    console.log("Auth: using SUPABASE_ACCESS_TOKEN (user %s)", data.user.id);
    return { accessToken: token, userId: data.user.id, email: data.user.email };
  }

  const email = process.env.RPC_TEST_EMAIL?.trim();
  const password = process.env.RPC_TEST_PASSWORD;
  if (!email || !password) {
    console.error(
      "Set SUPABASE_ACCESS_TOKEN (browser session) or RPC_TEST_EMAIL + RPC_TEST_PASSWORD in .env.local",
    );
    process.exit(1);
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    console.error("signInWithPassword failed:", error?.message ?? "no session");
    process.exit(1);
  }
  console.log("Auth: signed in as %s (%s)", data.user.id, data.user.email);
  return {
    accessToken: data.session.access_token,
    userId: data.user.id,
    email: data.user.email,
  };
}

async function resolveVendorContext(supabase, userId) {
  const tenantOverride = process.env.RPC_TEST_TENANT_ID?.trim();
  const vendorOverride = process.env.RPC_TEST_VENDOR_ID?.trim();

  if (tenantOverride && vendorOverride) {
    return { tenantId: tenantOverride, vendorId: vendorOverride };
  }

  const { data: memberships, error: memErr } = await supabase
    .from("vendor_members")
    .select("vendor_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ["owner", "manager", "editor"])
    .limit(1);

  if (memErr) {
    console.error("vendor_members lookup failed:", memErr.message);
    process.exit(1);
  }

  const vendorId = vendorOverride ?? memberships?.[0]?.vendor_id;
  if (!vendorId) {
    console.error(
      "No active vendor_members row (owner/manager/editor). Set RPC_TEST_VENDOR_ID or add membership.",
    );
    process.exit(1);
  }

  const { data: vendor, error: vendorErr } = await supabase
    .from("vendors")
    .select("id, tenant_id")
    .eq("id", vendorId)
    .maybeSingle();

  if (vendorErr || !vendor?.tenant_id) {
    console.error("vendors lookup failed:", vendorErr?.message ?? "vendor not visible");
    process.exit(1);
  }

  const tenantId = tenantOverride ?? vendor.tenant_id;
  return { tenantId, vendorId: vendor.id };
}

async function main() {
  const { accessToken, userId } = await resolveAccessToken();
  const supabase = createAuthedClient(accessToken);

  const { tenantId, vendorId } = await resolveVendorContext(supabase, userId);
  console.log("Context: tenant_id=%s vendor_id=%s", tenantId, vendorId);

  const stamp = Date.now();
  const p_request = {
    tenant_id: tenantId,
    vendor_id: vendorId,
    submitted_by_user_id: userId,
    title: `RPC verify ${stamp}`,
    slug_suggestion: `rpc-verify-${stamp}`,
    status: "pending",
    attribute_payload: {},
  };

  const p_match_snapshot = {};

  console.log("\nCalling submit_catalog_product_request_with_match …");
  const { data: requestId, error: rpcError } = await supabase.rpc(
    "submit_catalog_product_request_with_match",
    {
      p_request,
      p_match_snapshot,
      p_merchant_selected_product_id: null,
    },
  );

  console.log("RPC response:", { data: requestId, error: rpcError });

  if (rpcError) {
    process.exit(1);
  }
  if (!requestId || typeof requestId !== "string") {
    console.error("Expected uuid string from RPC, got:", requestId);
    process.exit(1);
  }

  const { data: matchRow, error: matchError } = await supabase
    .from("catalog_request_matches")
    .select("request_id, tenant_id, suggested_product_id, confidence, match_review_status")
    .eq("request_id", requestId)
    .maybeSingle();

  console.log("\ncatalog_request_matches query:", { data: matchRow, error: matchError });

  if (matchError) {
    process.exit(1);
  }
  if (!matchRow) {
    console.error("FAIL: no catalog_request_matches row for request_id=%s", requestId);
    process.exit(1);
  }

  console.log("\nOK: match row exists for request_id=%s", requestId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
