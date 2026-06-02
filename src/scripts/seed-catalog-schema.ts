/**
 * Persist Phase 1 pilot catalog schemas to Supabase.
 *
 *   npm run seed:catalog-schema -- --tenant-id <uuid> [--dry-run]
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Migration: 20260515_catalog_schema_persistence.sql
 */

import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import { buildPilotCatalogSeed } from "../modules/catalog-schema/seed";
import { PILOT_CATEGORY_SLUGS } from "../modules/catalog-schema/seed/pilot-slugs";
import { SupabaseSchemaRepository } from "../modules/catalog-schema/persistence/supabase-schema-repository";
import { resolvePublishedCategorySchema } from "../modules/catalog-schema/services/category-schema-service";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

function parseArgs(): { tenantId: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  let tenantId = "";
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tenant-id" && args[i + 1]) tenantId = args[++i];
    if (args[i] === "--dry-run") dryRun = true;
  }
  if (!tenantId) {
    console.error("Usage: npm run seed:catalog-schema -- --tenant-id <uuid> [--dry-run]");
    process.exit(1);
  }
  return { tenantId, dryRun };
}

async function ensureCategory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenantId: string,
  slug: string,
  name: string,
): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from("categories")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .maybeSingle();
  if (findError) throw findError;
  const existingRow = existing as { id: string } | null;
  if (existingRow?.id) return existingRow.id;

  const { data, error } = await supabase
    .from("categories")
    .insert({
      tenant_id: tenantId,
      name,
      slug,
      path: slug,
      state: "active",
      is_leaf: true,
      level: 0,
    } as never)
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

async function main() {
  const { tenantId, dryRun } = parseArgs();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const mobileCategoryId = await ensureCategory(supabase, tenantId, PILOT_CATEGORY_SLUGS.mobile, "Κινητά (pilot)");
  const apparelCategoryId = await ensureCategory(supabase, tenantId, PILOT_CATEGORY_SLUGS.apparel, "Ρούχα (pilot)");

  const pilot = buildPilotCatalogSeed({
    mobileCategoryId,
    apparelCategoryId,
    mobileVersionId: randomUUID(),
    apparelVersionId: randomUUID(),
  });

  if (dryRun) {
    console.log("[dry-run] Would persist", pilot.attributes.length, "attributes and", pilot.schemas.length, "schemas");
    return;
  }

  const repo = new SupabaseSchemaRepository(supabase);
  await repo.upsertAttributeDefinitions(tenantId, pilot.attributes.map((a) => ({ ...a, tenantId })));

  const publishedAt = new Date().toISOString();
  for (const seed of pilot.schemas) {
    const withTenant = {
      ...seed,
      document: { ...seed.document, tenantId },
    };
    const draft = await repo.saveDraft({ tenantId, seed: withTenant });
    await repo.publishVersion({
      tenantId,
      categoryId: seed.document.categoryId,
      versionId: draft.version.id,
      publishedAt,
      expectedVersion: seed.document.version,
    });
    const resolved = await resolvePublishedCategorySchema(repo, tenantId, seed.document.categoryId);
    console.log(
      `Published ${seed.document.categoryPath} v${resolved.seed.document.version} — ${resolved.descriptor.fields.length} descriptor fields`,
    );
  }

  console.log("Pilot catalog schema seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
