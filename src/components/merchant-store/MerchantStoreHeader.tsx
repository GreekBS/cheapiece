"use client";

import Link from "next/link";
import { useState } from "react";

import { merchantStoreProductsRequestNewPath } from "@/lib/merchant/merchant-store-paths";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

import { useMerchantActiveVendor } from "./MerchantActiveVendorContext";
import { StoreBrandMark } from "./StoreBrandMark";
import { StoreOsBadge } from "./os/StoreOsBadge";
import { storeOsGhostBtn } from "./os/store-os-tokens";

type Props = {
  userEmail: string;
};

function vendorStatusVariant(state: string | undefined): "active" | "draft" | "neutral" {
  const s = (state ?? "").toLowerCase();
  if (s === "active") return "active";
  if (s === "draft") return "draft";
  return "neutral";
}

export function MerchantStoreHeader({ userEmail }: Props) {
  const vendor = useMerchantActiveVendor();
  const [openQuick, setOpenQuick] = useState(false);

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/merchant";
  }

  const statusLabel = (vendor.vendorState ?? "active").toLowerCase() === "active" ? "Active" : vendor.vendorState ?? "Active";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <StoreBrandMark vendorName={vendor.vendorName} logoUrl={vendor.logoUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{vendor.vendorName}</p>
            <p className="text-[11px] text-slate-500">Merchant workspace</p>
          </div>
          <StoreOsBadge variant={vendorStatusVariant(vendor.vendorState)}>{statusLabel}</StoreOsBadge>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenQuick((v) => !v)}
              className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-100/70 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200/70"
            >
              Γρήγορες ενέργειες
            </button>
            {openQuick ? (
              <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10">
                <Link
                  href={merchantStoreProductsRequestNewPath(vendor.vendorId)}
                  className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  onClick={() => setOpenQuick(false)}
                >
                  Αίτηση προϊόντος
                </Link>
              </div>
            ) : null}
          </div>

          <span className="hidden max-w-[160px] truncate text-xs text-slate-500 lg:inline" title={userEmail}>
            {userEmail}
          </span>

          <button type="button" onClick={() => void signOut()} className={storeOsGhostBtn}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
