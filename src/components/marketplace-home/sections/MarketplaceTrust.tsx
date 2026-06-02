import { trustPoints } from "../marketplace-home-data";
import { TrustGlyph } from "../marketplace-icons";

export function MarketplaceTrust() {
  return (
    <section id="trust" className="border-t border-slate-200/80 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Γιατί να μας εμπιστευτείς</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Σταθερό, επαγγελματικό, χωρίς περιττό θόρυβο — ώστε να νιώθεις ασφαλής σε κάθε επίσκεψη.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {trustPoints.map((t) => (
            <div
              key={t.title}
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/[0.04] transition duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-cyan-50/40 ring-1 ring-slate-100">
                <TrustGlyph name={t.icon} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{t.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
