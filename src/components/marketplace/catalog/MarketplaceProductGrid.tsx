import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Optional id for aria-labelledby from section heading */
  labelledBy?: string;
};

/**
 * Canonical product grid for marketplace browse (1 / 2 / 4 columns).
 */
export function MarketplaceProductGrid({ children, labelledBy }: Props) {
  return (
    <ul
      className="grid grid-cols-1 justify-items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4"
      {...(labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": "Προϊόντα" })}
    >
      {children}
    </ul>
  );
}
