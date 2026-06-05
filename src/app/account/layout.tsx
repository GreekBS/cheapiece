import { redirect } from "next/navigation";

import { AccountDashboardShell } from "@/components/account/AccountDashboardShell";
import { MarketplaceFooter } from "@/components/marketplace-home/sections/MarketplaceFooter";
import { MarketplaceNav } from "@/components/marketplace-home/sections/MarketplaceNav";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Props = {
  children: React.ReactNode;
};

/** Customer account shell — reuses marketplace nav/footer without altering browse pages. */
export default async function AccountLayout({ children }: Props) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      <MarketplaceNav />
      <main>
        <AccountDashboardShell>{children}</AccountDashboardShell>
      </main>
      <MarketplaceFooter />
    </div>
  );
}
