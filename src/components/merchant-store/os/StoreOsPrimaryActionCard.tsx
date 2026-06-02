import Link from "next/link";

import { storeOsCard, storeOsCardPad, storeOsPrimaryBtn, storeOsSectionLabel } from "./store-os-tokens";

type Props = {
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
};

export function StoreOsPrimaryActionCard({ title, description, ctaHref, ctaLabel }: Props) {
  return (
    <section className={`${storeOsCard} ${storeOsCardPad}`}>
      <p className={storeOsSectionLabel}>Primary action</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
      <Link href={ctaHref} className={`${storeOsPrimaryBtn} mt-5`}>
        {ctaLabel}
      </Link>
    </section>
  );
}
