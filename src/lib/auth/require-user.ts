import { redirect } from "next/navigation";

import { buildMerchantHubUnauthenticatedRedirect } from "@/lib/auth/pick-post-login-redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireSessionUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(buildMerchantHubUnauthenticatedRedirect());
  }

  return { supabase, user };
}
