-- ─────────────────────────────────────────────────────────────────────────────
-- JHF Store — Migration 001: Schema Foundation
-- Run first. Creates all tables, indexes, and updated_at trigger.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Updated-at trigger ────────────────────────────────────────────────────────
-- Shared function; all tables with updated_at attach their own trigger to it.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── collections ───────────────────────────────────────────────────────────────
-- One collection = one category (Sport, Clássicos, Titânio & Metal, …).
-- `position` controls display order (sort_order equivalent).

CREATE TABLE IF NOT EXISTS collections (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT,
  image_url   TEXT,
  position    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT collections_slug_unique UNIQUE (slug)
);

CREATE TRIGGER collections_set_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Used by: getCollections() → .order('position')
CREATE INDEX IF NOT EXISTS idx_collections_position
  ON collections (position ASC);

-- ── products ──────────────────────────────────────────────────────────────────
-- `status`   = 'active' | 'draft'  (maps to the "active" business requirement)
-- `featured` = true for homepage spotlight grid
-- `position` field is on variants/images; products are ordered by created_at DESC

CREATE TABLE IF NOT EXISTS products (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT        NOT NULL,
  name          TEXT        NOT NULL,
  description   TEXT,
  collection_id UUID        REFERENCES collections (id) ON DELETE SET NULL,
  status        TEXT        NOT NULL DEFAULT 'active',
  featured      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT products_slug_unique  UNIQUE (slug),
  CONSTRAINT products_status_check CHECK  (status IN ('active', 'draft'))
);

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Used by: getProductsByCollection()  → .eq('collection_id', id)
CREATE INDEX IF NOT EXISTS idx_products_collection
  ON products (collection_id);

-- Used by: all product queries → .eq('status', 'active')
CREATE INDEX IF NOT EXISTS idx_products_status
  ON products (status);

-- Used by: getFeaturedProducts() → .eq('featured', true)
CREATE INDEX IF NOT EXISTS idx_products_featured
  ON products (featured) WHERE featured = TRUE;

-- Used by: getProductsByCollection() → .order('created_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_products_created_at
  ON products (created_at DESC);

-- Used by: searchProducts() → .textSearch('name', query, { config: 'portuguese' })
-- PostgREST translates this to: WHERE to_tsvector('portuguese', name) @@ ...
CREATE INDEX IF NOT EXISTS idx_products_name_fts
  ON products USING GIN (to_tsvector('portuguese', name));

-- ── variants ──────────────────────────────────────────────────────────────────
-- Each product has one or more variants (e.g., "Padrão", or by color/size).
-- `position` controls display order within a product.
-- `yampi_product_id` links to the Yampi checkout platform.

CREATE TABLE IF NOT EXISTS variants (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  price             NUMERIC(10, 2) NOT NULL DEFAULT 0,
  compare_price     NUMERIC(10, 2),
  sku               TEXT,
  stock             INTEGER     NOT NULL DEFAULT 0,
  yampi_product_id  TEXT,
  position          INTEGER     NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER variants_set_updated_at
  BEFORE UPDATE ON variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Used by: embedded resource join → .select('*, variants(*)')
CREATE INDEX IF NOT EXISTS idx_variants_product_id
  ON variants (product_id);

-- Efficient ordered fetch per product
CREATE INDEX IF NOT EXISTS idx_variants_product_position
  ON variants (product_id, position ASC);

-- ── images ────────────────────────────────────────────────────────────────────
-- `url`       = Supabase Storage public URL
--              format: {SUPABASE_URL}/storage/v1/object/public/products/{catSlug}/{prodSlug}/{file}
-- `position`  = 0 → cover image; 1, 2, 3 → gallery order
-- `variant_id`= null for product-level images; set for variant-specific images

CREATE TABLE IF NOT EXISTS images (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        NOT NULL REFERENCES products  (id) ON DELETE CASCADE,
  variant_id  UUID                 REFERENCES variants (id) ON DELETE SET NULL,
  url         TEXT        NOT NULL,
  alt         TEXT,
  position    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Used by: embedded resource join → .select('*, images(*)')
CREATE INDEX IF NOT EXISTS idx_images_product_id
  ON images (product_id);

-- Efficient ordered gallery fetch
CREATE INDEX IF NOT EXISTS idx_images_product_position
  ON images (product_id, position ASC);

-- ── settings ─────────────────────────────────────────────────────────────────
-- Simple key-value store for storefront configuration.
-- Used by: getSetting('announcement_bar')

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER settings_set_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
