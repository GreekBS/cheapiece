/** Flattened facet map for GIN filtering — derived from facet_snapshot at publish only. */
export type FacetIndexMap = Record<string, string>;

export type ProductPublicationIndexRow = {
  product_id: string;
  tenant_id: string;
  category_id: string;
  facet_index: FacetIndexMap;
  has_publication: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductPublicationIndexUpsert = {
  product_id: string;
  tenant_id: string;
  category_id: string;
  facet_index: FacetIndexMap;
  has_publication: boolean;
  published_at: string;
};
