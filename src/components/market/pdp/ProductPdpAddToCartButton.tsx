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
      className={`rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed ${className}`}
    >
      Προσθήκη στο καλάθι
    </button>
  );
}
