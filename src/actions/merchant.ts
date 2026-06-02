"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveActor } from "@/modules/identity/services/resolve-actor";

const createVendorSchema = z.object({
  name: z.string().trim().min(2, "Store name must be at least 2 characters.").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "URL slug is required.")
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens only."),
});

export type CreateVendorActionState =
  | { ok: true }
  | {
      ok: false;
      message: string;
      fieldErrors?: { name?: string; slug?: string };
      code?: "VALIDATION" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "INTERNAL";
    };

/**
 * Creates a vendor row for the authenticated owner. RLS must allow vendors_insert_owner_self_or_admin.
 */
export async function createVendorAction(
  _prev: CreateVendorActionState | null,
  formData: FormData,
): Promise<CreateVendorActionState> {
  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
  };

  const parsed = createVendorSchema.safeParse({
    name: typeof raw.name === "string" ? raw.name : "",
    slug: typeof raw.slug === "string" ? raw.slug : "",
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const nameErr = flat.fieldErrors.name?.[0];
    const slugErr = flat.fieldErrors.slug?.[0];
    const formMsg = flat.formErrors.join("; ");
    return {
      ok: false,
      message: formMsg || nameErr || slugErr || "Invalid input.",
      code: "VALIDATION",
      fieldErrors: {
        ...(nameErr ? { name: nameErr } : {}),
        ...(slugErr ? { slug: slugErr } : {}),
      },
    };
  }

  const supabase = await createServerSupabaseClient();
  const actor = await resolveActor(supabase);
  if (!actor) {
    return {
      ok: false,
      message: "Profile required to continue.",
      code: "UNAUTHORIZED",
    };
  }

  const { data: profileTenant, error: tenantReadError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", actor.userId)
    .maybeSingle();

  if (tenantReadError) {
    console.error("[createVendorAction] profiles.tenant_id read failed", tenantReadError.message);
    return {
      ok: false,
      message: "Could not read your account tenant. Try again or contact support.",
      code: "INTERNAL",
    };
  }
  const tenantId = profileTenant?.tenant_id as string | null | undefined;
  if (!tenantId) {
    return {
      ok: false,
      message:
        "Your account has no marketplace tenant assigned (profiles.tenant_id). A tenant is required to create a store — contact support or complete account setup.",
      code: "FORBIDDEN",
    };
  }

  const { data: created, error } = await supabase
    .from("vendors")
    .insert({
      owner_user_id: actor.userId,
      tenant_id: tenantId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      state: "active",
    })
    .select("id")
    .single();

  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("unique") || lower.includes("duplicate") || error.code === "23505") {
      return {
        ok: false,
        message: "That store URL is already taken.",
        code: "CONFLICT",
        fieldErrors: { slug: "This slug is already in use — choose another." },
      };
    }
    if (lower.includes("policy") || lower.includes("rls") || lower.includes("permission")) {
      return { ok: false, message: "Not allowed to create this store (RLS).", code: "FORBIDDEN" };
    }
    return { ok: false, message: error.message, code: "INTERNAL" };
  }

  const newVendorId = created?.id as string | undefined;
  if (!newVendorId) {
    return {
      ok: false,
      message: "Store was created but id could not be read. Refresh your store workspace or contact support.",
      code: "INTERNAL",
    };
  }

  revalidatePath("/merchant");
  revalidatePath("/merchant/onboarding");
  revalidatePath(`/merchant/stores/${newVendorId}`);
  redirect(`/merchant/stores/${newVendorId}/home`);
}
