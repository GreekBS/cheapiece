/**
 * Server-only hero for `/merchant` guest gateway (no `"use client"`).
 */
export function MerchantGatewayLanding() {
  const benefits = [
    "Publish and update offers from a dedicated merchant workspace.",
    "Keep store operations, pricing, and inventory in one place.",
    "Work with role-based access built for marketplace vendors.",
  ];

  return (
    <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 xl:gap-20">
      <div className="max-w-xl lg:max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm shadow-slate-900/[0.03]">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" aria-hidden />
          Merchant control center
        </p>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
          Manage your store professionally.
        </h1>

        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-8">
          Sign in to open your merchant workspace — publish offers, run store operations, and keep your catalog aligned
          with the marketplace.
        </p>

        <ul className="mt-8 space-y-3.5">
          {benefits.map((line) => (
            <li key={line} className="flex items-start gap-3 text-sm leading-6 text-slate-700 sm:text-[0.9375rem]">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-[10px] font-bold text-slate-800 shadow-sm"
                aria-hidden
              >
                ✓
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-200/80 pt-8 text-xs text-slate-500 sm:text-sm">
          <div>
            <dt className="sr-only">Security</dt>
            <dd className="font-medium text-slate-700">Secure merchant access</dd>
          </div>
          <div>
            <dt className="sr-only">Workspace</dt>
            <dd className="font-medium text-slate-700">Dedicated store URL</dd>
          </div>
          <div>
            <dt className="sr-only">Operations</dt>
            <dd className="font-medium text-slate-700">Offer &amp; inventory tooling</dd>
          </div>
        </dl>
      </div>

      <div className="relative mx-auto w-full max-w-md lg:max-w-none lg:justify-self-end">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-slate-100/80 via-white to-cyan-50/40 blur-2xl"
        />
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.28)]">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Store workspace</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">Demo Merchant Store</p>
            </div>
            <span className="rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              Active
            </span>
          </div>

          <div className="space-y-3 p-5">
            <div className="rounded-xl border border-slate-200/90 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">Wireless headset · SKU-2041</p>
                  <p className="mt-1 text-xs text-slate-500">Offer published · In stock</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">€89.00</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">USB-C dock · SKU-1180</p>
                  <p className="mt-1 text-xs text-slate-500">Draft · Ready to publish</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-500">€54.00</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: "Offers", value: "12" },
                { label: "Active", value: "9" },
                { label: "Drafts", value: "3" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2.5 text-center"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-center text-xs text-slate-500">
            Illustrative preview — sign in to access your workspace
          </p>
        </div>
      </div>
    </section>
  );
}
