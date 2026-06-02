"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { pickPostSignInRedirect } from "@/lib/auth/pick-post-login-redirect";
import {
  isMerchantHubEntryPath,
  resolveMerchantDestination,
} from "@/lib/merchant/resolve-merchant-destination";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthFormState = { ok: true } | { ok: false; message: string };

export async function signInWithPasswordAction(
  _prev: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const returnUrlRaw = String(formData.get("returnUrl") ?? "").trim();
  const redirectToRaw = String(formData.get("redirectTo") ?? "").trim();
  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/merchant");
  revalidatePath("/merchant/onboarding");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dest = pickPostSignInRedirect({
    returnUrl: returnUrlRaw,
    redirectTo: redirectToRaw,
    fallback: "/merchant",
  });

  if (user && isMerchantHubEntryPath(dest)) {
    dest = await resolveMerchantDestination(supabase, user.id);
  }

  redirect(dest);
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  revalidatePath("/merchant");
  redirect("/merchant");
}
