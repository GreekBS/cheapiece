import type { ReactNode } from "react";

import { ACCOUNT_CARD_CLASS, ACCOUNT_PAGE_CLASS } from "@/components/account/account-styles";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";

function SettingsRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3.5 first:pt-0 last:border-0 last:pb-0">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      <span className="shrink-0 text-right text-sm text-slate-600">{value}</span>
    </div>
  );
}

function ActiveBadge() {
  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      Ενεργό
    </span>
  );
}

export default function AccountSettingsPage() {
  return (
    <div className={ACCOUNT_PAGE_CLASS}>
      <AccountPageHeader title="Ρυθμίσεις" subtitle="Διαχείριση προτιμήσεων λογαριασμού" />

      <section aria-labelledby="settings-notifications-heading" className={ACCOUNT_CARD_CLASS}>
        <h2 id="settings-notifications-heading" className="text-sm font-semibold text-slate-900">
          Ειδοποιήσεις
        </h2>
        <div className="mt-2">
          <SettingsRow label="Email ειδοποιήσεις" value={<ActiveBadge />} />
          <SettingsRow label="Marketing emails" value="Σύντομα διαθέσιμα" />
        </div>
      </section>

      <section aria-labelledby="settings-privacy-heading" className={ACCOUNT_CARD_CLASS}>
        <h2 id="settings-privacy-heading" className="text-sm font-semibold text-slate-900">
          Απόρρητο
        </h2>
        <div className="mt-2">
          <SettingsRow label="Προβολή δεδομένων" value="Ελεγχόμενο από σύστημα" />
          <SettingsRow label="Διαγραφή λογαριασμού" value="Επικοινωνήστε με υποστήριξη" />
        </div>
      </section>

      <section aria-labelledby="settings-locale-heading" className={ACCOUNT_CARD_CLASS}>
        <h2 id="settings-locale-heading" className="text-sm font-semibold text-slate-900">
          Γλώσσα &amp; Περιοχή
        </h2>
        <div className="mt-2">
          <SettingsRow label="Γλώσσα" value="Ελληνικά" />
          <SettingsRow label="Περιοχή" value="Ελλάδα" />
        </div>
      </section>
    </div>
  );
}
