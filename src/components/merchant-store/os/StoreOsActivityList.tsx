import { storeOsCard, storeOsCardPad, storeOsSectionLabel } from "./store-os-tokens";

type Item = { id: string; title: string; detail: string; at: string | null };

function formatAt(iso: string | null) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(t));
}

type Props = { items: Item[]; emptyMessage: string };

export function StoreOsActivityList({ items, emptyMessage }: Props) {
  return (
    <section className={`${storeOsCard} ${storeOsCardPad}`}>
      <p className={storeOsSectionLabel}>Recent activity</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
              </div>
              <time className="shrink-0 text-xs tabular-nums text-slate-400">{formatAt(item.at)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
