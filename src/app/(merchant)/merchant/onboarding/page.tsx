import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { MerchantHubTopBar } from "@/components/merchant/MerchantHubTopBar";
import { MerchantOnboardingForm } from "@/components/merchant/MerchantOnboardingForm";
import { MerchantValuePanel } from "@/components/merchant/MerchantValuePanel";
import { dsCard, dsHeadingPage, dsMuted } from "@/components/ui/merchant-ds";
import {
  MERCHANT_ONBOARDING_PATH,
  resolveMerchantDestination,
} from "@/lib/merchant/resolve-merchant-destination";
import { requireSessionUser } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function MerchantOnboardingPage() {
  noStore();
  const { supabase, user } = await requireSessionUser();
  // Multi-store hub intentionally frozen; users with a store never see onboarding UI.
  const destination = await resolveMerchantDestination(supabase, user.id);
  if (destination !== MERCHANT_ONBOARDING_PATH) {
    redirect(destination);
  }

  return (
    <>
      <MerchantHubTopBar showSignInButton={false} />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
        <MerchantValuePanel />

        <section className={`${dsCard} flex flex-col justify-center p-6 sm:p-8 lg:p-10`}>
          <div className="mb-6 text-center sm:text-left">
            <p className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 shadow-sm">
              Create your first store
            </p>
            <h2 className={`${dsHeadingPage} mt-4`}>No stores yet</h2>
            <p className={`${dsMuted} mt-2 max-w-xl`}>
              Create a vendor record tied to your account. You will open it at a dedicated URL for offers and settings.
            </p>
          </div>
          <MerchantOnboardingForm />
        </section>
        </div>
      </div>
    </>
  );
}
