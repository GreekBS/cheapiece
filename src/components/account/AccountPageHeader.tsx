import {
  ACCOUNT_HEADER_CLASS,
  ACCOUNT_HEADER_SUBTITLE_CLASS,
} from "@/components/account/account-styles";

type Props = {
  title: string;
  subtitle: string;
  titleId?: string;
};

export function AccountPageHeader({ title, subtitle, titleId }: Props) {
  return (
    <div>
      <h1 id={titleId} className={ACCOUNT_HEADER_CLASS}>
        {title}
      </h1>
      <p className={ACCOUNT_HEADER_SUBTITLE_CLASS}>{subtitle}</p>
    </div>
  );
}
