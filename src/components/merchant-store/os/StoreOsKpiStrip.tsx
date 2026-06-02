import { storeOsCard, storeOsCardPad, storeOsSectionLabel } from "./store-os-tokens";

type Kpi = { label: string; value: string; hint?: string };

type Props = { items: Kpi[] };

export function StoreOsKpiStrip({ items }: Props) {
  return (
    <section className={`${storeOsCard} overflow-hidden`}>
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
        {items.map((item) => (
          <div key={item.label} className={`${storeOsCardPad} py-4 sm:py-5`}>
            <p className={storeOsSectionLabel}>{item.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{item.value}</p>
            {item.hint ? <p className="mt-1 text-xs text-slate-500">{item.hint}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
