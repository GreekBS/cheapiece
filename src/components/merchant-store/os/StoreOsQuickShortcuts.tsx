"use client";

import Link from "next/link";

import type { StoreOsActiveView } from "@/components/merchant-store/os/store-os-view-types";
import { storeOsCard, storeOsCardPad, storeOsSectionLabel } from "./store-os-tokens";

type ViewShortcut = {
  kind: "view";
  view: StoreOsActiveView;
  label: string;
  description: string;
};

type HrefShortcut = {
  kind: "href";
  href: string;
  label: string;
  description: string;
};

export type StoreOsShortcut = ViewShortcut | HrefShortcut;

type Props = {
  shortcuts: StoreOsShortcut[];
  onViewChange?: (view: StoreOsActiveView) => void;
};

const itemClass =
  "w-full rounded-lg border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-white";

export function StoreOsQuickShortcuts({ shortcuts, onViewChange }: Props) {
  return (
    <section className={`${storeOsCard} ${storeOsCardPad}`}>
      <p className={storeOsSectionLabel}>Quick shortcuts</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {shortcuts.map((s) => {
          if (s.kind === "view") {
            return (
              <button
                key={`${s.view}-${s.label}`}
                type="button"
                onClick={() => onViewChange?.(s.view)}
                className={itemClass}
              >
                <p className="text-sm font-medium text-slate-900">{s.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{s.description}</p>
              </button>
            );
          }

          return (
            <Link key={s.href} href={s.href} className={itemClass}>
              <p className="text-sm font-medium text-slate-900">{s.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
