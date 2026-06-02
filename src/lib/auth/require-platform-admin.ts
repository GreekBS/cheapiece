import { redirect } from "next/navigation";

import { buildMerchantHubUnauthenticatedRedirect } from "@/lib/auth/pick-post-login-redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveActor } from "@/modules/identity/services/resolve-actor";

export async function requirePlatformAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(buildMerchantHubUnauthenticatedRedirect());
  }

  const actor = await resolveActor(supabase);
  if (!actor || actor.platformRole !== "platform_admin") {
    redirect("/");
  }

  return { supabase, user, actor };
}
