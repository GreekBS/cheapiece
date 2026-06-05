import { AccountNav } from "@/components/account/AccountNav";

type Props = {
  children: React.ReactNode;
};

export function AccountDashboardShell({ children }: Props) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <aside className="lg:sticky lg:top-24">
          <AccountNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
