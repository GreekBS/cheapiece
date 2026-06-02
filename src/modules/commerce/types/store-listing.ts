export type StoreListingCondition = "new" | "used" | "refurbished";

/** Form values — `suspended` maps to DB `paused` on `store_products`. */
export type StoreListingUiState = "draft" | "active" | "suspended";

export function mapStoreListingUiStateToDb(ui: StoreListingUiState): string {
  return ui === "suspended" ? "paused" : ui;
}

export function mapDbStoreListingStateToUi(db: string): StoreListingUiState {
  if (db === "paused") return "suspended";
  if (db === "draft" || db === "active") return db;
  return "draft";
}
