import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchProfileForUser } from "../queries/profile-queries";
import type { Actor } from "../types/actor";

/**
 * Resolves authenticated actor from Supabase session + profiles row.
 * Does not parse vendor context — pass vendorId separately per action.
 */
export async function resolveActor(supabase: SupabaseClient): Promise<Actor | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const profile = await fetchProfileForUser(supabase, user.id);
  if (!profile) {
    return null;
  }

  const platformRole =
    profile.role === "platform_admin" ? ("platform_admin" as const) : ("user" as const);

  return {
    userId: user.id,
    platformRole,
  };
}
