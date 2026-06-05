import Link from "next/link";

const SECTIONS = [
  {
    href: "/account/profile",
    title: "Προφίλ",
    description: "Στοιχεία λογαριασμού και προσωπικές πληροφορίες.",
  },
  {
    href: "/account/favorites",
    title: "Αγαπημένα",
    description: "Τα προϊόντα που αποθήκευσες.",
  },
  {
    href: "/account/orders",
    title: "Παραγγελίες",
    description: "Ιστορικό παραγγελιών — σύντομα διαθέσιμο.",
  },
  {
    href: "/account/settings",
    title: "Ρυθμίσεις",
    description: "Προτιμήσεις λογαριασμού — σύντομα διαθέσιμες.",
  },
] as const;

export default function AccountHubPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Λογαριασμός</h1>
      <p className="mt-2 text-sm text-slate-600">Καλώς ήρθες στον λογαριασμό σου στο marketplace.</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/[0.04] transition hover:border-slate-300 hover:shadow-md"
          >
            <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
            <p className="mt-1.5 text-sm text-slate-600">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
