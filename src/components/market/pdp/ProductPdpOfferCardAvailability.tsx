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
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className={`font-medium ${inStock ? "text-emerald-700" : "text-zinc-500"}`}>
        {availabilityLabel(stock)}
      </span>
      {condition ? (
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
          {conditionLabel(condition)}
        </span>
      ) : null}
    </div>
  );
}
