const ROWS = [
  { target: "Προϊόν #8821", type: "product", clicks: "12.402", last: "Σήμερα" },
  { target: "Κατηγορία · Τεχνολογία", type: "category", clicks: "8.910", last: "Σήμερα" },
  { target: "Προϊόν #9012", type: "product", clicks: "6.221", last: "Χθες" },
  { target: "Κατηγορία · Gaming", type: "category", clicks: "5.880", last: "Χθες" },
  { target: "Προϊόν #7740", type: "product", clicks: "4.102", last: "30/04/2026" },
];

export default function AdminClickTrackingPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <p className="text-sm font-medium text-red-900/85">
        Καταγραφή clicks (mock · χωρίς event pipeline){" "}
        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Χωρίς σύνδεση</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border-2 border-red-300/75 bg-gradient-to-br from-red-50/60 to-white p-4 shadow-md shadow-red-900/[0.06] ring-1 ring-red-200/55">
          <p className="text-xs font-bold uppercase text-red-800">Σύνολο events</p>
          <p className="mt-1 text-2xl font-bold text-red-950">1,24M</p>
        </div>
        <div className="rounded-xl border-2 border-red-300/75 bg-gradient-to-br from-red-50/60 to-white p-4 shadow-md shadow-red-900/[0.06] ring-1 ring-red-200/55">
          <p className="text-xs font-bold uppercase text-red-800">Μοναδικοί χρήστες</p>
          <p className="mt-1 text-2xl font-bold text-red-950">82.400</p>
        </div>
        <div className="rounded-xl border-2 border-red-300/75 bg-gradient-to-br from-red-50/60 to-white p-4 shadow-md shadow-red-900/[0.06] ring-1 ring-red-200/55">
          <p className="text-xs font-bold uppercase text-red-800">Κορυφαίο target</p>
          <p className="mt-1 truncate text-sm font-semibold text-red-950">Προϊόν #8821</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border-2 border-red-300/75 bg-white shadow-md shadow-red-900/[0.06] ring-1 ring-red-200/55">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-red-200 bg-red-50 text-xs font-semibold uppercase tracking-wide text-red-900/85">
              <tr>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Τύπος</th>
                <th className="px-4 py-3">Clicks</th>
                <th className="px-4 py-3">Τελευταία δραστηριότητα</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100 text-slate-700">
              {ROWS.map((r, i) => (
                <tr key={i} className="hover:bg-red-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.target}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold capitalize text-red-900 ring-1 ring-red-200/80">{r.type}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{r.clicks}</td>
                  <td className="px-4 py-3 text-slate-600">{r.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
