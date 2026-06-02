const ROWS = [
  { id: "S-101", name: "TechWorld", products: "2.840", rating: "4,8", plan: "Pro" },
  { id: "S-102", name: "GadgetHub", products: "1.120", rating: "4,5", plan: "Standard" },
  { id: "S-103", name: "ScreenPro", products: "640", rating: "4,9", plan: "Pro" },
  { id: "S-104", name: "KeysGR", products: "410", rating: "4,6", plan: "Standard" },
];

export default function AdminStoresPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <p className="text-sm font-medium text-red-900/85">
        Καταστήματα (mock) <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Χωρίς σύνδεση</span>
      </p>
      <div className="overflow-hidden rounded-xl border-2 border-red-300/75 bg-white shadow-md shadow-red-900/[0.06] ring-1 ring-red-200/55">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-red-200 bg-red-50 text-xs font-semibold uppercase tracking-wide text-red-900/85">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Όνομα</th>
                <th className="px-4 py-3">Προϊόντα</th>
                <th className="px-4 py-3">Βαθμολογία</th>
                <th className="px-4 py-3">Πλάνο</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100 text-slate-700">
              {ROWS.map((r) => (
                <tr key={r.id} className="hover:bg-red-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 tabular-nums">{r.products}</td>
                  <td className="px-4 py-3">{r.rating}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-900 ring-1 ring-red-300/80">{r.plan}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
