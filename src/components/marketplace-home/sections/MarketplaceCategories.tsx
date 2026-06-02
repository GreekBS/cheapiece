import Link from "next/link";

import type { PublicCategoryCard } from "@/modules/catalog/queries/category-queries";

import { CategoryGlyph } from "../marketplace-icons";

const categoryVisual: Record<
  string,
  {
    card: string;
    iconWrap: string;
    iconColor: string;
    hover: string;
  }
> = {
  tech: {
    card: "border-blue-200/60 bg-gradient-to-br from-blue-50/95 via-sky-50/50 to-white",
    iconWrap: "bg-gradient-to-br from-blue-100/90 to-sky-100/70 ring-blue-200/50",
    iconColor: "text-sky-700",
    hover: "hover:border-blue-300/80 hover:shadow-blue-900/[0.06]",
  },
  home: {
    card: "border-amber-200/55 bg-gradient-to-br from-amber-50/95 via-orange-50/45 to-stone-50/90",
    iconWrap: "bg-gradient-to-br from-amber-100/90 to-orange-100/60 ring-amber-200/50",
    iconColor: "text-amber-800",
    hover: "hover:border-amber-300/70 hover:shadow-amber-900/[0.05]",
  },
  gaming: {
    card: "border-violet-200/55 bg-gradient-to-br from-violet-50/95 via-indigo-50/50 to-white",
    iconWrap: "bg-gradient-to-br from-violet-100/90 to-indigo-100/70 ring-violet-200/50",
    iconColor: "text-indigo-700",
    hover: "hover:border-violet-300/75 hover:shadow-violet-900/[0.06]",
  },
  fashion: {
    card: "border-rose-200/55 bg-gradient-to-br from-rose-50/95 via-pink-50/50 to-white",
    iconWrap: "bg-gradient-to-br from-rose-100/90 to-pink-100/65 ring-rose-200/50",
    iconColor: "text-rose-700",
    hover: "hover:border-rose-300/75 hover:shadow-rose-900/[0.05]",
  },
  beauty: {
    card: "border-purple-200/50 bg-gradient-to-br from-purple-50/95 via-fuchsia-50/35 to-white",
    iconWrap: "bg-gradient-to-br from-purple-100/85 to-fuchsia-100/55 ring-purple-200/45",
    iconColor: "text-purple-800",
    hover: "hover:border-purple-300/70 hover:shadow-purple-900/[0.05]",
  },
  sports: {
    card: "border-emerald-200/55 bg-gradient-to-br from-emerald-50/95 via-teal-50/45 to-white",
    iconWrap: "bg-gradient-to-br from-emerald-100/90 to-teal-100/65 ring-emerald-200/50",
    iconColor: "text-teal-800",
    hover: "hover:border-emerald-300/75 hover:shadow-emerald-900/[0.05]",
  },
  appliances: {
    card: "border-slate-300/50 bg-gradient-to-br from-slate-100/95 via-slate-50/80 to-sky-50/40",
    iconWrap: "bg-gradient-to-br from-slate-200/80 to-sky-100/60 ring-slate-300/50",
    iconColor: "text-slate-700",
    hover: "hover:border-slate-400/60 hover:shadow-slate-900/[0.06]",
  },
  business: {
    card: "border-slate-200/65 bg-gradient-to-br from-slate-50/95 via-blue-50/45 to-sky-50/40",
    iconWrap: "bg-gradient-to-br from-slate-200/75 to-sky-100/70 ring-slate-200/55",
    iconColor: "text-slate-800",
    hover: "hover:border-slate-300/80 hover:shadow-slate-900/[0.06]",
  },
  auto: {
    card: "border-indigo-200/50 bg-gradient-to-br from-indigo-50/90 via-slate-100/70 to-white",
    iconWrap: "bg-gradient-to-br from-indigo-100/80 to-slate-200/60 ring-indigo-200/45",
    iconColor: "text-indigo-800",
    hover: "hover:border-indigo-300/70 hover:shadow-indigo-900/[0.05]",
  },
};

const defaultVisual = {
  card: "border-slate-200/80 bg-white",
  iconWrap: "bg-gradient-to-br from-slate-50 to-cyan-50/50 ring-slate-100",
  iconColor: "text-slate-600",
  hover: "hover:border-cyan-200/70 hover:shadow-slate-900/[0.07]",
};

type Props = {
  categories: PublicCategoryCard[];
};

export function MarketplaceCategories({ categories }: Props) {
  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Κατηγορίες</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            Χρωματική ταυτότητα ανά κατηγορία — ίδια πλοήγηση, πιο ζωντανή εικόνα χωρίς κόπωση στα μάτια.
          </p>
        </div>
        <Link href="/offers" className="shrink-0 text-sm font-semibold text-cyan-900 transition hover:text-cyan-800">
          Όλες οι προσφορές →
        </Link>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.length === 0 ? (
          <p className="col-span-full text-center text-sm text-slate-600">Δεν υπάρχουν διαθέσιμες κατηγορίες αυτή τη στιγμή.</p>
        ) : (
          categories.map((c) => {
            const v = categoryVisual[c.slug] ?? defaultVisual;
            return (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className={`group flex flex-col gap-4 rounded-2xl border p-6 shadow-sm shadow-slate-900/[0.04] transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg ${v.card} ${v.hover}`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-1 transition duration-300 group-hover:brightness-[1.02] ${v.iconWrap}`}
                >
                  {c.emoji ? (
                    <span className="text-3xl leading-none" aria-hidden>
                      {c.emoji}
                    </span>
                  ) : (
                    <span className={v.iconColor}>
                      <CategoryGlyph slug={c.slug} />
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">{c.name}</p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
