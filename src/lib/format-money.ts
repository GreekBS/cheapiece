export function formatMoney(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) {
    return "—";
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
