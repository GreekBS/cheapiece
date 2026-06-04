import Link from "next/link";

import { MarketplaceNavAuthSlot } from "@/components/marketplace-home/auth/MarketplaceNavAuthSlot";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchProfileForUser } from "@/modules/identity/queries/profile-queries";

import { IconCart, IconSearch, TsipisWordmark } from "../marketplace-icons";

export async function MarketplaceNav() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  if (user) {
    const profile = await fetchProfileForUser(supabase, user.id);
    displayName = profile?.display_name ?? null;
    if (!displayName && typeof user.user_metadata?.display_name === "string") {
      displayName = user.user_metadata.display_name;
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl transition-shadow duration-300 supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-3 py-3 sm:py-3.5">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="flex shrink-0 items-center rounded-xl px-0.5 py-0.5 outline-none ring-cyan-500/0 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-cyan-400/40"
            >
              <TsipisWordmark />
            </Link>

            <form action="/offers" method="get" className="mx-auto hidden min-w-0 flex-1 md:block lg:max-w-2xl">
              <label htmlFor="nav-search" className="sr-only">
                Αναζήτηση προϊόντων
              </label>
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="nav-search"
                  name="q"
                  type="search"
                  placeholder="Αναζήτηση σε χιλιάδες προϊόντα…"
                  className="h-11 w-full rounded-2xl border border-slate-200/90 bg-slate-50/90 py-2.5 pl-11 pr-4 text-sm text-slate-900 shadow-inner shadow-slate-900/[0.03] outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-cyan-400/60 focus:bg-white focus:ring-2 focus:ring-cyan-200/70"
                />
              </div>
            </form>

            <nav className="ml-auto hidden items-center gap-0.5 lg:flex">
              <Link
                href="#categories"
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition duration-200 hover:bg-slate-100/90 hover:text-slate-900"
              >
                Κατηγορίες
              </Link>
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0 sm:gap-2">
              <Link
                href="/cart"
                className="inline-flex rounded-xl border border-slate-200/90 bg-white p-2 text-slate-500 transition duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                aria-label="Καλάθι"
              >
                <IconCart className="h-5 w-5" />
              </Link>
              <MarketplaceNavAuthSlot
                initial={{
                  userId: user?.id ?? null,
                  email: user?.email ?? null,
                  displayName,
                }}
              />
            </div>
          </div>

          <form action="/offers" method="get" className="md:hidden">
            <label htmlFor="nav-search-mobile" className="sr-only">
              Αναζήτηση προϊόντων
            </label>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="nav-search-mobile"
                name="q"
                type="search"
                placeholder="Αναζήτηση…"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-200/70"
              />
            </div>
          </form>
        </div>
      </div>
    </header>
  );
}
