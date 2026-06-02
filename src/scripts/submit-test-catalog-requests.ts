/**
 * DEV: Submit two catalog product requests via the same pipeline as
 * submitCatalogProductRequestAction → submitCatalogProductRequestCoreFromFormData.
 *
 *   npx ts-node --project tsconfig.seed.json src/scripts/submit-test-catalog-requests.ts
 */

import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { submitCatalogProductRequestCoreFromFormData } from "../modules/catalog-requests/services/submit-catalog-product-request-core";
import { submitCatalogProductRequestSchema } from "../modules/catalog-requests/validations/catalog-product-request";
import { listAccessibleVendorIds } from "../modules/vendors/queries/vendor-queries";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const ADMIN_EMAIL = "admin@tsipis.com";
const ADMIN_PASSWORD = "Secureskypec4";
const VENDOR_ID = "bc5ec3d9-0a07-4961-84cb-86b0c714230c";
const CATEGORY_ID = "a775d97e-0ff2-444d-acc2-e90d5590f08b";

function buildFormData(fields: Record<string, string | undefined>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      fd.set(key, value);
    }
  }
  return fd;
}

async function signInMerchant(): Promise<{ supabase: SupabaseClient; userId: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const base = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await base.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (error || !data.session?.access_token || !data.user) {
    throw new Error(`signIn failed: ${error?.message ?? "no session"}`);
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });

  return { supabase, userId: data.user.id };
}

async function submitOne(args: {
  supabase: SupabaseClient;
  userId: string;
  accessibleVendorIds: string[];
  stamp: number;
  title: string;
  model: string;
  slug: string;
  requestedPriceAmount?: string;
  requestedStockQuantity?: string;
}): Promise<string> {
  const formData = buildFormData({
    vendorId: VENDOR_ID,
    lockedVendorId: VENDOR_ID,
    categoryId: CATEGORY_ID,
    title: args.title,
    brand: "TestBrand",
    model: args.model,
    slugSuggestion: args.slug,
    requestedPriceAmount: args.requestedPriceAmount,
    requestedStockQuantity: args.requestedStockQuantity,
  });

  const parsed = submitCatalogProductRequestSchema.safeParse({
    vendorId: VENDOR_ID,
    categoryId: CATEGORY_ID,
    title: formData.get("title"),
    brand: formData.get("brand") || null,
    model: formData.get("model") || null,
    slugSuggestion: formData.get("slugSuggestion"),
    gtin: null,
    mpn: null,
    requestedPriceAmount: formData.get("requestedPriceAmount"),
    requestedStockQuantity: formData.get("requestedStockQuantity"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join("; ") || "validation failed");
  }

  const result = await submitCatalogProductRequestCoreFromFormData(args.supabase, {
    userId: args.userId,
    accessibleVendorIds: args.accessibleVendorIds,
    payload: parsed.data,
    formData,
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  return result.id;
}

async function main() {
  const { supabase, userId } = await signInMerchant();
  const accessible = await listAccessibleVendorIds(supabase, userId);
  if (!accessible.includes(VENDOR_ID)) {
    throw new Error(`Vendor ${VENDOR_ID} not accessible for user ${userId}`);
  }

  const stamp = Date.now();

  console.log("Submitting Request 1 (price + stock)…");
  const id1 = await submitOne({
    supabase,
    userId,
    accessibleVendorIds: accessible,
    stamp,
    title: "Test Product A",
    model: "A1",
    slug: `test-product-a-${stamp}`,
    requestedPriceAmount: "10.99",
    requestedStockQuantity: "5",
  });

  console.log("Submitting Request 2 (stock only)…");
  const id2 = await submitOne({
    supabase,
    userId,
    accessibleVendorIds: accessible,
    stamp,
    title: "Test Product B",
    model: "B1",
    slug: `test-product-b-${stamp}`,
    requestedStockQuantity: "20",
  });

  const { data: rows, error } = await supabase
    .from("catalog_product_requests")
    .select(
      "id, title, status, requested_price_amount, requested_stock_quantity, requested_price_currency",
    )
    .in("id", [id1, id2]);

  if (error) {
    throw new Error(error.message);
  }

  const { count: offerCount } = await supabase
    .from("store_products")
    .select("id", { count: "exact", head: true })
    .in("id", [id1, id2]);

  console.log("\n=== Request IDs ===");
  console.log("Request 1:", id1);
  console.log("Request 2:", id2);
  console.log("\n=== DB rows ===");
  console.log(JSON.stringify(rows, null, 2));
  console.log("\nstore_products rows matching request ids (expect 0):", offerCount ?? 0);
  console.log(
    "\nRedirect target (action): /merchant/stores/%s/products?tab=pending",
    VENDOR_ID,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
