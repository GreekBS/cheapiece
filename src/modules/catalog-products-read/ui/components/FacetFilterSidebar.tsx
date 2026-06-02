import Link from "next/link";

import type { CategoryFacetCatalogDTO, CategoryFacetDefinitionDTO } from "../dto/category-facet-catalog.dto";

type FacetFilterSidebarProps = {
  categorySlug: string;
  facetCatalog: CategoryFacetCatalogDTO | null;
  brandOptions: string[];
  selectedBrand: string;
  sort: "newest" | "title_asc";
  selectedFacets: Record<string, string>;
  showClearLink: boolean;
};

type FilterFormProps = FacetFilterSidebarProps & {
  idSuffix: string;
};

function FacetFieldControl({
  facet,
  selectedValue,
  idSuffix,
}: {
  facet: CategoryFacetDefinitionDTO;
  selectedValue: string;
  idSuffix: string;
}) {
  const inputId = `facet-${idSuffix}-${facet.code}`;
  const paramName = `f[${facet.code}]`;

  if (facet.control === "boolean") {
    return (
      <select
        id={inputId}
        name={paramName}
        defaultValue={selectedValue}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2"
      >
        <option value="">Any</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (facet.control === "enum" && facet.enumOptions && facet.enumOptions.length > 0) {
    return (
      <select
        id={inputId}
        name={paramName}
        defaultValue={selectedValue}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2"
      >
        <option value="">Any</option>
        {facet.enumOptions.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (facet.control === "number_range") {
    return (
      <input
        id={inputId}
        name={paramName}
        type="number"
        defaultValue={selectedValue}
        placeholder={facet.unit ? `Value (${facet.unit})` : "Value"}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2"
      />
    );
  }

  return (
    <input
      id={inputId}
      name={paramName}
      type="text"
      defaultValue={selectedValue}
      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2"
    />
  );
}

function FilterForm({
  categorySlug,
  facetCatalog,
  brandOptions,
  selectedBrand,
  sort,
  selectedFacets,
  idSuffix,
}: FilterFormProps) {
  const schemaFacets =
    facetCatalog?.source === "published_schema" ? facetCatalog.facets : [];

  return (
    <form
      method="get"
      action={`/category/${categorySlug}`}
      className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4"
    >
      {schemaFacets.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Catalog filters</p>
          {schemaFacets.map((facet) => (
            <div key={facet.code}>
              <label
                htmlFor={`facet-${idSuffix}-${facet.code}`}
                className="mb-1.5 block text-xs font-medium text-zinc-600"
              >
                {facet.label}
                {facet.unit ? <span className="text-zinc-400"> ({facet.unit})</span> : null}
              </label>
              <FacetFieldControl
                facet={facet}
                selectedValue={selectedFacets[facet.code] ?? ""}
                idSuffix={idSuffix}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <label
          htmlFor={`brand-${idSuffix}-${categorySlug}`}
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500"
        >
          Brand
        </label>
        <select
          id={`brand-${idSuffix}-${categorySlug}`}
          name="brand"
          defaultValue={selectedBrand}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2"
        >
          <option value="">All</option>
          {brandOptions.map((b) => (
            <option key={`${idSuffix}-${b}`} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`sort-${idSuffix}-${categorySlug}`}
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500"
        >
          Sort
        </label>
        <select
          id={`sort-${idSuffix}-${categorySlug}`}
          name="sort"
          defaultValue={sort}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2"
        >
          <option value="newest">Newest first</option>
          <option value="title_asc">Title (A→Z)</option>
        </select>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
      >
        Apply filters
      </button>
    </form>
  );
}

export function FacetFilterSidebar({
  categorySlug,
  facetCatalog,
  brandOptions,
  selectedBrand,
  sort,
  selectedFacets,
  showClearLink,
}: FacetFilterSidebarProps) {
  return (
    <aside className="min-w-0 space-y-3">
      <div className="hidden lg:block">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Filters</h2>
        <FilterForm
          categorySlug={categorySlug}
          facetCatalog={facetCatalog}
          brandOptions={brandOptions}
          selectedBrand={selectedBrand}
          sort={sort}
          selectedFacets={selectedFacets}
          showClearLink={showClearLink}
          idSuffix="d"
        />
      </div>

      <details className="rounded-xl border border-zinc-200 bg-white lg:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 font-medium text-zinc-900 [&::-webkit-details-marker]:hidden">
          Filters <span className="text-zinc-400">▼</span>
        </summary>
        <div className="border-t border-zinc-100 p-3">
          <FilterForm
            categorySlug={categorySlug}
            facetCatalog={facetCatalog}
            brandOptions={brandOptions}
            selectedBrand={selectedBrand}
            sort={sort}
            selectedFacets={selectedFacets}
            showClearLink={showClearLink}
            idSuffix="m"
          />
        </div>
      </details>

      {showClearLink ? (
        <p className="px-1 lg:px-0">
          <Link
            href={`/category/${categorySlug}`}
            className="text-sm font-medium text-cyan-800 hover:text-cyan-900"
          >
            Clear filters
          </Link>
        </p>
      ) : null}
    </aside>
  );
}
