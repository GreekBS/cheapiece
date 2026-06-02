"use server";

import { revalidatePath } from "next/cache";

import { assertMerchantVendorAccess } from "@/lib/merchant/assert-merchant-vendor-access";
import { merchantStoreBase, merchantStoreSettingsPath } from "@/lib/merchant/merchant-store-paths";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveActor } from "@/modules/identity/services/resolve-actor";
import { canEditVendorStoreProfile } from "@/modules/vendors/queries/vendor-store-profile-queries";
import {
  deleteVendorLogoFromStorageBestEffort,
  storagePathFromVendorLogoPublicUrl,
  uploadVendorLogo,
} from "@/modules/vendors/services/upload-vendor-logo";
import { updateVendorStoreProfileSchema } from "@/modules/vendors/validations/vendor-store-profile";

export type VendorStoreProfileActionResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function isLogoFile(entry: FormDataEntryValue | null): entry is File {
  return entry instanceof File && entry.size > 0 && entry.name !== "";
}

export async function updateVendorStoreProfileAction(
  _prev: VendorStoreProfileActionResult | null,
  formData: FormData,
): Promise<VendorStoreProfileActionResult> {
  const removeLogo = formData.get("removeLogo") === "1";
  const logoFileEntry = formData.get("logoFile");

  const parsed = updateVendorStoreProfileSchema.safeParse({
    vendorId: formData.get("vendorId"),
    name: formData.get("name"),
    description: formData.get("description"),
    logoUrl: removeLogo ? null : formData.get("logoUrl"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    address: formData.get("address"),
    eshopUrl: formData.get("eshopUrl"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fieldErrors: Record<string, string> = {};
    for (const [k, msgs] of Object.entries(flat.fieldErrors)) {
      if (msgs?.[0]) fieldErrors[k] = msgs[0];
    }
    return {
      ok: false,
      message: flat.formErrors.join("; ") || "Μη έγκυρα δεδομένα.",
      fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  const actor = await resolveActor(supabase);
  if (!actor) {
    return { ok: false, message: "Απαιτείται σύνδεση." };
  }

  const vendor = await assertMerchantVendorAccess(supabase, actor.userId, parsed.data.vendorId);
  if (!vendor) {
    return { ok: false, message: "Δεν έχετε πρόσβαση σε αυτό το κατάστημα." };
  }

  const canEdit = await canEditVendorStoreProfile(supabase, parsed.data.vendorId, actor.userId);
  if (!canEdit) {
    return { ok: false, message: "Μόνο ο ιδιοκτήτης ή ο διαχειριστής μπορεί να επεξεργαστεί το προφίλ." };
  }

  const previousLogoUrl = parsed.data.logoUrl ?? null;
  let finalLogoUrl: string | null = previousLogoUrl;
  let uploadedPublicUrl: string | null = null;

  try {
    if (removeLogo) {
      finalLogoUrl = null;
    } else if (isLogoFile(logoFileEntry)) {
      const uploaded = await uploadVendorLogo(supabase, vendor.tenant_id, parsed.data.vendorId, logoFileEntry);
      uploadedPublicUrl = uploaded.publicUrl;
      finalLogoUrl = uploaded.publicUrl;
    }

    const { error } = await supabase
      .from("vendors")
      .update({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        logo_url: finalLogoUrl,
        contact_email: parsed.data.contactEmail ?? null,
        contact_phone: parsed.data.contactPhone ?? null,
        address: parsed.data.address ?? null,
        eshop_url: parsed.data.eshopUrl ?? null,
      })
      .eq("id", parsed.data.vendorId);

    if (error) {
      if (uploadedPublicUrl) {
        await deleteVendorLogoFromStorageBestEffort(supabase, uploadedPublicUrl);
      }
      const lower = error.message.toLowerCase();
      if (lower.includes("policy") || lower.includes("rls") || lower.includes("permission")) {
        return { ok: false, message: "Δεν επιτρέπεται η αποθήκευση (δικαιώματα)." };
      }
      return { ok: false, message: error.message };
    }

    if (removeLogo) {
      await deleteVendorLogoFromStorageBestEffort(supabase, previousLogoUrl);
    } else if (uploadedPublicUrl && previousLogoUrl) {
      const prevPath = storagePathFromVendorLogoPublicUrl(previousLogoUrl);
      const newPath = storagePathFromVendorLogoPublicUrl(uploadedPublicUrl);
      if (prevPath && newPath && prevPath !== newPath) {
        await deleteVendorLogoFromStorageBestEffort(supabase, previousLogoUrl);
      }
    }
  } catch (err) {
    if (uploadedPublicUrl) {
      await deleteVendorLogoFromStorageBestEffort(supabase, uploadedPublicUrl);
    }
    const message = err instanceof Error ? err.message : "Αποτυχία αποστολής λογότυπου.";
    return { ok: false, message };
  }

  revalidatePath(merchantStoreSettingsPath(parsed.data.vendorId));
  revalidatePath(merchantStoreBase(parsed.data.vendorId));

  return { ok: true };
}
