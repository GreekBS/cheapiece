import { ACCOUNT_PAGE_CLASS } from "@/components/account/account-styles";
import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";

export default function AccountOrdersPage() {
  return (
    <div className={ACCOUNT_PAGE_CLASS}>
      <AccountPageHeader title="Παραγγελίες" subtitle="Ιστορικό παραγγελιών marketplace." />
      <AccountEmptyState description="Σύντομα διαθέσιμες." />
    </div>
  );
}
