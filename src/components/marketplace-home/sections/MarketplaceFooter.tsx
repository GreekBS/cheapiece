import Link from "next/link";

import { categoryCards } from "../marketplace-home-data";
import { TsipisWordmark } from "../marketplace-icons";

function SocialIcon({ label, network }: { label: string; network: "instagram" | "tiktok" }) {
  const ring =
    network === "instagram"
      ? "border border-pink-200/90 bg-gradient-to-br from-white via-orange-50/70 to-fuchsia-100/80 shadow-sm shadow-pink-300/25 hover:border-pink-300/90 hover:shadow-[0_12px_32px_-8px_rgba(236,72,153,0.45),0_6px_16px_-6px_rgba(251,146,60,0.28)]"
      : "border border-slate-200/90 bg-white text-slate-900 shadow-sm shadow-slate-900/[0.06] hover:border-slate-300/90 hover:shadow-[0_12px_36px_-8px_rgba(34,211,238,0.32),0_6px_18px_-6px_rgba(244,63,94,0.22)]";

  const icon =
    network === "instagram" ? (
      <svg className="h-8 w-8 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition duration-300 group-hover:drop-shadow-[0_2px_8px_rgba(219,39,119,0.35)]" viewBox="0 0 24 24" aria-hidden>
        <defs>
          <linearGradient id="footer-ig-grad" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fdf497" />
            <stop offset="0.2" stopColor="#fd5949" />
            <stop offset="0.55" stopColor="#d6249f" />
            <stop offset="1" stopColor="#285AEB" />
          </linearGradient>
        </defs>
        <rect width="16" height="16" x="4" y="4" rx="4.5" fill="url(#footer-ig-grad)" />
        <circle cx="12" cy="12" r="3.5" fill="none" stroke="white" strokeWidth="1.35" strokeLinecap="round" />
        <circle cx="16.75" cy="7.25" r="1" fill="white" />
      </svg>
    ) : (
      <svg
        className="h-8 w-8 shrink-0 text-slate-900 transition duration-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)] group-hover:drop-shadow-[0_0_10px_rgba(34,211,238,0.55),0_0_14px_rgba(244,63,94,0.35)]"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 11-5.2-1.71 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
      </svg>
    );

  return (
    <span
      className={`group inline-flex h-9 w-9 cursor-default items-center justify-center rounded-full text-[10px] font-semibold transition duration-300 ease-out will-change-transform hover:scale-[1.08] motion-reduce:transition-none motion-reduce:hover:scale-100 ${ring}`}
      title={label}
    >
      {icon}
    </span>
  );
}

export function MarketplaceFooter() {
  return (
    <footer
      id="help"
      className="border-t border-slate-200/90 bg-gradient-to-b from-slate-100/95 to-slate-50 text-slate-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)]"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center rounded-lg outline-none ring-white/0 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-cyan-500/40">
              <TsipisWordmark />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Premium marketplace εμπειρία — καθαρή σύγκριση τιμών, ήρεμο UI, έμφαση στην εμπιστοσύνη.
            </p>
            <div className="mt-6 flex gap-2">
              <SocialIcon label="Instagram" network="instagram" />
              <SocialIcon label="TikTok" network="tiktok" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Κατηγορίες</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {categoryCards.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link href={`/offers?q=${encodeURIComponent(c.query)}`} className="text-slate-600 transition hover:text-slate-950">
                    {c.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/offers" className="font-medium text-slate-900 hover:text-slate-950">
                  Όλες οι προσφορές →
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Υποστήριξη</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <span className="text-slate-500">Κέντρο βοήθειας</span>{" "}
                <span className="text-slate-500">(σύντομα)</span>
              </li>
              <li>
                <span className="text-slate-500">Επικοινωνία</span> <span className="text-slate-500">(σύντομα)</span>
              </li>
              <li>
                <Link href="/offers" className="text-slate-600 hover:text-slate-950">
                  Σύγκριση προϊόντων
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Πωλητές & νομικά</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/merchant" className="text-slate-600 hover:text-slate-950">
                  Εγγραφή πωλητή
                </Link>
              </li>
              <li>
                <span className="text-slate-500">Όροι χρήσης</span> <span className="text-slate-500">(σύντομα)</span>
              </li>
              <li>
                <span className="text-slate-500">Απόρρητο</span> <span className="text-slate-500">(σύντομα)</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-slate-200/90 pt-8">
          <p className="text-center text-xs text-slate-500">© {new Date().getFullYear()} Tsipis · Δημόσια εμπειρία (UI).</p>
        </div>
      </div>
    </footer>
  );
}
