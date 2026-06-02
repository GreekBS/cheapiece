import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { SupabaseSchemaRepository } from "@/modules/catalog-schema/persistence/supabase-schema-repository";
import {
  listSchemaVersionsForCategory,
  resolveAdminTenantId,
} from "@/modules/catalog-schema/queries/catalog-schema-admin-queries";
import {
  CategorySchemaResolutionError,
  resolvePublishedCategorySchema,
} from "@/modules/catalog-schema/services/category-schema-service";
import { recordToCategorySchemaSeed } from "@/modules/catalog-schema/persistence/mappers";

type Props = { params: { categoryId: string } };

export default async function AdminCatalogSchemaCategoryPage({ params }: Props) {
  const { supabase, user } = await requirePlatformAdmin();
  const tenantId = await resolveAdminTenantId(supabase, user.id);
  if (!tenantId) notFound();

  const { data: category } = await supabase
    .from("categories")
    .select("id, name, slug, path")
    .eq("id", params.categoryId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!category) notFound();

  const repo = new SupabaseSchemaRepository(supabase);
  const versions = await listSchemaVersionsForCategory(supabase, tenantId, params.categoryId);

  let descriptorJson: string | null = null;
  let resolutionError: string | null = null;
  let fieldCodes: string[] = [];

  try {
    const resolved = await resolvePublishedCategorySchema(repo, tenantId, params.categoryId);
    descriptorJson = JSON.stringify(resolved.descriptor, null, 2);
    fieldCodes = resolved.effective.fields.map((f) => f.definition.code);
  } catch (e) {
    if (e instanceof CategorySchemaResolutionError) {
      resolutionError = e.message;
    } else {
      resolutionError = e instanceof Error ? e.message : "Unknown resolution error";
    }
  }

  const published = await repo.getPublishedVersion(tenantId, params.categoryId);
  const seed = published ? recordToCategorySchemaSeed(published) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Link href="/admin/catalog-schema" className="text-sm font-medium text-blue-800 hover:underline">
          ← Catalog Schema
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{category.name}</h1>
        <p className="text-sm text-slate-600">
          {category.slug} · {category.path}
        </p>
        <div className="mt-3">
          <Link
            href={`/admin/catalog-schema/${params.categoryId}/edit`}
            className="inline-flex rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            Edit draft
          </Link>
        </div>
      </div>

      {resolutionError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Resolution failed (fail-closed): {resolutionError}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Versions</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">v</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Locale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {versions.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3 font-mono text-slate-800">{v.version}</td>
                  <td className="px-4 py-3">{v.state}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {v.publishedAt ? new Date(v.publishedAt).toLocaleString("el-GR") : "—"}
                  </td>
                  <td className="px-4 py-3">{v.locale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {seed ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Effective fields</h2>
          <ul className="flex flex-wrap gap-2">
            {fieldCodes.map((code) => (
              <li key={code} className="rounded-full bg-slate-200 px-2.5 py-0.5 font-mono text-xs text-slate-800">
                {code}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {descriptorJson ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">SchemaDescriptor preview</h2>
          <pre className="max-h-[32rem] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
            {descriptorJson}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
