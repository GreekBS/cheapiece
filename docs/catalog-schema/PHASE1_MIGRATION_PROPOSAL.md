# Phase 1 — Catalog Schema Persistence (Migration Proposal)

## Goal

Prove schemas can **persist**, **publish**, **version safely**, **resolve deterministically**, and **survive reloads** — without merchant UI, Store OS, or `products.attributes` writes.

Runtime contracts (`AttributeDefinition`, `CategorySchemaDocument`, `SchemaDescriptor`) remain authoritative. The database adapts to them.

## New tables

### `attribute_definitions`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `tenant_id` | `uuid` FK → `tenants` | |
| `code` | `text` | Namespaced code (`core.title`, `mobile.ram_gb`) |
| `primitive` | `text` | Denormalized for admin filters |
| `definition` | `jsonb` | Full `AttributeDefinition` snapshot |
| `state` | `text` | `active` \| `archived` |
| `created_at` / `updated_at` | `timestamptz` | |

**Unique:** `(tenant_id, code)`

### `category_schema_versions`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | Maps to `CategorySchemaDocument.id` |
| `tenant_id` | `uuid` FK | |
| `category_id` | `uuid` FK → `categories` | Real marketplace category |
| `version` | `integer` | Append-only per category |
| `state` | `text` | `draft` \| `published` \| `archived` |
| `inherits_from_category_id` | `uuid` nullable FK | Category inheritance (not version id) |
| `category_path` | `text` | Denormalized path label |
| `locale` | `text` | e.g. `el` |
| `published_at` | `timestamptz` nullable | Set on publish |
| `matching_config` | `jsonb` | `MatchingConfig` |
| `denormalize_config` | `jsonb` | `DenormalizeMap` |
| `document_snapshot` | `jsonb` nullable | Optional full roundtrip blob (no UI state) |
| `created_at` / `updated_at` | `timestamptz` | |

**Unique:** `(tenant_id, category_id, version)`  
**Partial unique:** one `published` row per `(tenant_id, category_id)`

### `category_schema_fields`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `schema_version_id` | `uuid` FK → `category_schema_versions` ON DELETE CASCADE | |
| `attribute_code` | `text` | |
| `binding` | `jsonb` | `CategorySchemaFieldBinding` (includes `attributeCode`) |
| `sort_order` | `integer` | Mirror binding sort for stable ordering |

**Unique:** `(schema_version_id, attribute_code)`

## Immutability (DB-level)

1. **`category_schema_versions`**: `BEFORE UPDATE` — if `OLD.state = 'published'`, reject changes except `state → archived`.
2. **`category_schema_fields`**: `BEFORE UPDATE/DELETE` — reject when parent version is `published`.
3. **Publish** is append-only: new version row becomes `published`; prior `published` → `archived`.

## RLS

- **SELECT** `attribute_definitions`, `category_schema_versions`, `category_schema_fields`: `platform_admin` only (Phase 1 admin infrastructure).
- **INSERT/UPDATE/DELETE**: `platform_admin` only.
- Merchants: no access in Phase 1.

## Resolution rules (application layer)

`resolveCategorySchema` **fails closed** when:

- No `published` version for category
- Parent category in `inherits_from_category_id` has no published version
- Attribute reference missing from `attribute_definitions`
- Circular category inheritance

No silent fallback to in-memory seeds in production paths.

## Pilot scope (Phase 1 seeds)

**Κινητά:** `core.title`, `core.brand`, `core.model`, `mobile.ram_gb`, `mobile.storage_gb`, `mobile.screen_size`, `core.color`

**Ρούχα:** `core.title`, `apparel.size`, `apparel.material`, `apparel.gender`, `core.color`

## Out of scope (Phase 1)

- Merchant dynamic forms / wizard / Store OS
- `catalog_product_requests` payload writes
- `products.attributes` JSONB
- Variants, media uploads, marketplace facets

## Rollout

1. Apply migration `20260515_catalog_schema_persistence.sql`
2. `npm run seed:catalog-schema -- --tenant-id <uuid>`
3. Verify `/admin/catalog-schema` read-only explorer + descriptor preview
4. Run `npm run test:catalog-schema`

## Backward compatibility

Existing `products`, `categories`, and `catalog_product_requests` are unchanged. Schema tables are additive.
