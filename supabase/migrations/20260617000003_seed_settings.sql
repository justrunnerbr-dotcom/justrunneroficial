-- ─────────────────────────────────────────────────────────────────────────────
-- JHF Store — Migration 003: Seed Settings
-- Run after 002. Inserts default storefront configuration values.
-- Idempotent: ON CONFLICT DO NOTHING — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO settings (key, value)
VALUES
  (
    'announcement_bar',
    'Frete grátis acima de R$250 · Compra 100% segura · Entrega em todo Brasil'
  )
ON CONFLICT (key) DO NOTHING;
