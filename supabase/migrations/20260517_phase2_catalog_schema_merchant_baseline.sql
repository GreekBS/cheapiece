-- Deprecated: split into phased migrations.
--   Structure: 20260517_01_create_catalog_product_requests.sql
--   Merchant read RLS: 20260517_02_phase2_catalog_schema_merchant_read_rls.sql
-- Pinning triggers / request validation: deferred (Phase 3).
--
-- Intentional no-op for migration history compatibility.

select 1;
