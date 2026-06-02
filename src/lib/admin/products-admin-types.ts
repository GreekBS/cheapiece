/** Admin `/admin/products` — minimal row shapes (not shared with marketplace DTOs). */

export type ProductLifecycleState = "draft" | "active" | "archived";

export type ProductAdminListRow = {
  id: string;
  tenant_id: string;
  category_id: string | null;
  title: string;
  brand: string | null;
  model: string | null;
  slug: string;
  state: ProductLifecycleState;
  created_at: string;
  updated_at: string;
  category_name: string | null;
};

export type ProductAdminDetail = ProductAdminListRow;

export type ProductsAdminListParams = {
  limit: number;
  offset: number;
  state?: ProductLifecycleState | "all";
  categoryId?: string | null;
  search?: string;
};
