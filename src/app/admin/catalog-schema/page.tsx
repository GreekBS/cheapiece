import Link from "next/link";

import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import {
  listCategoriesWithSchemaStatus,
  resolveAdminTenantId,
} from "@/modules/catalog-schema/queries/catalog-schema-admin-queries";
import { PILOT_CATEGORY_SLUGS } from "@/modules/catalog-schema/seed/pilot-slugs";

export default async function AdminCatalogSchemaPage() {
  const { supabase, user } = await requirePlatformAdmin();
  const tenantId = await resolveAdminTenantId(supabase, user.id);
  if (!tenantId) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Catalog Schema</h1>
        <p className="text-sm text-amber-800">Ο λογαριασμός admin δεν έχει tenant_id — απαιτείται για φόρτωση schemas.</p>
      </div>
    );
  }

  const rows = await listCategoriesWithSchemaStatus(supabase, tenantId);
  const pilotSlugList: string[] = Object.values(PILOT_CATEGORY_SLUGS);
  const pilotRows = rows.filter((r) => pilotSlugList.includes(r.slug));
  const otherRows = rows.filter((r) => !pilotSlugList.includes(r.slug));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Catalog Schema (read-only)</h1>
        <p className="mt-1 text-sm text-slate-600">
          Phase 1 — published schema explorer και descriptor preview. Χωρίς merchant / Store OS integration.
        </p>
      </header>

      <SchemaTable title="Pilot categories" rows={pilotRows} />
      {otherRows.length > 0 ? <SchemaTable title="Άλλες κατηγορίες" rows={otherRows} /> : null}
    </div>
  );
}

function SchemaTable({
  title,
  rows,
}: {
  title: string;
  rows: Awaited<ReturnType<typeof listCategoriesWithSchemaStatus>>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">
          Δεν βρέθηκαν κατηγορίες. Τρέξτε{" "}
          <code className="rounded bg-slate-200 px-1">npm run seed:catalog-schema</code>.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Κατηγορία</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Draft</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-slate-700">{r.slug}</td>
                  <td className="px-4 py-3 text-slate-700">{r.publishedVersion ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{r.draftVersion ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {r.publishedSchemaId ? (
                      <Link
                        href={`/admin/catalog-schema/${r.id}`}
                        className="font-medium text-blue-800 hover:underline"
                      >
                        Προβολή
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
