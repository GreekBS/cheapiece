/**
 * One-off: rename a single root category "Demo category" → "Τεχνολογία".
 * Guards: exactly one matching root; no existing root "Τεχνολογία" in the same tenant.
 * Does not create rows, change parent_id, or touch products.
 *
 * Run from repo root:
 *   npm run rename:demo-category
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 */

import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import { slugifyCategoryName } from "../lib/admin/category-slug";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

const OLD_NAME = "Demo category";
const NEW_NAME = "Τεχνολογία";

type RootRow = {
  id: string;
  tenant_id: string;
  name: string;
  parent_id: string | null;
  state: string;
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: roots, error: fetchErr } = await admin
    .from("categories")
    .select("id, tenant_id, name, parent_id, state")
    .is("parent_id", null)
    .in("state", ["active", "archived"]);

  if (fetchErr) {
    console.error("Failed to fetch root categories:", fetchErr.message);
    process.exit(1);
  }

  const list = (roots ?? []) as RootRow[];
  const demos = list.filter((r) => r.name.trim() === OLD_NAME.trim());
  if (demos.length !== 1) {
    console.error(
      `Abort: expected exactly 1 root with name "${OLD_NAME}", found ${demos.length}. No changes.`,
    );
    process.exit(2);
  }

  const row = demos[0]!;
  const techRootsSameTenant = list.filter(
    (r) =>
      r.tenant_id === row.tenant_id &&
      r.id !== row.id &&
      r.name.trim() === NEW_NAME.trim(),
  );
  if (techRootsSameTenant.length > 0) {
    console.error(
      `Abort: tenant ${row.tenant_id} already has a root named "${NEW_NAME}". No duplicates. No changes.`,
    );
    process.exit(3);
  }

  const newSlug = slugifyCategoryName(NEW_NAME, randomUUID());

  const { data: slugClash } = await admin
    .from("categories")
    .select("id")
    .eq("tenant_id", row.tenant_id)
    .eq("slug", newSlug)
    .neq("id", row.id)
    .maybeSingle();

  if (slugClash?.id) {
    console.error("Abort: generated slug already exists for this tenant. No changes.", { newSlug });
    process.exit(4);
  }

  const { error: upErr } = await admin
    .from("categories")
    .update({ name: NEW_NAME.trim(), slug: newSlug })
    .eq("id", row.id)
    .eq("tenant_id", row.tenant_id);

  if (upErr) {
    console.error("Update failed:", upErr.message);
    process.exit(1);
  }

  console.log("OK — renamed root category:", { id: row.id, tenant_id: row.tenant_id, slug: newSlug });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
