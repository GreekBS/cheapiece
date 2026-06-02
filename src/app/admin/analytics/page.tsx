import type { ReactNode } from "react";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-red-300/75 bg-gradient-to-br from-red-50/40 to-white p-5 shadow-md shadow-red-900/[0.06] ring-1 ring-red-200/55">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-red-950">{title}</h2>
        <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Mock</span>
      </div>
      <p className="mt-1 text-xs font-medium text-red-800/85">Placeholder · χωρίς backend</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <p className="text-sm font-medium text-red-900/85">
        Συγκεντρωτικά analytics (mock UI) <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Χωρίς σύνδεση</span>
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Block title="Conversion funnel">
          <div className="flex h-48 items-end justify-between gap-2 rounded-lg border border-red-100 bg-red-50/50 px-2 pb-2 ring-1 ring-red-100/80">
            {[30, 55, 40, 70, 45].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-red-400/75 ring-1 ring-red-500/30" style={{ height: `${h}%` }} />
            ))}
          </div>
        </Block>
        <Block title="Revenue trend">
          <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-red-300 bg-red-50/60 text-sm font-medium text-red-800/90">
            Chart area · mock
          </div>
        </Block>
        <Block title="Traffic sources">
          <ul className="space-y-2 text-sm text-slate-800">
            <li className="flex justify-between rounded-lg border border-red-100 bg-red-50/70 px-3 py-2">
              <span>Organic</span>
              <span className="font-semibold tabular-nums text-red-900">42%</span>
            </li>
            <li className="flex justify-between rounded-lg border border-red-100 bg-red-50/70 px-3 py-2">
              <span>Direct</span>
              <span className="font-semibold tabular-nums text-red-900">31%</span>
            </li>
            <li className="flex justify-between rounded-lg border border-red-100 bg-red-50/70 px-3 py-2">
              <span>Campaigns</span>
              <span className="font-semibold tabular-nums text-red-900">27%</span>
            </li>
          </ul>
        </Block>
        <Block title="Session duration">
          <div className="h-48 rounded-lg bg-gradient-to-br from-red-100/80 to-white ring-2 ring-red-200/60" />
        </Block>
      </div>
    </div>
  );
}
