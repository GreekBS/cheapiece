/**
 * Read-only audit: raw `vendors` counts (service role bypasses RLS).
 * Usage: node scripts/audit-vendors-readonly.mjs
 * Requires in .env.local: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY (JWT from Dashboard → API).
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PAGE = 1000;
let from = 0;
const rows = [];
for (;;) {
  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, owner_user_id, tenant_id, created_at")
    .order("created_at", { ascending: true })
    .range(from, from + PAGE - 1);

  if (error) {
    console.error(error.message);
    if (String(error.message).includes("API key") || String(error.message).includes("JWT")) {
      console.error(
        "Hint: use Project Settings → API → service_role secret (long JWT starting with eyJ...), not anon/publishable keys.",
      );
    }
    process.exit(1);
  }
  if (!data?.length) break;
  rows.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}

const total = rows.length;
const byTenant = new Map();
const byOwner = new Map();
for (const r of rows) {
  const tid = r.tenant_id ?? "(null)";
  const oid = r.owner_user_id ?? "(null)";
  byTenant.set(tid, (byTenant.get(tid) || 0) + 1);
  byOwner.set(oid, (byOwner.get(oid) || 0) + 1);
}

const topOwners = [...byOwner.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
const latest5 = [...rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 5);

console.log(`TOTAL VENDORS: ${total}`);
console.log("");
console.log("BY TENANT:");
const tenantSorted = [...byTenant.entries()].sort((a, b) => b[1] - a[1]);
for (const [tid, c] of tenantSorted) {
  console.log(`  ${tid}: ${c}`);
}
console.log("");
console.log(`UNIQUE TENANTS: ${byTenant.size}`);
console.log("");
console.log("TOP 5 OWNERS (by store count):");
for (const [uid, c] of topOwners) {
  console.log(`  ${uid}: ${c}`);
}
console.log("");
console.log("BY OWNER (full list omitted if large; showing top 5 above):");
console.log(`  unique owners: ${byOwner.size}`);
console.log("");
console.log("LATEST 5:");
for (const r of latest5) {
  console.log(
    `  id=${r.id} name=${JSON.stringify(r.name)} owner_user_id=${r.owner_user_id} tenant_id=${r.tenant_id} created_at=${r.created_at}`,
  );
}
