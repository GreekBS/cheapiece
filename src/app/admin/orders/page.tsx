const ROWS = [
  { id: "ORD-90021", customer: "Μαρία Π.", total: "124,50 €", status: "Ολοκληρώθηκε", date: "02/05/2026" },
  { id: "ORD-90022", customer: "Νίκος Κ.", total: "59,00 €", status: "Σε αποστολή", date: "02/05/2026" },
  { id: "ORD-90023", customer: "Ελένη Σ.", total: "312,00 €", status: "Αναμονή πληρωμής", date: "01/05/2026" },
  { id: "ORD-90024", customer: "Γιώργος Δ.", total: "18,90 €", status: "Ακυρώθηκε", date: "01/05/2026" },
  { id: "ORD-90025", customer: "Σοφία Λ.", total: "89,00 €", status: "Ολοκληρώθηκε", date: "30/04/2026" },
];

export default function AdminOrdersPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <p className="text-sm font-medium text-red-900/85">
        Παραγγελίες / αγορές (mock) <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Χωρίς σύνδεση</span>
      </p>
      <div className="overflow-hidden rounded-xl border-2 border-red-300/75 bg-white shadow-md shadow-red-900/[0.06] ring-1 ring-red-200/55">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-red-200 bg-red-50 text-xs font-semibold uppercase tracking-wide text-red-900/85">
              <tr>
                <th className="px-4 py-3">Αριθμός</th>
                <th className="px-4 py-3">Πελάτης</th>
                <th className="px-4 py-3">Σύνολο</th>
                <th className="px-4 py-3">Κατάσταση</th>
                <th className="px-4 py-3">Ημερομηνία</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100 text-slate-700">
              {ROWS.map((r) => (
                <tr key={r.id} className="hover:bg-red-50/50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900">{r.id}</td>
                  <td className="px-4 py-3">{r.customer}</td>
                  <td className="px-4 py-3 tabular-nums font-medium">{r.total}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900 ring-1 ring-red-200/80">{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
