import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileRow = {
  id: string;
  role: string;
  display_name: string | null;
};

export async function fetchProfileForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id as string,
    role: data.role as string,
    display_name: (data.display_name as string | null) ?? null,
  };
}
