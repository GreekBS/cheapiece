function StatCard({ label, value, hint, tone = "mock" }: { label: string; value: string; hint?: string; tone?: "product" | "mock" }) {
  const box =
    tone === "product"
      ? "rounded-xl border-2 border-blue-400/70 bg-gradient-to-br from-blue-50/95 to-white p-4 shadow-md shadow-blue-900/[0.07] ring-1 ring-blue-200/60 sm:p-5"
      : "rounded-xl border-2 border-red-300/75 bg-gradient-to-br from-red-50/50 to-white p-4 shadow-md shadow-red-900/[0.06] ring-1 ring-red-200/50 sm:p-5";
  const labelCls = tone === "product" ? "text-blue-800" : "text-red-800";
  const valueCls = tone === "product" ? "text-blue-950" : "text-slate-900";
  const hintCls = tone === "product" ? "text-blue-700/85" : "text-red-700/80";
  const badge =
    tone === "product" ? (
      <span className="shrink-0 rounded-md bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Dev focus</span>
    ) : (
      <span className="shrink-0 rounded-md bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Mock</span>
    );
  return (
    <div className={box}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-xs font-medium uppercase tracking-wide ${labelCls}`}>{label}</p>
        {badge}
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${valueCls}`}>{value}</p>
      {hint ? <p className={`mt-1 text-xs ${hintCls}`}>{hint}</p> : null}
    </div>
  );
}

function ChartPlaceholder({ title, subtitle, tone = "mock" }: { title: string; subtitle?: string; tone?: "product" | "mock" }) {
  const box =
    tone === "product"
      ? "flex min-h-[220px] flex-col rounded-xl border-2 border-blue-400/70 bg-gradient-to-br from-blue-50/90 to-white p-4 shadow-md shadow-blue-900/[0.07] ring-1 ring-blue-200/60 sm:p-5"
      : "flex min-h-[220px] flex-col rounded-xl border-2 border-red-300/75 bg-gradient-to-br from-red-50/45 to-white p-4 shadow-md shadow-red-900/[0.06] ring-1 ring-red-200/50 sm:p-5";
  const titleCls = tone === "product" ? "text-blue-950" : "text-slate-900";
  const subCls = tone === "product" ? "text-blue-800/80" : "text-red-800/75";
  const pill =
    tone === "product"
      ? "rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
      : "rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white";
  const pillText = tone === "product" ? "Προϊόντα · UI" : "Χωρίς backend";
  const chartBg = tone === "product" ? "from-blue-100/90 to-blue-50/50" : "from-red-100/70 to-red-50/40";
  const barBg = tone === "product" ? "bg-blue-500/35 ring-blue-500/30" : "bg-red-400/40 ring-red-500/25";
  return (
    <div className={box}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className={`text-sm font-semibold ${titleCls}`}>{title}</h2>
          {subtitle ? <p className={`mt-0.5 text-xs ${subCls}`}>{subtitle}</p> : null}
        </div>
        <span className={pill}>{pillText}</span>
      </div>
      <div className={`mt-4 flex flex-1 items-end justify-between gap-1 rounded-lg bg-gradient-to-t ${chartBg} px-2 pb-2 pt-8 ring-1 ${tone === "product" ? "ring-blue-200/60" : "ring-red-200/50"}`}>
        {[40, 65, 45, 80, 55, 90, 70, 85, 50, 75, 60, 95].map((h, i) => (
          <div key={i} className={`flex-1 rounded-t ring-1 ${barBg}`} style={{ height: `${h}%`, maxHeight: "140px" }} />
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-red-900/85">Επισκόπηση πλατφόρμας — mock αριθμοί · κόκκινο = χωρίς σύνδεση · μπλε = περιοχή προϊόντων (dev)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Σύνολο προϊόντων" value="12.480" hint="+3,2% vs προηγ. μήνα (mock)" tone="product" />
        <StatCard label="Σύνολο χρηστών" value="48.200" />
        <StatCard label="Σύνολο καταστημάτων" value="3.240" />
        <StatCard label="Σύνολο παραγγελιών" value="156.900" />
        <StatCard label="Clicks σε προϊόντα" value="2,84M" hint="Σωρευτικά (mock)" tone="product" />
        <StatCard label="Clicks ανά κατηγορία" value="—" hint="Έτοιμο για chart" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StatCard label="Επισκεψιμότητα" value="892k" hint="sessions / μήνα (placeholder)" />
        <StatCard label="Έσοδα" value="428.900 €" hint="mock aggregate" />
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-red-800/90">Analytics · placeholders (χωρίς backend)</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartPlaceholder title="Visits over time" subtitle="Ημερήσια / εβδομαδιαία προβολή" />
          <ChartPlaceholder title="Top products by clicks" subtitle="Κατάταξη mock" tone="product" />
          <ChartPlaceholder title="Top categories" subtitle="Σύγκριση όγκου clicks" />
        </div>
      </section>
    </div>
  );
}
