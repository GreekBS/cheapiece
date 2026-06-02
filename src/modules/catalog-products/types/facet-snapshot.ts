/** Materialized filter facet — derived from schema filterable fields at publish. */
export type ProductFacetEntry = {
  code: string;
  primitive: string;
  label: string;
  /** Normalized value for query/filter (JSON-serializable). */
  value: string | number | boolean | string[] | null;
  displayValue: string;
};
