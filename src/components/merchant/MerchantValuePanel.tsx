/**
 * Server-only marketing panel for `/merchant` (no `"use client"` in this file).
 */
export function MerchantValuePanel() {
  const points = [
    "Reach high-intent marketplace shoppers with less acquisition cost.",
    "Manage listings, stock, and pricing from one operational workspace.",
    "Collaborate with your team using role-based merchant access.",
    "Track offer performance and react quickly to demand changes.",
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-6 shadow-sm sm:p-8 lg:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-gray-100 blur-2xl"
      />
      <p className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
        Merchant portal
      </p>
      <h1 className="mt-5 max-w-xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
        Sell on our marketplace with a clean, reliable merchant workspace.
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-gray-600 sm:text-base">
        Launch your store, publish offers, and scale operations with tools designed for marketplace vendors.
      </p>

      <ul className="mt-7 space-y-3">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-3 text-sm text-gray-700">
            <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs text-white">
              ✓
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
