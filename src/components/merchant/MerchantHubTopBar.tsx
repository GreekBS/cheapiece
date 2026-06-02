"use client";

import { useState } from "react";

import { TsipisWordmark } from "@/components/marketplace-home/marketplace-icons";
import { MerchantLoginModal } from "@/components/merchant/MerchantLoginModal";

type Props = {
  showSignInButton: boolean;
  returnUrlHint?: string;
};

/** Shared with homepage `MarketplaceNav`: sticky glass header, max-w-7xl, Tsipis wordmark, SaaS CTA. */
const merchantNavShell =
  "sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl transition-shadow duration-300 supports-[backdrop-filter]:bg-white/75";

const merchantNavInner = "mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5";

const merchantSignInCta =
  "rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-slate-900/25 transition duration-200 hover:from-slate-900 hover:to-slate-950 sm:px-4 sm:text-sm";

/**
 * Client-only island: homepage-aligned nav + optional sign-in CTA + login modal.
 * No `children` prop — server body stays a sibling in `page.tsx`.
 */
export function MerchantHubTopBar({ showSignInButton, returnUrlHint }: Props) {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <header className={merchantNavShell}>
        <div className={merchantNavInner}>
          <a
            href="/"
            className="flex min-w-0 items-center gap-2.5 rounded-xl px-0.5 py-0.5 outline-none ring-cyan-500/0 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-cyan-400/40 sm:gap-3"
          >
            <TsipisWordmark />
            <span className="hidden border-l border-slate-200/90 pl-3 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 sm:inline">
              Merchant workspace
            </span>
          </a>

          {showSignInButton ? (
            <button type="button" onClick={() => setLoginOpen(true)} className={merchantSignInCta}>
              Σύνδεση
            </button>
          ) : (
            <span className="hidden text-xs font-medium text-slate-500 sm:inline">Store operations</span>
          )}
        </div>
      </header>

      <MerchantLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} returnUrlHint={returnUrlHint} />
    </>
  );
}
