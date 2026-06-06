"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchProfileForUser } from "@/modules/identity/queries/profile-queries";

const DISPLAY_NAME_MAX_LENGTH = 80;

export type CustomerProfileState =
  | { ok: true; message: string; displayName: string; warning?: string }
  | { ok: false; message: string; fieldErrors?: { displayName?: string } };

function normalizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function validateDisplayName(normalized: string): { displayName?: string } | null {
  if (!normalized) {
    return { displayName: "Το όνομα είναι υποχρεωτικό." };
  }
  if (normalized.length > DISPLAY_NAME_MAX_LENGTH) {
    return { displayName: "Το όνομα δεν μπορεί να υπερβαίνει τους 80 χαρακτήρες." };
  }
  return null;
}

export async function updateCustomerDisplayNameAction(
  _prev: CustomerProfileState | null,
  formData: FormData,
): Promise<CustomerProfileState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "Πρέπει να είσαι συνδεδεμένος για να ενημερώσεις το προφίλ σου." };
  }

  const normalized = normalizeDisplayName(String(formData.get("displayName") ?? ""));
  const fieldErrors = validateDisplayName(normalized);
  if (fieldErrors) {
    return { ok: false, message: "Έλεγξε το πεδίο ονόματος.", fieldErrors };
  }

  const profile = await fetchProfileForUser(supabase, user.id);
  if (!profile) {
    return { ok: false, message: "Δεν βρέθηκε προφίλ χρήστη" };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: normalized })
    .eq("id", user.id);

  if (profileError) {
    console.error("[updateCustomerDisplayNameAction] profile update failed", profileError.message);
    return { ok: false, message: "Δεν ήταν δυνατή η αποθήκευση του ονόματος. Δοκίμασε ξανά." };
  }

  let warning: string | undefined;
  const { error: authError } = await supabase.auth.updateUser({
    data: { display_name: normalized },
  });

  if (authError) {
    console.error("[updateCustomerDisplayNameAction] auth metadata sync failed", authError.message);
    warning =
      "Το όνομα αποθηκεύτηκε, αλλά ο συγχρονισμός με τον λογαριασμό σύνδεσης απέτυχε. Μπορείς να δοκιμάσεις ξανά.";
  }

  revalidatePath("/account/profile");
  revalidatePath("/", "layout");

  return {
    ok: true,
    displayName: normalized,
    message: `Το όνομα ενημερώθηκε: ${normalized}`,
    warning,
  };
}
