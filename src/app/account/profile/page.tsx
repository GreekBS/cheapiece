import Link from "next/link";

import { ACCOUNT_CARD_CLASS, ACCOUNT_PAGE_CLASS } from "@/components/account/account-styles";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { ProfileDisplayNameForm } from "@/components/account/ProfileDisplayNameForm";
import { IconUser } from "@/components/marketplace-home/marketplace-icons";
import { requireCustomerSession } from "@/lib/auth/require-customer-session";

function formatMemberSince(createdAt: string | undefined): string {
  if (!createdAt) return "—";
  return new Date(createdAt).toLocaleDateString("el-GR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function truncateUserId(userId: string): string {
  if (userId.length <= 8) return userId;
  return `${userId.slice(0, 8)}…`;
}

export default async function AccountProfilePage() {
  const { user, profile } = await requireCustomerSession();

  const displayName =
    (profile?.display_name ??
      (typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : null) ??
      user.email ??
      "") || "Χρήστης";

  const editDisplayName =
    profile?.display_name ??
    (typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : null) ??
    "";

  const email = user.email ?? "—";
  const memberSince = formatMemberSince(user.created_at);
  const accountId = truncateUserId(user.id);

  return (
    <div className={ACCOUNT_PAGE_CLASS}>
      <AccountPageHeader title="Προφίλ" subtitle="Στοιχεία λογαριασμού marketplace." />

      <section aria-labelledby="profile-info-heading" className={ACCOUNT_CARD_CLASS}>
        <h2 id="profile-info-heading" className="text-sm font-semibold text-slate-900">
          Στοιχεία προφίλ
        </h2>
        <div className="mt-4 flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-slate-50 text-slate-500"
            aria-hidden
          >
            <IconUser className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-slate-900">{displayName}</p>
            <ProfileDisplayNameForm initialDisplayName={editDisplayName} email={email} />
          </div>
        </div>
      </section>

      <section aria-labelledby="profile-summary-heading" className={ACCOUNT_CARD_CLASS}>
        <h2 id="profile-summary-heading" className="text-sm font-semibold text-slate-900">
          Σύνοψη λογαριασμού
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Κατάσταση</dt>
            <dd className="mt-1.5">
              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Ενεργός
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Μέλος από</dt>
            <dd className="mt-1.5 text-sm text-slate-900">{memberSince}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">ID λογαριασμού</dt>
            <dd className="mt-1.5 font-mono text-xs text-slate-400" title={user.id}>
              {accountId}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="profile-actions-heading" className={ACCOUNT_CARD_CLASS}>
        <h2 id="profile-actions-heading" className="text-sm font-semibold text-slate-900">
          Γρήγορες ενέργειες
        </h2>
        <nav aria-label="Γρήγορες ενέργειες" className="mt-3 space-y-1">
          <Link
            href="/account/favorites"
            className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            Αγαπημένα
          </Link>
          <Link
            href="/account/orders"
            className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            Παραγγελίες
          </Link>
        </nav>
      </section>
    </div>
  );
}
