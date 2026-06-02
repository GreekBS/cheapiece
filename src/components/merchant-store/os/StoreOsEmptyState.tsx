import { storeOsCard, storeOsCardPad } from "./store-os-tokens";

type Props = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function StoreOsEmptyState({ title, description, action }: Props) {
  return (
    <div className={`${storeOsCard} ${storeOsCardPad} flex flex-col items-center py-14 text-center sm:py-16`}>
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" d="M20 7H4M4 12h16M4 17h10" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}
