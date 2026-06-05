import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchProfileForUser } from "@/modules/identity/queries/profile-queries";

/**
 * Customer-only session guard. Does not use merchant redirect helpers.
 * Unauthenticated users are sent to marketplace home (open auth modal from nav).
 */
export async function requireCustomerSession() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/");
  }

  const profile = await fetchProfileForUser(supabase, user.id);

  return { supabase, user, profile };
}
