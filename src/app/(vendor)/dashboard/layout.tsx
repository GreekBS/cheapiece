import { Suspense } from "react";
import { redirect } from "next/navigation";

import { requireSessionUser } from "@/lib/auth/require-user";
import { MERCHANT_ONBOARDING_PATH } from "@/lib/merchant/resolve-merchant-destination";
import { resolveActor } from "@/modules/identity/services/resolve-actor";
import { listAccessibleVendorIds } from "@/modules/vendors/queries/vendor-queries";

/** Phase 4 C1: redirect-only host — no VendorDashboardShell (avoids UI flash before Store OS redirects). */
export default async function VendorDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { supabase, user } = await requireSessionUser();
  await resolveActor(supabase);

  const accessibleIds = await listAccessibleVendorIds(supabase, user.id);
  if (accessibleIds.length === 0) {
    redirect(MERCHANT_ONBOARDING_PATH);
  }

  return (
    <Suspense fallback={<div className="p-4 text-sm text-slate-500">Φόρτωση…</div>}>
      <div className="min-h-0">{children}</div>
    </Suspense>
  );
}
