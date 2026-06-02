export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm font-medium text-red-900/85">
        Ρυθμίσεις πλατφόρμας (mock φόρμα · read-only){" "}
        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Χωρίς σύνδεση</span>
      </p>
      <div className="space-y-4 rounded-xl border-2 border-red-300/75 bg-gradient-to-br from-red-50/35 to-white p-5 shadow-md shadow-red-900/[0.06] ring-1 ring-red-200/55">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-red-800">Όνομα πλατφόρμας</label>
          <input
            type="text"
            defaultValue="Tsipis"
            disabled
            className="mt-1.5 w-full rounded-lg border-2 border-red-300 bg-red-50/80 px-3 py-2 text-sm text-red-950/80"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-red-800">Support email</label>
          <input
            type="email"
            defaultValue="support@example.com"
            disabled
            className="mt-1.5 w-full rounded-lg border-2 border-red-300 bg-red-50/80 px-3 py-2 text-sm text-red-950/80"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-red-800">Λειτουργία συντήρησης</label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="button" disabled className="rounded-full border-2 border-red-600 bg-red-600 px-3 py-1 text-xs font-bold text-white opacity-90 shadow-sm">
              Ανενεργό · mock
            </button>
            <span className="text-xs font-medium text-red-800">Δεν συνδέεται με backend</span>
          </div>
        </div>
      </div>
    </div>
  );
}
