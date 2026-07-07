-- ── yampi_catalog_sync_logs ─────────────────────────────────────────────────
-- Tracks each attempt to push a product/variant name change from the admin
-- into Yampi's catalog (success or failure), so drift is debuggable even when
-- nobody was watching the admin UI at the time.

CREATE TABLE IF NOT EXISTS yampi_catalog_sync_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID        NOT NULL,
  variant_id        UUID        REFERENCES variants (id) ON DELETE SET NULL,
  product_id        UUID        REFERENCES products (id) ON DELETE SET NULL,
  yampi_sku_id      TEXT,
  yampi_product_id  TEXT,
  field             TEXT        NOT NULL, -- 'variant_name' | 'product_name'
  status            TEXT        NOT NULL, -- 'success' | 'error'
  new_value         TEXT,
  error_message     TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yampi_catalog_sync_logs_variant
  ON yampi_catalog_sync_logs (variant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_yampi_catalog_sync_logs_product
  ON yampi_catalog_sync_logs (product_id, created_at DESC);
