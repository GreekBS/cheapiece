import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { resolveAdminTenantId } from "@/modules/catalog-schema/queries/catalog-schema-admin-queries";
import { SupabaseSchemaRepository } from "@/modules/catalog-schema/persistence/supabase-schema-repository";
import { loadEditorInitial } from "@/modules/catalog-schema/services/admin-schema-service";
import { CatalogSchemaEditorIsland } from "@/components/admin/catalog-schema/CatalogSchemaEditorIsland";
import { DescriptorPreviewPanel } from "@/components/admin/catalog-schema/DescriptorPreviewPanel";
import { InheritancePanel } from "@/components/admin/catalog-schema/InheritancePanel";
import { formatAuditEntry } from "@/modules/catalog-schema/audit/format-audit-entry";

type Props = { params: { categoryId: string } };

export default async function AdminCatalogSchemaEditPage({ params }: Props) {
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

  const ctx = { tenantId, actorUserId: user.id, repo: new SupabaseSchemaRepository(supabase) };
  const initial = await loadEditorInitial(ctx, category);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Link href={`/admin/catalog-schema/${params.categoryId}`} className="text-sm font-medium text-blue-800 hover:underline">
          ← {category.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Edit schema draft</h1>
        <p className="text-sm text-slate-600">{category.slug}</p>
      </div>

      <CatalogSchemaEditorIsland initial={initial} tenantId={tenantId} />

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Preview</h2>
        <div className="mt-4">
          <DescriptorPreviewPanel preview={initial.preview} />
        </div>
      </section>

      {initial.preview ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Inheritance</h2>
          <div className="mt-4">
            <InheritancePanel chain={initial.inheritanceChain} fieldViews={initial.preview.effectiveFieldViews} />
          </div>
        </section>
      ) : null}

      {initial.auditEvents.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Audit log</h2>
          <ul className="mt-3 space-y-1 text-xs text-slate-700">
            {initial.auditEvents.map((e) => (
              <li key={e.id}>{formatAuditEntry(e)}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
