import { requireCustomerSession } from "@/lib/auth/require-customer-session";

export default async function AccountProfilePage() {
  const { user, profile } = await requireCustomerSession();

  const displayName =
    profile?.display_name ??
    (typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : null) ??
    user.email ??
    "";

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Προφίλ</h1>
      <p className="mt-2 text-sm text-slate-600">Στοιχεία λογαριασμού marketplace.</p>
      <dl className="mt-8 space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/[0.04]">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Όνομα</dt>
          <dd className="mt-1 text-sm text-slate-900">{displayName}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
          <dd className="mt-1 text-sm text-slate-900">{user.email}</dd>
        </div>
      </dl>
    </div>
  );
}
