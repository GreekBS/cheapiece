import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { MerchantGatewayLanding } from "@/components/merchant/MerchantGatewayLanding";
import { MerchantHubTopBar } from "@/components/merchant/MerchantHubTopBar";
import { resolveMerchantDestination } from "@/lib/merchant/resolve-merchant-destination";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function firstSearchValue(
  sp: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string {
  if (!sp) return "";
  const v = sp[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0] ?? "";
  return "";
}

type MerchantHubSearchParams = Record<string, string | string[] | undefined>;

/** Guest sign-in gateway; authenticated merchants redirect to store or onboarding (no hub UI). */
export default async function MerchantHubPage({ searchParams }: { searchParams?: MerchantHubSearchParams }) {
  noStore();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rawReturn = firstSearchValue(searchParams, "returnUrl");
  const returnUrlHint = rawReturn.trim() ? rawReturn : undefined;

  if (user) {
    // Multi-store hub intentionally frozen — gateway only; see resolveMerchantDestination.
    redirect(await resolveMerchantDestination(supabase, user.id));
  }

  return (
    <>
      <MerchantHubTopBar authMode="guest" returnUrlHint={returnUrlHint} />
      <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:pb-24 lg:pt-16">
        <MerchantGatewayLanding />
      </div>
    </>
  );
}
