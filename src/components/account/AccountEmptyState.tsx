import { ACCOUNT_CARD_CLASS } from "@/components/account/account-styles";

type Props = {
  description: string;
  title?: string;
};

export function AccountEmptyState({ description, title }: Props) {
  return (
    <div className={`${ACCOUNT_CARD_CLASS} text-sm text-slate-600`}>
      {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : null}
      <p className={title ? "mt-2" : undefined}>{description}</p>
    </div>
  );
}
