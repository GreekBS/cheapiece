type Props = {
  stock: number;
  condition: string;
};

function availabilityLabel(stock: number) {
  if (stock <= 0) return "Εξαντλημένο";
  if (stock < 5) return `Μόνο ${stock} διαθέσιμα`;
  return "Διαθέσιμο";
}

function conditionLabel(condition: string) {
  const normalized = condition.trim().toLowerCase();
  if (normalized === "new") return "Νέο";
  if (normalized === "used") return "Μεταχειρισμένο";
  if (normalized === "refurbished") return "Ανακατασκευασμένο";
  return condition;
}

export function ProductPdpOfferCardAvailability({ stock, condition }: Props) {
  const inStock = stock > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${
          inStock
            ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60"
            : "bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200/60"
        }`}
      >
        {availabilityLabel(stock)}
      </span>
      {condition ? (
        <span className="inline-flex items-center rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200/50">
          {conditionLabel(condition)}
        </span>
      ) : null}
    </div>
  );
}
