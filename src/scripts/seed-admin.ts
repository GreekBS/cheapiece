/**
 * DEV ONLY — manual seed for Supabase Auth + public.profiles.
 *
 * Run from repo root (requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
 *   npm run seed:admin
 *
 * Does NOT run on build or at app runtime. Do not import this file from the Next.js app.
 */

import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

const ADMIN_EMAIL = "admin@tsipis.com";
const ADMIN_PASSWORD = "Secureskypec4";
const ADMIN_DISPLAY_NAME = "Admin";

async function findUserIdByEmail(admin: SupabaseClient): Promise<string | null> {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }
    const found = data.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    if (found) {
      return found.id;
    }
    if (data.users.length < perPage) {
      return null;
    }
    page += 1;
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
    process.exit(1);
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId = await findUserIdByEmail(admin);

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error("createUser failed:", error.message);
      process.exit(1);
    }
    if (!data.user?.id) {
      console.error("createUser returned no user id.");
      process.exit(1);
    }
    userId = data.user.id;
    console.log("Created Auth user:", ADMIN_EMAIL);
  } else {
    console.log("Auth user already exists:", ADMIN_EMAIL);
  }

  const { data: profile, error: profileReadError } = await admin
    .from("profiles")
    .select("id, role, tenant_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileReadError) {
    console.error("profiles read failed:", profileReadError.message);
    process.exit(1);
  }

  if (profile?.role === "platform_admin") {
    if (!profile.tenant_id) {
      const { error: upErr } = await admin
        .from("profiles")
        .update({ tenant_id: "11111111-1111-4111-8111-111111111111" })
        .eq("id", userId);
      if (upErr) {
        console.error("profiles tenant_id update failed:", upErr.message);
        process.exit(1);
      }
      console.log("Attached default tenant_id to existing platform_admin profile.");
    } else {
      console.log("profiles row already has platform_admin and tenant_id. Nothing to do.");
    }
    return;
  }

  if (profile) {
    console.error(
      "A profiles row exists for this user but role is not platform_admin. " +
        "The DB trigger blocks role changes via UPDATE; fix manually (e.g. delete row and re-run) or leave as-is.",
    );
    process.exit(1);
  }

  const { error: insertError } = await admin.from("profiles").insert({
    id: userId,
    role: "platform_admin",
    display_name: ADMIN_DISPLAY_NAME,
    tenant_id: "11111111-1111-4111-8111-111111111111",
  });

  if (insertError) {
    console.error("profiles insert failed:", insertError.message);
    process.exit(1);
  }

  console.log("Inserted profiles row: platform_admin + default tenant_id, display_name =", ADMIN_DISPLAY_NAME);
  console.log("Done. You can sign in at /merchant with this email and password (dev only).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
