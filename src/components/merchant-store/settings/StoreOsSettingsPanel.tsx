"use client";

import { useState } from "react";

import type { VendorStoreProfileRow } from "@/modules/vendors/queries/vendor-store-profile-queries";
import { StoreOsEmptyState } from "@/components/merchant-store/os/StoreOsEmptyState";
import { storeOsCard, storeOsCardPad, storeOsPage, storeOsPageHeader, storeOsSubtitle, storeOsTitle } from "@/components/merchant-store/os/store-os-tokens";

import { StoreProfileForm } from "./StoreProfileForm";

type SettingsTab = "profile" | "account";

type Props = {
  vendorId: string;
  vendorName: string;
  profile: VendorStoreProfileRow;
  canEdit: boolean;
};

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "border-b-2 border-slate-900 pb-2 text-sm font-semibold text-slate-900"
          : "border-b-2 border-transparent pb-2 text-sm font-medium text-slate-500 hover:text-slate-700"
      }
    >
      {children}
    </button>
  );
}

export function StoreOsSettingsPanel({ vendorId, vendorName, profile, canEdit }: Props) {
  const [tab, setTab] = useState<SettingsTab>("profile");

  return (
    <div className={storeOsPage}>
      <header className={storeOsPageHeader}>
        <h1 className={storeOsTitle}>Ρυθμίσεις</h1>
        <p className={storeOsSubtitle}>Διαμόρφωση καταστήματος — {vendorName}</p>
      </header>

      <nav className="flex gap-6 border-b border-slate-200" aria-label="Ρυθμίσεις καταστήματος">
        <TabButton active={tab === "profile"} onClick={() => setTab("profile")}>
          Προφίλ καταστήματος
        </TabButton>
        <TabButton active={tab === "account"} onClick={() => setTab("account")}>
          Λογαριασμός
        </TabButton>
      </nav>

      {tab === "profile" ? (
        <StoreProfileForm vendorId={vendorId} profile={profile} canEdit={canEdit} />
      ) : (
        <div className={`${storeOsCard} ${storeOsCardPad}`}>
          <StoreOsEmptyState
            title="Λογαριασμός"
            description="Ρυθμίσεις λογαριασμού χρήστη (email, κωδικός, ειδοποιήσεις) θα είναι διαθέσιμες σύντομα."
            action={<p className="text-sm font-medium text-slate-600">Coming soon</p>}
          />
        </div>
      )}
    </div>
  );
}
