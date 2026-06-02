/**
 * DEV/STAGING catalog seed for realistic `public.products` rows.
 *
 * Usage:
 *   npm run seed:catalog -- --tenant-id <uuid> [--rows 100] [--dry-run]
 *
 * Constraints:
 * - Requires explicit --tenant-id (no default)
 * - Refuses to run in production-like environments by default
 * - Idempotent upsert key: (tenant_id, slug)
 */

import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ProductState = "active" | "draft" | "archived";
type Segment = "electronics" | "phones" | "laptops" | "tvs" | "appliances" | "gaming" | "audio" | "accessories";

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  state: string;
};

type ProductSeedRow = {
  tenant_id: string;
  category_id: string | null;
  title: string;
  brand: string | null;
  model: string | null;
  slug: string;
  state: ProductState;
  created_at: string;
  updated_at: string;
};

async function assertProductsColumns(admin: SupabaseClient): Promise<void> {
  const { error } = await admin.from("products").select("tenant_id, slug, title, state").limit(1);
  if (error) {
    throw new Error(
      `products schema preflight failed: ${error.message}. ` +
        "This seed requires tenant-scoped products (tenant_id + slug + title + state).",
    );
  }
}

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

function parseArgs(argv: string[]) {
  const out: { tenantId: string | null; rows: number; dryRun: boolean } = {
    tenantId: null,
    rows: 100,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tenant-id") {
      out.tenantId = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (a === "--rows") {
      const n = Number.parseInt(argv[i + 1] ?? "", 10);
      if (Number.isFinite(n) && n > 0) out.rows = Math.min(n, 500);
      i += 1;
      continue;
    }
    if (a === "--dry-run") {
      out.dryRun = true;
    }
  }
  return out;
}

function assertSafeEnvironment(url: string): void {
  const nodeEnv = (process.env.NODE_ENV ?? "").toLowerCase();
  const vercelEnv = (process.env.VERCEL_ENV ?? "").toLowerCase();
  if (nodeEnv === "production" || vercelEnv === "production") {
    throw new Error("Refusing to run seed in production environment.");
  }

  let ref = "";
  try {
    const host = new URL(url).hostname;
    ref = host.split(".")[0] ?? "";
  } catch {
    throw new Error("Invalid NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (/(^|[-_])(prod|production|live)($|[-_])/i.test(ref)) {
    throw new Error(`Refusing to run seed on production-like Supabase project ref: ${ref}`);
  }
}

function seededInt(seed: number, min: number, max: number): number {
  let x = (seed * 9301 + 49297) % 233280;
  x = (x * 9301 + 49297) % 233280;
  const rnd = x / 233280;
  return Math.floor(min + rnd * (max - min + 1));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

const segmentConfigs: Record<
  Segment,
  { brands: string[]; nouns: string[]; models: string[]; categoryHints: string[] }
> = {
  electronics: {
    brands: ["TP-Link", "Anker", "Ugreen", "Belkin", "Logitech", "Baseus", "Sandisk", "Kingston"],
    nouns: ["Smart Hub", "USB-C Dock", "4K Capture Card", "Network Switch", "NAS Enclosure", "Power Station"],
    models: ["Core", "Pro", "Ultra", "Max", "X", "Plus", "Gen 2", "SE"],
    categoryHints: ["tech-ilektronika", "tech-gadgets", "tech-ilektronikoi-ypologistes"],
  },
  phones: {
    brands: ["Apple", "Samsung", "Xiaomi", "Google", "OnePlus", "Honor", "Nothing", "Motorola"],
    nouns: ["Smartphone", "5G Phone", "Foldable Phone", "Pro Camera Phone", "Compact Phone", "Budget Phone"],
    models: ["A16", "S24", "Pixel 8", "11R", "Magic 6", "Phone (2)", "Edge 50", "Redmi Note 13"],
    categoryHints: ["tech-kiniti-tilefonia", "tech-tilefonia", "tech-gadgets"],
  },
  laptops: {
    brands: ["Dell", "HP", "Lenovo", "Asus", "Acer", "MSI", "Huawei", "LG"],
    nouns: ["Laptop 14", "Laptop 15", "Ultrabook", "Business Laptop", "Creator Laptop", "Gaming Laptop"],
    models: ["i5 16/512", "i7 16/1TB", "Ryzen 7 16/512", "Ryzen 9 32/1TB", "Core Ultra 7", "M3 16/512"],
    categoryHints: ["tech-ilektronikoi-ypologistes", "tech-gaming", "tech-tablets-axesouar"],
  },
  tvs: {
    brands: ["Samsung", "LG", "Sony", "TCL", "Hisense", "Philips", "Panasonic", "Xiaomi"],
    nouns: ["4K Smart TV", "QLED TV", "OLED TV", "Mini LED TV", "Gaming TV", "Android TV"],
    models: ['43"', '50"', '55"', '65"', '75"', "120Hz", "Dolby Vision", "QN Series"],
    categoryHints: ["tech-eikona", "home-fotismos", "tech-gadgets"],
  },
  appliances: {
    brands: ["Bosch", "Siemens", "LG", "Samsung", "Whirlpool", "Miele", "Philips", "Tefal"],
    nouns: ["Washing Machine", "Fridge Freezer", "Air Conditioner", "Robot Vacuum", "Espresso Machine", "Air Fryer"],
    models: ["Series 6", "Series 8", "Inverter", "Dual Zone", "A++", "Silent", "Smart", "Pro"],
    categoryHints: ["appliances-lefkes-syskeves", "appliances-thermansi-klimatismos", "appliances-kafetieres"],
  },
  gaming: {
    brands: ["Sony", "Microsoft", "Nintendo", "Asus", "Razer", "Logitech G", "SteelSeries", "Corsair"],
    nouns: ["Gaming Console", "Gaming Monitor", "Gaming Headset", "Mechanical Keyboard", "Gaming Mouse", "Controller"],
    models: ["Elite", "Tournament", "Pro", "Wireless", "RGB", "240Hz", "Ultimate", "Lite"],
    categoryHints: ["tech-gaming", "sports-athlimata", "tech-ichos"],
  },
  audio: {
    brands: ["Sony", "Bose", "JBL", "Sennheiser", "Audio-Technica", "Marshall", "Beats", "Anker"],
    nouns: ["ANC Earbuds", "Bluetooth Speaker", "Over-Ear Headphones", "Soundbar", "Studio Monitor", "Portable Speaker"],
    models: ["MK II", "Pro", "Mini", "Max", "SE", "Gen 3", "Plus", "X"],
    categoryHints: ["tech-ichos", "sports-mousiki", "tech-gadgets"],
  },
  accessories: {
    brands: ["Spigen", "Ugreen", "Anker", "Belkin", "ESR", "Kingston", "Sandisk", "Baseus"],
    nouns: ["Phone Case", "Screen Protector", "USB-C Cable", "Power Bank", "Laptop Stand", "Wireless Charger"],
    models: ["2m", "65W", "20W", "MagSafe", "Pro", "Slim", "2-pack", "Fast Charge"],
    categoryHints: ["tech-tablets-axesouar", "fashion-axesouar", "tech-gadgets"],
  },
};

const segmentCycle: Segment[] = ["electronics", "phones", "laptops", "tvs", "appliances", "gaming", "audio", "accessories"];

function pickState(index: number, total: number): ProductState {
  const activeLimit = Math.floor(total * 0.7);
  const draftLimit = Math.floor(total * 0.9);
  if (index < activeLimit) return "active";
  if (index < draftLimit) return "draft";
  return "archived";
}

function pickCategoryId(segment: Segment, categories: CategoryRow[], idx: number): string | null {
  const hints = segmentConfigs[segment].categoryHints;
  const byHint = categories.filter((c) => hints.some((h) => c.slug.includes(h)));
  if (byHint.length > 0) return byHint[idx % byHint.length]!.id;
  if (categories.length === 0) return null;
  return categories[idx % categories.length]!.id;
}

function buildRows(tenantId: string, categories: CategoryRow[], count: number): ProductSeedRow[] {
  const now = Date.now();
  const rows: ProductSeedRow[] = [];
  const usedSlugs = new Set<string>();

  for (let i = 0; i < count; i++) {
    const segment = segmentCycle[i % segmentCycle.length]!;
    const cfg = segmentConfigs[segment];
    const brand = cfg.brands[i % cfg.brands.length]!;
    const noun = cfg.nouns[i % cfg.nouns.length]!;
    const model = cfg.models[(i * 3) % cfg.models.length]!;
    const title = `${brand} ${noun} ${model}`;
    const base = slugify(`${brand}-${noun}-${model}`);
    let slug = `${base}-${String(i + 1).padStart(3, "0")}`;
    while (usedSlugs.has(slug)) {
      slug = `${base}-${String(i + 1).padStart(3, "0")}-${seededInt(i + slug.length, 10, 99)}`;
    }
    usedSlugs.add(slug);

    const state = pickState(i, count);
    const daysBackUpdated = state === "active" ? seededInt(i + 11, 0, 60) : state === "draft" ? seededInt(i + 23, 0, 20) : seededInt(i + 37, 45, 180);
    const daysBackCreated = daysBackUpdated + seededInt(i + 43, 7, 120);
    const updatedAt = new Date(now - daysBackUpdated * 24 * 3600 * 1000).toISOString();
    const createdAt = new Date(now - daysBackCreated * 24 * 3600 * 1000).toISOString();

    rows.push({
      tenant_id: tenantId,
      category_id: pickCategoryId(segment, categories, i),
      title,
      brand,
      model,
      slug,
      state,
      created_at: createdAt,
      updated_at: updatedAt,
    });
  }
  return rows;
}

async function loadCategories(admin: SupabaseClient, tenantId: string): Promise<CategoryRow[]> {
  const { data, error } = await admin
    .from("categories")
    .select("id, slug, name, state")
    .eq("tenant_id", tenantId)
    .in("state", ["active", "archived"])
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CategoryRow[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function existingSlugSet(admin: SupabaseClient, tenantId: string, slugs: string[]): Promise<Set<string>> {
  const set = new Set<string>();
  for (const part of chunk(slugs, 100)) {
    const { data, error } = await admin.from("products").select("slug").eq("tenant_id", tenantId).in("slug", part);
    if (error) throw error;
    for (const row of (data ?? []) as { slug: string }[]) set.add(row.slug);
  }
  return set;
}

function summarizeStates(rows: { state: ProductState }[]) {
  const stateCounts = { active: 0, draft: 0, archived: 0 };
  for (const r of rows) stateCounts[r.state] += 1;
  return stateCounts;
}

async function main() {
  const { tenantId, rows, dryRun } = parseArgs(process.argv.slice(2));
  if (!tenantId) {
    throw new Error("Missing required --tenant-id <uuid>.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  assertSafeEnvironment(url);

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await assertProductsColumns(admin);

  const categories = await loadCategories(admin, tenantId);
  if (categories.length === 0) {
    console.warn(
      `Warning: no active/archived categories found for tenant ${tenantId}. ` +
        "Products will be seeded with category_id = null.",
    );
  }

  const payload = buildRows(tenantId, categories, rows);
  const stateCounts = summarizeStates(payload);
  const slugs = payload.map((r) => r.slug);
  const existing = await existingSlugSet(admin, tenantId, slugs);
  const willInsert = payload.length - existing.size;
  const willUpdate = existing.size;

  console.log(`Tenant: ${tenantId}`);
  console.log(`Rows requested: ${payload.length}`);
  console.log(`By state: active=${stateCounts.active}, draft=${stateCounts.draft}, archived=${stateCounts.archived}`);
  console.log(`Upsert key: (tenant_id, slug)`);
  console.log(`Plan: insert=${willInsert}, update=${willUpdate}`);
  console.log("Sample (first 5):");
  for (const row of payload.slice(0, 5)) {
    console.log(`- ${row.slug} | ${row.state} | ${row.title} | category_id=${row.category_id ?? "null"}`);
  }

  if (dryRun) {
    console.log("Dry-run enabled. No rows written.");
    return;
  }

  const { error } = await admin.from("products").upsert(payload, {
    onConflict: "tenant_id,slug",
    ignoreDuplicates: false,
  });
  if (error) throw error;

  const { data: samples, error: sampleErr } = await admin
    .from("products")
    .select("id, tenant_id, slug, title, state, updated_at")
    .eq("tenant_id", tenantId)
    .in("slug", payload.slice(0, 5).map((r) => r.slug))
    .order("updated_at", { ascending: false });
  if (sampleErr) throw sampleErr;

  console.log("Seed completed.");
  console.log(`Rows upserted: ${payload.length}`);
  console.log("Sample persisted rows:");
  for (const s of (samples ?? []) as { id: string; tenant_id: string; slug: string; title: string; state: string; updated_at: string }[]) {
    console.log(`- ${s.id} | ${s.slug} | ${s.state} | ${s.title} | ${s.updated_at}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

