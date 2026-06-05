import { ACCOUNT_PAGE_CLASS } from "@/components/account/account-styles";
import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";

export default function AccountSettingsPage() {
  return (
    <div className={ACCOUNT_PAGE_CLASS}>
      <AccountPageHeader title="Ρυθμίσεις" subtitle="Ρυθμίσεις λογαριασμού marketplace." />
      <AccountEmptyState description="Σύντομα διαθέσιμες." />
    </div>
  );
}
