"use client";

export type OfferStatusFilter = "all" | "active" | "draft";

const tabs: { id: OfferStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "draft", label: "Draft" },
];

type Props = {
  value: OfferStatusFilter;
  onChange: (filter: OfferStatusFilter) => void;
};

export function StoreOsOfferFilters({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50/80 p-1">
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
