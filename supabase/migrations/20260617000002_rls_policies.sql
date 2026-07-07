-- ─────────────────────────────────────────────────────────────────────────────
-- JHF Store — Migration 002: Row Level Security
-- Run after 001. Enables RLS and sets public read policies for the storefront.
--
-- Security model:
--   anon key   → read-only access (storefront visitors)
--   service_role key → full access, bypasses RLS (admin scripts)
--   No authenticated-only routes in this project yet.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on every table (default: deny all for anon without a policy)
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE images      ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings    ENABLE ROW LEVEL SECURITY;

-- ── collections: public read ──────────────────────────────────────────────────

CREATE POLICY "anon_read_collections"
  ON collections
  FOR SELECT
  TO anon
  USING (true);

-- ── products: public read — active only ───────────────────────────────────────
-- Draft products are never visible to storefront visitors even via direct API.
-- The queries.ts already filters by status='active'; this is a defense-in-depth.

CREATE POLICY "anon_read_active_products"
  ON products
  FOR SELECT
  TO anon
  USING (status = 'active');

-- ── variants: public read ─────────────────────────────────────────────────────
-- Variants are only reachable via embedded join from products,
-- but the policy is required for PostgREST to permit the join.

CREATE POLICY "anon_read_variants"
  ON variants
  FOR SELECT
  TO anon
  USING (true);

-- ── images: public read ───────────────────────────────────────────────────────

CREATE POLICY "anon_read_images"
  ON images
  FOR SELECT
  TO anon
  USING (true);

-- ── settings: public read ─────────────────────────────────────────────────────

CREATE POLICY "anon_read_settings"
  ON settings
  FOR SELECT
  TO anon
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- No write policies for anon. Admin scripts use service_role key which
-- bypasses RLS entirely — no write policies needed for them either.
-- ─────────────────────────────────────────────────────────────────────────────
