-- ─────────────────────────────────────────────────────────────────────────────
-- JHF Store — Migration 004: Meta Ads Tables (additive, safe to run multiple times)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── meta_ad_insights ─────────────────────────────────────────────────────────
-- Stores synced campaign/adset/ad-level data from Meta Marketing API.
-- One row per (store, account, date, level, campaign, adset, ad).

CREATE TABLE IF NOT EXISTS meta_ad_insights (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id             UUID        NOT NULL,
  account_id           TEXT        NOT NULL,
  date_start           DATE        NOT NULL,
  level                TEXT        NOT NULL DEFAULT 'campaign',
  campaign_id          TEXT        NOT NULL DEFAULT '',
  campaign_name        TEXT        NOT NULL DEFAULT '',
  adset_id             TEXT        NOT NULL DEFAULT '',
  adset_name           TEXT        NOT NULL DEFAULT '',
  ad_id                TEXT        NOT NULL DEFAULT '',
  ad_name              TEXT        NOT NULL DEFAULT '',
  spend                NUMERIC     NOT NULL DEFAULT 0,
  impressions          INTEGER     NOT NULL DEFAULT 0,
  reach                INTEGER     NOT NULL DEFAULT 0,
  clicks               INTEGER     NOT NULL DEFAULT 0,
  inline_link_clicks   INTEGER     NOT NULL DEFAULT 0,
  ctr                  NUMERIC     NOT NULL DEFAULT 0,
  cpc                  NUMERIC     NOT NULL DEFAULT 0,
  cpm                  NUMERIC     NOT NULL DEFAULT 0,
  meta_purchases       INTEGER     NOT NULL DEFAULT 0,
  meta_purchase_value  NUMERIC     NOT NULL DEFAULT 0,
  meta_roas            NUMERIC     NOT NULL DEFAULT 0,
  raw                  JSONB,
  synced_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT meta_ad_insights_upsert_key
    UNIQUE (store_id, account_id, date_start, level, campaign_id, adset_id, ad_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_insights_store_date
  ON meta_ad_insights (store_id, date_start DESC);

CREATE INDEX IF NOT EXISTS idx_meta_insights_level
  ON meta_ad_insights (store_id, level, date_start DESC);

-- ── meta_sync_logs ────────────────────────────────────────────────────────────
-- Tracks each Meta Ads sync attempt (success or failure).

CREATE TABLE IF NOT EXISTS meta_sync_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID        NOT NULL,
  status         TEXT        NOT NULL, -- 'success' | 'error' | 'partial'
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at    TIMESTAMPTZ,
  records_synced INTEGER     NOT NULL DEFAULT 0,
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_sync_logs_store
  ON meta_sync_logs (store_id, created_at DESC);
