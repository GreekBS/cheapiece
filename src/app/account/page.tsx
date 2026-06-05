import Link from "next/link";

export default function AccountHubPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Λογαριασμός</h1>
      <p className="mt-2 text-sm text-slate-600">Διαχείριση του marketplace λογαριασμού σου.</p>

      <nav className="mt-8 space-y-2 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-sm shadow-slate-900/[0.04]">
        <Link
          href="/account/profile"
          className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
        >
          Προφίλ
        </Link>
        <Link
          href="/account/favorites"
          className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
        >
          Αγαπημένα
        </Link>
      </nav>
    </div>
  );
}
