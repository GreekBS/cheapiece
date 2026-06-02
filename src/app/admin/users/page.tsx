const ROWS = [
  { id: "U-8821", name: "Μαρία Π.", email: "maria.p@example.com", role: "Αγοραστής", status: "Ενεργός" },
  { id: "U-8822", name: "Νίκος Κ.", email: "nikos.k@example.com", role: "Πωλητής", status: "Ενεργός" },
  { id: "U-8823", name: "Ελένη Σ.", email: "eleni.s@example.com", role: "Αγοραστής", status: "Εκκρεμεί" },
  { id: "U-8824", name: "Γιώργος Δ.", email: "giorgos.d@example.com", role: "Admin", status: "Ενεργός" },
  { id: "U-8825", name: "Σοφία Λ.", email: "sofia.l@example.com", role: "Αγοραστής", status: "Ανενεργός" },
];

export default function AdminUsersPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <p className="text-sm font-medium text-red-900/85">
        Χρήστες πλατφόρμας (mock) <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Χωρίς σύνδεση</span>
      </p>
      <div className="overflow-hidden rounded-xl border-2 border-red-300/75 bg-white shadow-md shadow-red-900/[0.06] ring-1 ring-red-200/55">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-red-200 bg-red-50 text-xs font-semibold uppercase tracking-wide text-red-900/85">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Όνομα</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Ρόλος</th>
                <th className="px-4 py-3">Κατάσταση</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100 text-slate-700">
              {ROWS.map((r) => (
                <tr key={r.id} className="hover:bg-red-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.email}</td>
                  <td className="px-4 py-3">{r.role}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900 ring-1 ring-red-200/80">{r.status}</span>
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
