import { storeOsCard, storeOsCardPad, storeOsSectionLabel } from "./store-os-tokens";

type Item = { label: string; done: boolean };

type Props = {
  percent: number;
  items: Item[];
};

export function StoreOsHealthCard({ percent, items }: Props) {
  return (
    <section className={`${storeOsCard} ${storeOsCardPad}`}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={storeOsSectionLabel}>Store health</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{percent}%</p>
        </div>
        <p className="text-xs text-slate-500">Setup completeness</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <ul className="mt-5 space-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 text-sm text-slate-700">
            <span
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold",
                item.done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-400",
              ].join(" ")}
              aria-hidden
            >
              {item.done ? "✓" : "·"}
            </span>
            <span className={item.done ? "" : "text-slate-500"}>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
