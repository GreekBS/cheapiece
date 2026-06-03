type Props = {
  className?: string;
};

export function ProductPdpAddToCartButton({ className = "" }: Props) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="Σύντομα διαθέσιμο"
      className={`rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm opacity-50 transition-all duration-200 ease-out cursor-not-allowed hover:opacity-60 ${className}`}
    >
      Προσθήκη στο καλάθι
    </button>
  );
}
