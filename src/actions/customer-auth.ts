"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CustomerAuthState =
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function customerSignInAction(
  _prev: CustomerAuthState | null,
  formData: FormData,
): Promise<CustomerAuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, message: "Συμπλήρωσε email και κωδικό." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function customerSignUpAction(
  _prev: CustomerAuthState | null,
  formData: FormData,
): Promise<CustomerAuthState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (!displayName) fieldErrors.displayName = "Το όνομα είναι υποχρεωτικό.";
  if (!email) fieldErrors.email = "Το email είναι υποχρεωτικό.";
  if (!password) fieldErrors.password = "Ο κωδικός είναι υποχρεωτικό.";
  if (password && password.length < 8) {
    fieldErrors.password = "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.";
  }
  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Οι κωδικοί δεν ταιριάζουν.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Έλεγξε τα πεδία της φόρμας.", fieldErrors };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${siteOrigin()}/`,
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const userId = data.user?.id;
  if (userId && data.session) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      role: "user",
      display_name: displayName,
      tenant_id: null,
    });

    if (profileError && !profileError.message.toLowerCase().includes("duplicate")) {
      console.error("[customerSignUpAction] profile insert failed", profileError.message);
    }
  }

  revalidatePath("/", "layout");

  if (data.session) {
    return { ok: true, message: "Ο λογαριασμός σου δημιουργήθηκε." };
  }

  return {
    ok: true,
    message: "Ο λογαριασμός δημιουργήθηκε. Έλεγξε το email σου για επιβεβαίωση.",
  };
}

export async function customerForgotPasswordAction(
  _prev: CustomerAuthState | null,
  formData: FormData,
): Promise<CustomerAuthState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { ok: false, message: "Συμπλήρωσε το email σου." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteOrigin()}/`,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message: "Αν υπάρχει λογαριασμός με αυτό το email, στείλαμε οδηγίες επαναφοράς.",
  };
}

export async function customerSignOutAction(): Promise<CustomerAuthState> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
