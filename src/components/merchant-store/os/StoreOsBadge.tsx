type Variant = "active" | "draft" | "paused" | "neutral" | "soon";

const styles: Record<Variant, string> = {
  active: "border-emerald-200/80 bg-emerald-50 text-emerald-800",
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  paused: "border-amber-200/80 bg-amber-50 text-amber-800",
  neutral: "border-slate-200 bg-white text-slate-600",
  soon: "border-slate-200 bg-slate-50 text-slate-500",
};

export function storeOfferStateVariant(state: string | null | undefined): Variant {
  const s = (state ?? "").toLowerCase();
  if (s === "active") return "active";
  if (s === "draft") return "draft";
  if (s === "paused") return "paused";
  return "neutral";
}

type Props = {
  children: React.ReactNode;
  variant?: Variant;
};

export function StoreOsBadge({ children, variant = "neutral" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
