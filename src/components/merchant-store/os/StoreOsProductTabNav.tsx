"use client";

import {
  PRODUCT_TAB_LABELS,
  type StoreOsProductTab,
} from "@/components/merchant-store/os/store-os-product-list-types";

const TABS: StoreOsProductTab[] = ["active", "pending", "inactive"];

type Props = {
  activeTab: StoreOsProductTab;
  counts: Record<StoreOsProductTab, number>;
  disabled?: boolean;
  onTabChange: (tab: StoreOsProductTab) => void;
};

export function StoreOsProductTabNav({ activeTab, counts, disabled = false, onTabChange }: Props) {
  return (
    <nav className="min-w-0 flex-1" aria-label="Φίλτρο προϊόντων">
      <div className="inline-flex max-w-full flex-row flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1">
        {TABS.map((tab) => {
          const selected = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              disabled={disabled}
              onClick={() => onTabChange(tab)}
              className={[
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:px-3.5 sm:py-2 sm:text-sm",
                selected
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
                disabled ? "cursor-not-allowed opacity-60" : "",
              ].join(" ")}
            >
              <span className="whitespace-nowrap">{PRODUCT_TAB_LABELS[tab]}</span>
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[10px] tabular-nums sm:text-xs",
                  selected ? "bg-slate-100 text-slate-700" : "bg-slate-200/60 text-slate-500",
                ].join(" ")}
              >
                {counts[tab]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
