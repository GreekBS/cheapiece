export function NoAvailabilityBanner() {
  return (
    <section
      role="status"
      className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm text-amber-950 shadow-sm sm:px-6"
    >
      <p className="font-semibold text-amber-900">No active offers</p>
      <p className="mt-1 text-amber-950/90">
        This product is listed in the catalog but no marketplace offers are available right now. Check back later or
        browse similar items.
      </p>
    </section>
  );
}
