import type { SupabaseClient } from '@supabase/supabase-js'
import type { DateRange } from '@/lib/admin/date-range'

const JHF_STORE_ID   = 'a0000000-0000-0000-0000-000000000001'
const META_API_VER   = 'v21.0'
const PAID_STATUSES  = ['paid', 'invoiced', 'on_carriage', 'payment_confirmed', 'preparing_shipping', 'in_separation', 'in_transit', 'delivered']

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MetaInsightRow {
  campaign_id:          string
  campaign_name:        string
  adset_id:             string
  adset_name:           string
  ad_id:                string
  ad_name:              string
  spend:                number
  impressions:          number
  reach:                number
  clicks:               number
  inline_link_clicks:   number
  ctr:                  number
  cpc:                  number
  cpm:                  number
  meta_purchases:       number
  meta_purchase_value:  number
  meta_roas:            number
  date_start:           string
}

export interface MetaCampaignSummary {
  campaignId:           string
  campaignName:         string
  spend:                number
  impressions:          number
  clicks:               number
  inlineLinkClicks:     number
  ctr:                  number
  cpc:                  number
  cpm:                  number
  metaPurchases:        number
  metaPurchaseValue:    number
  metaRoas:             number
  justSessions:         number
  justAtc:              number
  justCheckout:         number
  justOrders:           number
  justRevenue:          number
  realRoas:             number
  diagnosis:            string
}

export interface MetaPageData {
  configured:             boolean
  lastSync:               string | null
  totalSpend:             number
  totalImpressions:       number
  totalClicks:            number
  totalInlineLinkClicks:  number
  avgCtr:                 number
  totalMetaPurchases:     number
  totalMetaPurchaseValue: number
  metaRoas:               number
  campaigns:              MetaCampaignSummary[]
  totalMetaSessions:      number
  totalMetaAtc:           number
  totalMetaCheckout:      number
  totalMetaOrders:        number
  totalMetaRevenue:       number
  realRoas:               number
  hasData:                boolean
}

export interface MetaDashboardStats {
  totalSpend:     number
  metaRoas:       number
  realRoas:       number
  topCampaign:    string | null
  alertCampaign:  string | null
  lastSync:       string | null
}

export interface MetaAlert {
  type:      'error' | 'warning' | 'ok'
  title:     string
  desc:      string
  evidence:  string
  action:    string
}

export interface MetaBrainData {
  totalSpend:     number
  realRoas:       number
  topCampaign:    string | null
  wastedSpend:    string | null
  mainAlert:      string | null
  recommendation: string | null
}

// ── Config ────────────────────────────────────────────────────────────────────

export function isMetaConfigured(): boolean {
  const hasToken   = !!process.env.META_ACCESS_TOKEN
  const hasAccount = !!(
    process.env.META_AD_ACCOUNT_ID   ||
    process.env.META_AD_ACCOUNT_ID_1 ||
    process.env.META_AD_ACCOUNT_ID_2 ||
    process.env.META_AD_ACCOUNT_ID_3
  )
  return hasToken && hasAccount
}

export const META_ACCOUNTS = [
  { id: process.env.META_AD_ACCOUNT_ID_1 ?? '', name: 'Conta 1' },
  { id: process.env.META_AD_ACCOUNT_ID_2 ?? '', name: 'Conta 3' },
  { id: process.env.META_AD_ACCOUNT_ID_3 ?? '', name: 'Conta 4' },
]

// ── Funil real (JHF Store — Supabase) cruzado com tráfego Meta ────────────────

export interface MetaFunnelData {
  totalSessions: number
  totalAtc:      number
  totalCheckout: number
  totalOrders:   number
  totalRevenue:  number
}

const META_UTM_FILTER = 'utm_source.ilike.facebook%,utm_source.ilike.instagram%,utm_source.eq.meta,utm_source.eq.fb,utm_source.eq.ig'

export async function getFunnelData(db: SupabaseClient, since: string, until: string): Promise<MetaFunnelData> {
  try {
    const sinceISO = `${since}T00:00:00-03:00`
    const untilISO = `${until}T23:59:59-03:00`

    const [sessR, evtR, ordR] = await Promise.allSettled([
      db.from('sessions').select('id').eq('store_id', JHF_STORE_ID).or(META_UTM_FILTER).gte('started_at', sinceISO).lt('started_at', untilISO),
      db.from('events').select('event_type').eq('store_id', JHF_STORE_ID).in('event_type', ['add_to_cart', 'initiate_checkout']).or(META_UTM_FILTER).gte('created_at', sinceISO).lt('created_at', untilISO),
      db.from('orders').select('total').eq('store_id', JHF_STORE_ID).or(META_UTM_FILTER).in('status', PAID_STATUSES).gte('created_at', sinceISO).lt('created_at', untilISO),
    ])

    const sessions = sessR.status === 'fulfilled' ? (sessR.value.data ?? []) : []
    const events   = evtR.status  === 'fulfilled' ? (evtR.value.data  ?? []) : []
    const orders   = ordR.status  === 'fulfilled' ? (ordR.value.data  ?? []) : []

    return {
      totalSessions: sessions.length,
      totalAtc:      events.filter(e => e.event_type === 'add_to_cart').length,
      totalCheckout: events.filter(e => e.event_type === 'initiate_checkout').length,
      totalOrders:   orders.length,
      totalRevenue:  orders.reduce((s, o) => s + parseFloat(String(o.total ?? 0)), 0),
    }
  } catch {
    return { totalSessions: 0, totalAtc: 0, totalCheckout: 0, totalOrders: 0, totalRevenue: 0 }
  }
}

// ── Live spend — busca diretamente da Meta API (sem DB) ───────────────────────

export interface MetaLiveSpendPeriod {
  spend:       number
  impressions: number
  clicks:      number
  reach:       number
}

export interface MetaLiveAccountSpend {
  id:              string
  name:            string
  today:           MetaLiveSpendPeriod
  last7:           MetaLiveSpendPeriod
  last30:          MetaLiveSpendPeriod
  prevPeriod:      MetaLiveSpendPeriod
  activeCampaigns: number
  pausedCampaigns: number
  dailyAvg:        number
}

export interface MetaLiveCampaign {
  id:          string
  name:        string
  spend:       number
  impressions: number
  clicks:      number
  ctr:         number
  cpm:         number
  cpc:         number
  reach:       number
  accountId:   string
  accountName: string
}

function getPrevPeriod(since: string, until: string): { prevSince: string; prevUntil: string } {
  const sinceMs = new Date(since).getTime()
  const untilMs = new Date(until).getTime()
  const diffMs  = untilMs - sinceMs
  return {
    prevSince: new Date(sinceMs - diffMs).toISOString().slice(0, 10),
    prevUntil: since,
  }
}

async function fetchAccountInsights(
  accountId: string,
  since: string,
  until: string,
): Promise<MetaLiveSpendPeriod> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token || !accountId) return { spend: 0, impressions: 0, clicks: 0, reach: 0 }
  try {
    const params = new URLSearchParams({
      fields:     'spend,impressions,clicks,reach',
      time_range: JSON.stringify({ since, until }),
      level:      'account',
    })
    const res  = await fetch(
      `https://graph.facebook.com/${META_API_VER}/act_${accountId}/insights?${params}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    )
    const data = await res.json() as { data?: Array<Record<string, string>> }
    const row  = data.data?.[0]
    if (!row) return { spend: 0, impressions: 0, clicks: 0, reach: 0 }
    return {
      spend:       parseFloat(row.spend       ?? '0') || 0,
      impressions: parseInt(row.impressions   ?? '0') || 0,
      clicks:      parseInt(row.clicks        ?? '0') || 0,
      reach:       parseInt(row.reach         ?? '0') || 0,
    }
  } catch {
    return { spend: 0, impressions: 0, clicks: 0, reach: 0 }
  }
}

async function getAccountCampaignCount(
  accountId: string,
  token: string,
): Promise<{ active: number; paused: number }> {
  if (!accountId || !token) return { active: 0, paused: 0 }
  try {
    const params = new URLSearchParams({ fields: 'status', limit: '100' })
    const res  = await fetch(
      `https://graph.facebook.com/${META_API_VER}/act_${accountId}/campaigns?${params}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    )
    const data = await res.json() as { data?: Array<{ status: string }> }
    const rows = data.data ?? []
    const active = rows.filter(r => r.status === 'ACTIVE').length
    const paused = rows.filter(r => r.status === 'PAUSED').length
    return { active, paused }
  } catch {
    return { active: 0, paused: 0 }
  }
}

function sumPeriods(periods: MetaLiveSpendPeriod[]): MetaLiveSpendPeriod {
  return periods.reduce(
    (acc, p) => ({
      spend:       acc.spend       + p.spend,
      impressions: acc.impressions + p.impressions,
      clicks:      acc.clicks      + p.clicks,
      reach:       acc.reach       + p.reach,
    }),
    { spend: 0, impressions: 0, clicks: 0, reach: 0 },
  )
}

export interface MetaLiveSpend {
  accounts:   { id: string; name: string; period: MetaLiveSpendPeriod; prevPeriod: MetaLiveSpendPeriod; activeCampaigns: number; pausedCampaigns: number; dailyAvg: number }[]
  total:      MetaLiveSpendPeriod
  totalPrev:  MetaLiveSpendPeriod
  periodDays: number
}

export async function getMetaLiveSpend(since: string, until: string): Promise<MetaLiveSpend | null> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return null

  const accounts = META_ACCOUNTS.filter(a => a.id)
  if (!accounts.length) return null

  const { prevSince, prevUntil } = getPrevPeriod(since, until)
  const sinceMs   = new Date(since).getTime()
  const untilMs   = new Date(until).getTime()
  const periodDays = Math.max(1, Math.round((untilMs - sinceMs) / 86_400_000))

  const results = await Promise.all(
    accounts.map(async acc => {
      const [period, prevPeriod, counts] = await Promise.all([
        fetchAccountInsights(acc.id, since, until),
        fetchAccountInsights(acc.id, prevSince, prevUntil),
        getAccountCampaignCount(acc.id, token),
      ])
      return {
        id:              acc.id,
        name:            acc.name,
        period,
        prevPeriod,
        activeCampaigns: counts.active,
        pausedCampaigns: counts.paused,
        dailyAvg:        periodDays > 0 ? period.spend / periodDays : 0,
      }
    }),
  )

  return {
    accounts:   results,
    total:      sumPeriods(results.map(r => r.period)),
    totalPrev:  sumPeriods(results.map(r => r.prevPeriod)),
    periodDays,
  }
}

export async function getMetaLiveCampaigns(since: string, until: string): Promise<MetaLiveCampaign[]> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return []

  const accounts = META_ACCOUNTS.filter(a => a.id)
  if (!accounts.length) return []

  const fields = 'campaign_id,campaign_name,spend,impressions,clicks,reach,ctr,cpc,cpm'

  const allResults = await Promise.all(
    accounts.map(async acc => {
      try {
        const params = new URLSearchParams({
          fields,
          time_range: JSON.stringify({ since, until }),
          level:      'campaign',
          limit:      '100',
        })
        const res  = await fetch(
          `https://graph.facebook.com/${META_API_VER}/act_${acc.id}/insights?${params}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
        )
        const data = await res.json() as { data?: Array<Record<string, string>> }
        return (data.data ?? []).map(row => ({
          id:          row.campaign_id   ?? '',
          name:        row.campaign_name ?? '',
          spend:       parseFloat(row.spend       ?? '0') || 0,
          impressions: parseInt(row.impressions   ?? '0') || 0,
          clicks:      parseInt(row.clicks        ?? '0') || 0,
          ctr:         parseFloat(row.ctr         ?? '0') || 0,
          cpm:         parseFloat(row.cpm         ?? '0') || 0,
          cpc:         parseFloat(row.cpc         ?? '0') || 0,
          reach:       parseInt(row.reach         ?? '0') || 0,
          accountId:   acc.id,
          accountName: acc.name,
        } satisfies MetaLiveCampaign))
      } catch {
        return [] as MetaLiveCampaign[]
      }
    }),
  )

  return allResults.flat().sort((a, b) => b.spend - a.spend)
}

// ── Meta Graph API fetch ───────────────────────────────────────────────────────
// Server-only. Token is sent via Authorization header, never in logs.

async function fetchInsightsFromMeta(
  since: string,
  until: string,
  level: 'campaign' | 'adset' | 'ad' = 'campaign',
): Promise<MetaInsightRow[]> {
  const token     = process.env.META_ACCESS_TOKEN
  const accountId = process.env.META_AD_ACCOUNT_ID
  if (!token || !accountId) return []

  const fields = [
    'campaign_id', 'campaign_name',
    'adset_id', 'adset_name',
    'ad_id', 'ad_name',
    'spend', 'impressions', 'reach', 'clicks', 'inline_link_clicks',
    'ctr', 'cpc', 'cpm',
    'actions', 'action_values', 'purchase_roas',
  ].join(',')

  const params = new URLSearchParams({
    fields,
    time_range:     JSON.stringify({ since, until }),
    level,
    time_increment: '1',
    limit:          '200',
  })

  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(
      `https://graph.facebook.com/${META_API_VER}/act_${accountId}/insights?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal:  controller.signal,
        cache:   'no-store',
      },
    )
    clearTimeout(timeoutId)

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      const errMsg  = (errBody as {error?: {message?: string}})?.error?.message ?? `HTTP ${res.status}`
      console.error(`[MetaAds] API error (${level}): ${errMsg}`)
      return []
    }

    const data = await res.json() as { data?: Array<Record<string, unknown>> }
    const rows  = data.data ?? []

    const findAction = (arr: Array<{action_type: string; value: string}> | undefined, type: string) =>
      parseFloat(arr?.find(a => a.action_type === type)?.value ?? '0') || 0

    return rows.map(row => {
      const actions      = row.actions      as Array<{action_type: string; value: string}> | undefined
      const actionValues = row.action_values as Array<{action_type: string; value: string}> | undefined
      const spend        = parseFloat(String(row.spend ?? '0')) || 0
      const mpv          = findAction(actionValues, 'purchase')
      const mp           = findAction(actions,      'purchase')

      return {
        campaign_id:         String(row.campaign_id   ?? ''),
        campaign_name:       String(row.campaign_name ?? ''),
        adset_id:            String(row.adset_id      ?? ''),
        adset_name:          String(row.adset_name    ?? ''),
        ad_id:               String(row.ad_id         ?? ''),
        ad_name:             String(row.ad_name       ?? ''),
        spend,
        impressions:         parseInt(String(row.impressions         ?? '0')) || 0,
        reach:               parseInt(String(row.reach              ?? '0')) || 0,
        clicks:              parseInt(String(row.clicks              ?? '0')) || 0,
        inline_link_clicks:  parseInt(String(row.inline_link_clicks  ?? '0')) || 0,
        ctr:                 parseFloat(String(row.ctr ?? '0')) || 0,
        cpc:                 parseFloat(String(row.cpc ?? '0')) || 0,
        cpm:                 parseFloat(String(row.cpm ?? '0')) || 0,
        meta_purchases:      Math.round(mp),
        meta_purchase_value: mpv,
        meta_roas:           spend > 0 ? mpv / spend : 0,
        date_start:          String(row.date_start ?? since),
      }
    })
  } catch (err) {
    clearTimeout(timeoutId)
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error(`[MetaAds] Fetch failed (${level}): ${msg.includes('aborted') ? 'timeout' : msg}`)
    return []
  }
}

// ── DB save ───────────────────────────────────────────────────────────────────

async function saveInsightsToDB(
  db: SupabaseClient,
  rows: MetaInsightRow[],
  level: string,
): Promise<number> {
  if (!rows.length) return 0
  const accountId = process.env.META_AD_ACCOUNT_ID ?? ''

  const records = rows.map(r => ({
    store_id:            JHF_STORE_ID,
    account_id:          accountId,
    date_start:          r.date_start,
    level,
    campaign_id:         r.campaign_id,
    campaign_name:       r.campaign_name,
    adset_id:            r.adset_id,
    adset_name:          r.adset_name,
    ad_id:               r.ad_id,
    ad_name:             r.ad_name,
    spend:               r.spend,
    impressions:         r.impressions,
    reach:               r.reach,
    clicks:              r.clicks,
    inline_link_clicks:  r.inline_link_clicks,
    ctr:                 r.ctr,
    cpc:                 r.cpc,
    cpm:                 r.cpm,
    meta_purchases:      r.meta_purchases,
    meta_purchase_value: r.meta_purchase_value,
    meta_roas:           r.meta_roas,
    raw:                 null,
    synced_at:           new Date().toISOString(),
  }))

  const { error } = await db
    .from('meta_ad_insights')
    .upsert(records, {
      onConflict: 'store_id,account_id,date_start,level,campaign_id,adset_id,ad_id',
      ignoreDuplicates: false,
    })

  if (error) {
    console.error('[MetaAds] DB save error:', error.message)
    return 0
  }
  return records.length
}

// ── Public sync function ───────────────────────────────────────────────────────

export async function syncMetaInsights(
  db: SupabaseClient,
  since: string,
  until: string,
): Promise<{ ok: boolean; count: number; error?: string }> {
  if (!isMetaConfigured()) {
    return { ok: false, count: 0, error: 'META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID não configurado' }
  }

  const startedAt = new Date().toISOString()

  try {
    const rows  = await fetchInsightsFromMeta(since, until, 'campaign')
    const count = await saveInsightsToDB(db, rows, 'campaign')

    try {
      await db.from('meta_sync_logs').insert({
        store_id:       JHF_STORE_ID,
        status:         count > 0 ? 'success' : 'partial',
        started_at:     startedAt,
        finished_at:    new Date().toISOString(),
        records_synced: count,
      })
    } catch { /* log table may not exist yet */ }

    return { ok: true, count }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    try {
      await db.from('meta_sync_logs').insert({
        store_id:       JHF_STORE_ID,
        status:         'error',
        started_at:     startedAt,
        finished_at:    new Date().toISOString(),
        records_synced: 0,
        error_message:  msg,
      })
    } catch { /* log table may not exist yet */ }
    return { ok: false, count: 0, error: msg }
  }
}

// ── Last sync ─────────────────────────────────────────────────────────────────

export async function getLastSync(db: SupabaseClient): Promise<string | null> {
  try {
    const { data } = await db
      .from('meta_sync_logs')
      .select('finished_at')
      .eq('store_id', JHF_STORE_ID)
      .in('status', ['success', 'partial'])
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data?.finished_at ?? null
  } catch {
    return null
  }
}

// ── JHF Meta traffic cross-data ───────────────────────────────────────────────

const META_SOURCE_FILTER =
  'utm_source.ilike.facebook%,utm_source.ilike.instagram%,utm_source.eq.meta,utm_source.eq.fb,utm_source.eq.ig'

async function getMetaCrossData(db: SupabaseClient, range: DateRange) {
  const [sessR, evtR, ordR] = await Promise.allSettled([
    db.from('sessions')
      .select('utm_campaign')
      .eq('store_id', JHF_STORE_ID)
      .or(META_SOURCE_FILTER)
      .gte('started_at', range.startISO)
      .lt('started_at',  range.endISO),
    db.from('events')
      .select('event_type, utm_campaign')
      .eq('store_id', JHF_STORE_ID)
      .in('event_type', ['add_to_cart', 'initiate_checkout'])
      .or(META_SOURCE_FILTER)
      .gte('created_at', range.startISO)
      .lt('created_at',  range.endISO),
    db.from('orders')
      .select('total, utm_campaign')
      .eq('store_id', JHF_STORE_ID)
      .or(META_SOURCE_FILTER)
      .in('status', PAID_STATUSES)
      .gte('created_at', range.startISO)
      .lt('created_at',  range.endISO),
  ])

  const sessions = sessR.status === 'fulfilled' ? (sessR.value.data ?? []) : []
  const events   = evtR.status  === 'fulfilled' ? (evtR.value.data  ?? []) : []
  const orders   = ordR.status  === 'fulfilled' ? (ordR.value.data  ?? []) : []

  type CRow = { sessions: number; atc: number; checkout: number; orders: number; revenue: number }
  const byCampaign: Record<string, CRow> = {}
  const ensure = (k: string) => { if (!byCampaign[k]) byCampaign[k] = { sessions: 0, atc: 0, checkout: 0, orders: 0, revenue: 0 } }

  for (const s of sessions) { const k = (s.utm_campaign ?? '').toLowerCase(); ensure(k); byCampaign[k].sessions++ }
  for (const e of events) {
    const k = (e.utm_campaign ?? '').toLowerCase(); ensure(k)
    if (e.event_type === 'add_to_cart')         byCampaign[k].atc++
    if (e.event_type === 'initiate_checkout') byCampaign[k].checkout++
  }
  for (const o of orders) {
    const k = (o.utm_campaign ?? '').toLowerCase(); ensure(k)
    byCampaign[k].orders++
    byCampaign[k].revenue += parseFloat(String(o.total ?? 0))
  }

  return {
    byCampaign,
    totalSessions: sessions.length,
    totalAtc:      events.filter(e => e.event_type === 'add_to_cart').length,
    totalCheckout: events.filter(e => e.event_type === 'initiate_checkout').length,
    totalOrders:   orders.length,
    totalRevenue:  orders.reduce((s, o) => s + parseFloat(String(o.total ?? 0)), 0),
  }
}

function diagnoseCampaign(
  spend: number,
  ctr: number,
  avgCtr: number,
  metaPurchases: number,
  justOrders: number,
  justSessions: number,
  justAtc: number,
  metaRoas: number,
  realRoas: number,
): string {
  if (spend < 5) return 'Volume baixo'
  if (justOrders === 0 && metaPurchases === 0 && spend > 30) return 'Gastando sem venda'
  if (ctr > avgCtr * 1.5 && justAtc === 0 && spend > 10) return 'CTR bom, sem ATC'
  if (realRoas > 4) return 'Candidata a escala'
  if (realRoas > 2) return 'Boa performance'
  if (metaRoas > 2 && realRoas < 1 && spend > 20) return 'ROAS Meta > Real'
  if (justSessions > 20 && justAtc < 2) return 'Sessões sem intenção'
  return 'Normal'
}

// ── Main page data ─────────────────────────────────────────────────────────────

const EMPTY_PAGE_DATA = (configured: boolean): MetaPageData => ({
  configured,
  lastSync:               null,
  totalSpend:             0,
  totalImpressions:       0,
  totalClicks:            0,
  totalInlineLinkClicks:  0,
  avgCtr:                 0,
  totalMetaPurchases:     0,
  totalMetaPurchaseValue: 0,
  metaRoas:               0,
  campaigns:              [],
  totalMetaSessions:      0,
  totalMetaAtc:           0,
  totalMetaCheckout:      0,
  totalMetaOrders:        0,
  totalMetaRevenue:       0,
  realRoas:               0,
  hasData:                false,
})

export async function getMetaPageData(db: SupabaseClient, range: DateRange): Promise<MetaPageData> {
  if (!isMetaConfigured()) return EMPTY_PAGE_DATA(false)

  try {
    const [insightsRes, crossData, lastSync] = await Promise.all([
      db.from('meta_ad_insights')
        .select('campaign_id, campaign_name, spend, impressions, reach, clicks, inline_link_clicks, ctr, cpc, cpm, meta_purchases, meta_purchase_value')
        .eq('store_id', JHF_STORE_ID)
        .eq('level', 'campaign')
        .gte('date_start', range.start)
        .lt('date_start', range.endExclusive),
      getMetaCrossData(db, range),
      getLastSync(db),
    ])

    const rows = insightsRes.data ?? []
    if (!rows.length) return { ...EMPTY_PAGE_DATA(true), lastSync }

    type Acc = {
      name: string
      spend: number; impressions: number; clicks: number; inlineLinkClicks: number
      ctrSum: number; ctrCount: number
      metaPurchases: number; metaPurchaseValue: number
    }
    const map: Record<string, Acc> = {}

    for (const r of rows) {
      const id = r.campaign_id ?? 'unknown'
      if (!map[id]) map[id] = { name: r.campaign_name ?? id, spend: 0, impressions: 0, clicks: 0, inlineLinkClicks: 0, ctrSum: 0, ctrCount: 0, metaPurchases: 0, metaPurchaseValue: 0 }
      const c = map[id]
      c.spend              += r.spend              ?? 0
      c.impressions        += r.impressions        ?? 0
      c.clicks             += r.clicks             ?? 0
      c.inlineLinkClicks   += r.inline_link_clicks ?? 0
      c.ctrSum             += r.ctr               ?? 0
      c.ctrCount++
      c.metaPurchases      += r.meta_purchases      ?? 0
      c.metaPurchaseValue  += r.meta_purchase_value ?? 0
    }

    const totalSpend   = Object.values(map).reduce((s, c) => s + c.spend, 0)
    const avgCtrGlobal = rows.length > 0 ? rows.reduce((s, r) => s + (r.ctr ?? 0), 0) / rows.length : 0

    const campaigns: MetaCampaignSummary[] = Object.entries(map).map(([id, c]) => {
      const nameKey     = c.name.toLowerCase()
      const cross       = crossData.byCampaign[nameKey]
      const justSessions  = cross?.sessions ?? 0
      const justAtc       = cross?.atc      ?? 0
      const justCheckout  = cross?.checkout ?? 0
      const justOrders    = cross?.orders   ?? 0
      const justRevenue   = cross?.revenue  ?? 0
      const avgCtr        = c.ctrCount > 0 ? c.ctrSum / c.ctrCount : 0
      const metaRoas      = c.spend > 0 ? c.metaPurchaseValue / c.spend : 0
      const realRoas      = c.spend > 0 ? justRevenue / c.spend : 0

      return {
        campaignId:        id,
        campaignName:      c.name,
        spend:             c.spend,
        impressions:       c.impressions,
        clicks:            c.clicks,
        inlineLinkClicks:  c.inlineLinkClicks,
        ctr:               avgCtr,
        cpc:               c.clicks > 0 ? c.spend / c.clicks : 0,
        cpm:               c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
        metaPurchases:     c.metaPurchases,
        metaPurchaseValue: c.metaPurchaseValue,
        metaRoas,
        justSessions,
        justAtc,
        justCheckout,
        justOrders,
        justRevenue,
        realRoas,
        diagnosis: diagnoseCampaign(c.spend, avgCtr, avgCtrGlobal, c.metaPurchases, justOrders, justSessions, justAtc, metaRoas, realRoas),
      }
    }).sort((a, b) => b.spend - a.spend)

    const totalImpressions       = campaigns.reduce((s, c) => s + c.impressions, 0)
    const totalClicks            = campaigns.reduce((s, c) => s + c.clicks, 0)
    const totalInlineLinkClicks  = campaigns.reduce((s, c) => s + c.inlineLinkClicks, 0)
    const avgCtr                 = campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.ctr, 0) / campaigns.length : 0
    const totalMetaPurchases     = campaigns.reduce((s, c) => s + c.metaPurchases, 0)
    const totalMetaPurchaseValue = campaigns.reduce((s, c) => s + c.metaPurchaseValue, 0)
    const metaRoas               = totalSpend > 0 ? totalMetaPurchaseValue / totalSpend : 0
    const realRoas               = totalSpend > 0 ? crossData.totalRevenue / totalSpend : 0

    return {
      configured: true, lastSync,
      totalSpend, totalImpressions, totalClicks, totalInlineLinkClicks, avgCtr,
      totalMetaPurchases, totalMetaPurchaseValue, metaRoas,
      campaigns,
      totalMetaSessions: crossData.totalSessions,
      totalMetaAtc:      crossData.totalAtc,
      totalMetaCheckout: crossData.totalCheckout,
      totalMetaOrders:   crossData.totalOrders,
      totalMetaRevenue:  crossData.totalRevenue,
      realRoas,
      hasData: true,
    }
  } catch (err) {
    console.error('[MetaAds] getMetaPageData:', err instanceof Error ? err.message : err)
    return { ...EMPTY_PAGE_DATA(true) }
  }
}

// ── Dashboard widget ───────────────────────────────────────────────────────────

export async function getMetaDashboardStats(db: SupabaseClient, range: DateRange): Promise<MetaDashboardStats | null> {
  if (!isMetaConfigured()) return null
  try {
    const [insR, lastSync] = await Promise.all([
      db.from('meta_ad_insights')
        .select('campaign_name, spend, meta_purchase_value')
        .eq('store_id', JHF_STORE_ID)
        .eq('level', 'campaign')
        .gte('date_start', range.start)
        .lt('date_start', range.endExclusive),
      getLastSync(db),
    ])

    const rows = insR.data ?? []
    if (!rows.length) return { totalSpend: 0, metaRoas: 0, realRoas: 0, topCampaign: null, alertCampaign: null, lastSync }

    const byName: Record<string, { spend: number; value: number }> = {}
    for (const r of rows) {
      const k = r.campaign_name ?? 'unknown'
      if (!byName[k]) byName[k] = { spend: 0, value: 0 }
      byName[k].spend += r.spend              ?? 0
      byName[k].value += r.meta_purchase_value ?? 0
    }

    const totalSpend = Object.values(byName).reduce((s, c) => s + c.spend, 0)
    const totalValue = Object.values(byName).reduce((s, c) => s + c.value, 0)
    const metaRoas   = totalSpend > 0 ? totalValue / totalSpend : 0

    const sorted       = Object.entries(byName).sort((a, b) => (b[1].value / Math.max(b[1].spend, 0.01)) - (a[1].value / Math.max(a[1].spend, 0.01)))
    const topCampaign  = sorted[0]?.[0] ?? null
    const alertCampaign = Object.entries(byName).find(([, v]) => v.spend > 10 && v.value === 0)?.[0] ?? null

    return { totalSpend, metaRoas, realRoas: 0, topCampaign, alertCampaign, lastSync }
  } catch {
    return null
  }
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function getMetaAlertsData(db: SupabaseClient, range: DateRange): Promise<MetaAlert[]> {
  if (!isMetaConfigured()) {
    return [{ type: 'warning', title: 'Meta Ads não conectado', desc: 'Integração com Meta Marketing API não configurada.', evidence: 'META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID ausente', action: 'Configurar em /admin/meta-ads' }]
  }
  try {
    const data = await getMetaPageData(db, range)
    if (!data.hasData) {
      return [{ type: 'warning', title: 'Meta Ads sem dados no período', desc: 'Nenhum dado de campanha encontrado. Sincronize para ver alertas.', evidence: 'meta_ad_insights vazio para o período', action: 'Sincronizar em /admin/meta-ads' }]
    }

    const alerts: MetaAlert[] = []
    const fmtBrl = (n: number) => `R$ ${n.toFixed(2)}`

    for (const c of data.campaigns) {
      if (c.spend > 30 && c.metaPurchases === 0 && c.justOrders === 0) {
        alerts.push({ type: 'error', title: `Campanha sem conversão: ${c.campaignName}`, desc: `${fmtBrl(c.spend)} investido sem nenhuma compra registrada.`, evidence: `Spend: ${fmtBrl(c.spend)} | Compras Meta: ${c.metaPurchases} | Pedidos JHF: ${c.justOrders}`, action: 'Revisar em /admin/meta-ads' })
      }
      if (c.ctr > data.avgCtr * 1.5 && c.justAtc === 0 && c.spend > 20) {
        alerts.push({ type: 'warning', title: `CTR bom, sem ATC: ${c.campaignName}`, desc: `CTR ${c.ctr.toFixed(2)}% acima da média, mas sem add_to_cart registrado no JHF.`, evidence: `CTR: ${c.ctr.toFixed(2)}% (média ${data.avgCtr.toFixed(2)}%) | ATC JHF: ${c.justAtc}`, action: 'Verificar UTMs e landing page em /admin/meta-ads' })
      }
    }

    if (data.totalSpend > 50 && data.realRoas < 1 && data.totalMetaOrders > 0) {
      alerts.push({ type: 'error', title: `ROAS real abaixo de 1× (${data.realRoas.toFixed(2)}×)`, desc: 'Investimento não está gerando retorno suficiente pelos dados do JHF.', evidence: `Gasto: ${fmtBrl(data.totalSpend)} | Receita Meta sessions: ${fmtBrl(data.totalMetaRevenue)}`, action: 'Revisar estratégia em /admin/meta-ads' })
    }

    if (alerts.length === 0) {
      alerts.push({ type: 'ok', title: 'Meta Ads sem alertas críticos', desc: `${data.campaigns.length} campanha(s) monitorada(s) — ${fmtBrl(data.totalSpend)} no período.`, evidence: `ROAS Meta: ${data.metaRoas.toFixed(2)}× | ROAS real est.: ${data.realRoas.toFixed(2)}×`, action: 'Ver detalhes em /admin/meta-ads' })
    }

    return alerts
  } catch {
    return []
  }
}

// ── Funil, vídeo e diagnóstico — compartilhado entre campanha/conjunto/anúncio ────

interface ActionItem { action_type: string; value: string }

function findAction(arr: ActionItem[] | undefined, type: string): number {
  return parseFloat(arr?.find(a => a.action_type === type)?.value ?? '0') || 0
}

const FUNNEL_FIELDS = [
  'video_play_actions', 'video_p25_watched_actions', 'video_p50_watched_actions',
  'video_p75_watched_actions', 'video_p95_watched_actions', 'video_p100_watched_actions',
  'video_thruplay_watched_actions', 'quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking',
].join(',')

const ACTION_TYPES = {
  viewContent:      'offsite_conversion.fb_pixel_view_content',
  addToCart:        'offsite_conversion.fb_pixel_add_to_cart',
  initiateCheckout: 'offsite_conversion.fb_pixel_initiate_checkout',
  addPaymentInfo:   'offsite_conversion.fb_pixel_add_payment_info',
  purchase:         'offsite_conversion.fb_pixel_purchase',
} as const

export interface MetaFunnelMetrics {
  viewContent:             number
  addToCart:               number
  initiateCheckout:        number
  addPaymentInfo:          number
  costPerViewContent:      number
  costPerAddToCart:        number
  costPerInitiateCheckout: number
  costPerAddPaymentInfo:   number
}

function extractFunnelMetrics(actions: ActionItem[] | undefined, costPerAction: ActionItem[] | undefined): MetaFunnelMetrics {
  return {
    viewContent:             findAction(actions, ACTION_TYPES.viewContent),
    addToCart:               findAction(actions, ACTION_TYPES.addToCart),
    initiateCheckout:        findAction(actions, ACTION_TYPES.initiateCheckout),
    addPaymentInfo:          findAction(actions, ACTION_TYPES.addPaymentInfo),
    costPerViewContent:      findAction(costPerAction, ACTION_TYPES.viewContent),
    costPerAddToCart:        findAction(costPerAction, ACTION_TYPES.addToCart),
    costPerInitiateCheckout: findAction(costPerAction, ACTION_TYPES.initiateCheckout),
    costPerAddPaymentInfo:   findAction(costPerAction, ACTION_TYPES.addPaymentInfo),
  }
}

export interface MetaVideoMetrics {
  videoPlays:      number
  videoP25:        number
  videoP50:        number
  videoP75:        number
  videoP95:        number
  videoP100:       number
  videoThruPlays:  number
  costPerThruPlay: number
  // Hook Rate = reproduções de 3s / impressões · Hold Rate = ThruPlays / reproduções de 3s
  // (a Meta não expõe essas como campo pronto — são "métricas personalizadas" só de UI no
  // Ads Manager, então calculamos aqui pra exibir no nosso admin)
  hookRate:        number
  holdRate:        number
}

function extractVideoMetrics(ins: Record<string, unknown>, impressions: number): MetaVideoMetrics {
  const videoPlays      = findAction(ins.video_play_actions as ActionItem[] | undefined, 'video_view')
  const videoP25        = findAction(ins.video_p25_watched_actions as ActionItem[] | undefined, 'video_view')
  const videoP50        = findAction(ins.video_p50_watched_actions as ActionItem[] | undefined, 'video_view')
  const videoP75        = findAction(ins.video_p75_watched_actions as ActionItem[] | undefined, 'video_view')
  const videoP95        = findAction(ins.video_p95_watched_actions as ActionItem[] | undefined, 'video_view')
  const videoP100       = findAction(ins.video_p100_watched_actions as ActionItem[] | undefined, 'video_view')
  const videoThruPlays  = findAction(ins.video_thruplay_watched_actions as ActionItem[] | undefined, 'video_view')
  const costPerThruPlay = findAction(ins.cost_per_action_type as ActionItem[] | undefined, 'video_thruplay')
  return {
    videoPlays, videoP25, videoP50, videoP75, videoP95, videoP100, videoThruPlays, costPerThruPlay,
    hookRate: impressions > 0 ? (videoPlays / impressions) * 100 : 0,
    holdRate: videoPlays > 0 ? (videoThruPlays / videoPlays) * 100 : 0,
  }
}

export type MetaRanking = 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE_35' | 'BELOW_AVERAGE_20' | 'BELOW_AVERAGE_10' | 'UNKNOWN'

export interface MetaDiagnostics {
  qualityRanking:        MetaRanking
  engagementRateRanking: MetaRanking
  conversionRateRanking: MetaRanking
}

function extractDiagnostics(ins: Record<string, unknown>): MetaDiagnostics {
  return {
    qualityRanking:        (ins.quality_ranking as MetaRanking) ?? 'UNKNOWN',
    engagementRateRanking: (ins.engagement_rate_ranking as MetaRanking) ?? 'UNKNOWN',
    conversionRateRanking: (ins.conversion_rate_ranking as MetaRanking) ?? 'UNKNOWN',
  }
}

// ── Account → Campaigns ───────────────────────────────────────────────────────

export interface MetaCampaignDetail {
  id:               string
  name:             string
  status:           string
  objective:        string
  // Spend
  spend:            number
  // Reach & impressions
  impressions:      number
  reach:            number
  frequency:        number
  // Clicks
  clicks:           number
  inlineLinkClicks: number
  uniqueClicks:     number
  ctr:              number
  uniqueCtr:        number
  // Cost
  cpm:              number
  cpc:              number
  uniqueCpc:        number
  // Conversions
  results:          number
  costPerResult:    number
  // Video
  videoPlays:       number
  videoThruPlays:   number
  costPerThruPlay:  number
  // Engagement
  engagements:      number
  // Funil de conversão, vídeo completo e diagnóstico (novo)
  funnel:           MetaFunnelMetrics
  video:            MetaVideoMetrics
  diagnostics:      MetaDiagnostics
}

export async function getMetaAccountCampaigns(
  accountId: string,
  since: string,
  until: string,
): Promise<MetaCampaignDetail[]> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return []

  const INSIGHT_FIELDS = [
    'campaign_id', 'campaign_name',
    'spend', 'impressions', 'clicks', 'inline_link_clicks', 'unique_clicks',
    'reach', 'ctr', 'unique_ctr', 'cpc', 'cpm', 'frequency',
    'actions', 'cost_per_action_type',
    'video_play_actions', 'video_thruplay_watched_actions',
    FUNNEL_FIELDS,
  ].join(',')

  try {
    const [campaignsRes, insightsRes] = await Promise.all([
      fetch(
        `https://graph.facebook.com/${META_API_VER}/act_${accountId}/campaigns?${new URLSearchParams({ fields: 'id,name,status,objective', limit: '50' })}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
      ),
      fetch(
        `https://graph.facebook.com/${META_API_VER}/act_${accountId}/insights?${new URLSearchParams({
          fields:     INSIGHT_FIELDS,
          level:      'campaign',
          time_range: JSON.stringify({ since, until }),
          limit:      '100',
        })}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
      ),
    ])

    type CampaignRow = { id: string; name: string; status: string; objective: string }
    type InsightRow  = Record<string, unknown>

    const campaigns = ((await campaignsRes.json()) as { data?: CampaignRow[] }).data ?? []
    const insights  = ((await insightsRes.json()) as { data?: InsightRow[] }).data ?? []

    const insightMap: Record<string, InsightRow> = {}
    for (const row of insights) insightMap[String(row.campaign_id ?? '')] = row

    const n = (v: unknown) => parseFloat(String(v ?? '0')) || 0
    const i = (v: unknown) => parseInt(String(v ?? '0'))   || 0

    const results = campaigns.map(c => {
      const ins           = insightMap[c.id] ?? {}
      const actions       = ins.actions              as ActionItem[] | undefined
      const costPerAction = ins.cost_per_action_type as ActionItem[] | undefined
      const videoPlays    = ins.video_play_actions   as ActionItem[] | undefined
      const thruPlays     = ins.video_thruplay_watched_actions as ActionItem[] | undefined
      const PURCHASE      = 'offsite_conversion.fb_pixel_purchase'

      const spend         = n(ins.spend)
      const videoPlaysN   = findAction(videoPlays,    'video_view')
      const thruPlaysN    = findAction(thruPlays,     'video_thruplay')
      const engagements   = findAction(actions,       'post_engagement')
      const costThruPlay  = findAction(costPerAction, 'video_thruplay')

      return {
        id:               c.id,
        name:             c.name,
        status:           c.status,
        objective:        c.objective ?? '',
        spend,
        impressions:      i(ins.impressions),
        reach:            i(ins.reach),
        frequency:        n(ins.frequency),
        clicks:           i(ins.clicks),
        inlineLinkClicks: i(ins.inline_link_clicks),
        uniqueClicks:     i(ins.unique_clicks),
        ctr:              n(ins.ctr),
        uniqueCtr:        n(ins.unique_ctr),
        cpm:              n(ins.cpm),
        cpc:              n(ins.cpc),
        uniqueCpc:        i(ins.unique_clicks) > 0 ? spend / i(ins.unique_clicks) : 0,
        results:          findAction(actions, PURCHASE),
        costPerResult:    findAction(costPerAction, PURCHASE),
        videoPlays:       videoPlaysN,
        videoThruPlays:   thruPlaysN,
        costPerThruPlay:  costThruPlay,
        engagements,
        funnel:           extractFunnelMetrics(actions, costPerAction),
        video:            extractVideoMetrics(ins, i(ins.impressions)),
        diagnostics:      extractDiagnostics(ins),
      }
    })

    return results.sort((a, b) => b.spend - a.spend)
  } catch {
    return []
  }
}

// ── Campaign → Ad Sets ────────────────────────────────────────────────────────

export interface MetaAdsetDetail {
  id:            string
  name:          string
  status:        string
  dailyBudget:   number
  bidStrategy:   string
  spend:         number
  impressions:   number
  clicks:        number
  reach:         number
  ctr:           number
  cpm:           number
  cpc:           number
  frequency:     number
  results:       number
  costPerResult: number
  funnel:        MetaFunnelMetrics
  video:         MetaVideoMetrics
  diagnostics:   MetaDiagnostics
}

export async function getMetaCampaignAdsets(
  accountId: string,
  campaignId: string,
  since: string,
  until: string,
): Promise<MetaAdsetDetail[]> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return []

  try {
    const filteringStr = JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaignId }])

    const [adsetsRes, insightsRes] = await Promise.all([
      fetch(
        `https://graph.facebook.com/${META_API_VER}/act_${accountId}/adsets?${new URLSearchParams({ fields: 'id,name,status,daily_budget,bid_strategy', filtering: filteringStr, limit: '100' })}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
      ),
      fetch(
        `https://graph.facebook.com/${META_API_VER}/act_${accountId}/insights?${new URLSearchParams({
          fields: `adset_id,adset_name,spend,impressions,clicks,reach,ctr,cpc,cpm,frequency,actions,cost_per_action_type,${FUNNEL_FIELDS}`,
          level: 'adset',
          filtering: filteringStr,
          time_range: JSON.stringify({ since, until }),
          limit: '100',
        })}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
      ),
    ])

    type AdsetRow  = { id: string; name: string; status: string; daily_budget: string; bid_strategy: string }
    type InsightRow = Record<string, unknown>

    const adsets   = ((await adsetsRes.json()) as { data?: AdsetRow[] }).data ?? []
    const insights = ((await insightsRes.json()) as { data?: InsightRow[] }).data ?? []

    const insightMap: Record<string, InsightRow> = {}
    for (const row of insights) insightMap[String(row.adset_id ?? '')] = row

    const results = adsets.map(a => {
      const ins           = insightMap[a.id] ?? {}
      const actions       = ins.actions       as ActionItem[] | undefined
      const costPerAction = ins.cost_per_action_type as ActionItem[] | undefined
      const impressions   = parseInt(String(ins.impressions ?? '0')) || 0
      const PURCHASE      = 'offsite_conversion.fb_pixel_purchase'
      return {
        id:            a.id,
        name:          a.name,
        status:        a.status,
        dailyBudget:   parseFloat(a.daily_budget ?? '0') / 100 || 0, // Meta returns in cents
        bidStrategy:   a.bid_strategy ?? '',
        spend:         parseFloat(String(ins.spend      ?? '0')) || 0,
        impressions,
        clicks:        parseInt(String(ins.clicks       ?? '0')) || 0,
        reach:         parseInt(String(ins.reach        ?? '0')) || 0,
        ctr:           parseFloat(String(ins.ctr        ?? '0')) || 0,
        cpm:           parseFloat(String(ins.cpm        ?? '0')) || 0,
        cpc:           parseFloat(String(ins.cpc        ?? '0')) || 0,
        frequency:     parseFloat(String(ins.frequency  ?? '0')) || 0,
        results:       findAction(actions, PURCHASE),
        costPerResult: findAction(costPerAction, PURCHASE),
        funnel:        extractFunnelMetrics(actions, costPerAction),
        video:         extractVideoMetrics(ins, impressions),
        diagnostics:   extractDiagnostics(ins),
      }
    })

    return results.sort((a, b) => b.spend - a.spend)
  } catch {
    return []
  }
}

// ── Video thumbnail fallback ──────────────────────────────────────────────────

async function fetchVideoThumbnail(videoId: string, token: string): Promise<string | null> {
  try {
    const res  = await fetch(
      `https://graph.facebook.com/${META_API_VER}/${videoId}?fields=thumbnails&access_token=${token}`,
      { cache: 'no-store' },
    )
    const data = await res.json() as { thumbnails?: { data?: Array<{ uri?: string }> } }
    return data?.thumbnails?.data?.[0]?.uri ?? null
  } catch { return null }
}

// ── Ad Set → Ads ──────────────────────────────────────────────────────────────

export interface MetaAdDetail {
  id:            string
  name:          string
  status:        string
  spend:         number
  impressions:   number
  clicks:        number
  reach:         number
  ctr:           number
  cpm:           number
  cpc:           number
  frequency:     number
  results:       number
  costPerResult: number
  thumbnailUrl:  string | null
  videoId:       string | null
  adTitle:       string | null
  adBody:        string | null
  ctaType:       string | null
  funnel:        MetaFunnelMetrics
  video:         MetaVideoMetrics
  diagnostics:   MetaDiagnostics
}

export async function getMetaAdsetAds(
  accountId: string,
  adsetId: string,
  since: string,
  until: string,
): Promise<MetaAdDetail[]> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return []

  try {
    const filteringStr = JSON.stringify([{ field: 'adset.id', operator: 'EQUAL', value: adsetId }])

    const [adsRes, insightsRes] = await Promise.all([
      fetch(
        `https://graph.facebook.com/${META_API_VER}/act_${accountId}/ads?${new URLSearchParams({
          fields: 'id,name,status,effective_object_story_spec,creative{id,name,thumbnail_url,body,title}',
          filtering: filteringStr,
          limit: '100',
        })}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
      ),
      fetch(
        `https://graph.facebook.com/${META_API_VER}/act_${accountId}/insights?${new URLSearchParams({
          fields: `ad_id,ad_name,spend,impressions,clicks,reach,ctr,cpc,cpm,frequency,actions,cost_per_action_type,${FUNNEL_FIELDS}`,
          level: 'ad',
          filtering: filteringStr,
          time_range: JSON.stringify({ since, until }),
          limit: '100',
        })}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
      ),
    ])

    type StorySpec = {
      video_data?: { video_id?: string; image_url?: string; title?: string; message?: string; call_to_action?: { type?: string } }
      link_data?:  { name?: string; message?: string; call_to_action?: { type?: string } }
    }
    type Creative = {
      id?: string; name?: string; thumbnail_url?: string; body?: string; title?: string
    }
    type AdRow      = { id: string; name: string; status: string; creative?: Creative; effective_object_story_spec?: StorySpec }
    type InsightRow = Record<string, unknown>

    const ads      = ((await adsRes.json()) as { data?: AdRow[] }).data ?? []
    const insights = ((await insightsRes.json()) as { data?: InsightRow[] }).data ?? []

    const insightMap: Record<string, InsightRow> = {}
    for (const row of insights) insightMap[String(row.ad_id ?? '')] = row

    const results = ads.map(a => {
      const ins           = insightMap[a.id] ?? {}
      const actions       = ins.actions       as ActionItem[] | undefined
      const costPerAction = ins.cost_per_action_type as ActionItem[] | undefined
      const impressions   = parseInt(String(ins.impressions ?? '0')) || 0
      const PURCHASE      = 'offsite_conversion.fb_pixel_purchase'
      const cr            = a.creative
      const spec          = a.effective_object_story_spec

      const thumbnailUrl  = cr?.thumbnail_url ?? null
      const videoId       = spec?.video_data?.video_id ?? null
      const adTitle       = cr?.title ?? spec?.video_data?.title ?? spec?.link_data?.name ?? null
      const adBody        = cr?.body  ?? spec?.video_data?.message ?? spec?.link_data?.message ?? null
      const ctaType       = spec?.video_data?.call_to_action?.type ?? spec?.link_data?.call_to_action?.type ?? null

      return {
        id:            a.id,
        name:          a.name,
        status:        a.status,
        spend:         parseFloat(String(ins.spend      ?? '0')) || 0,
        impressions,
        clicks:        parseInt(String(ins.clicks       ?? '0')) || 0,
        reach:         parseInt(String(ins.reach        ?? '0')) || 0,
        ctr:           parseFloat(String(ins.ctr        ?? '0')) || 0,
        cpm:           parseFloat(String(ins.cpm        ?? '0')) || 0,
        cpc:           parseFloat(String(ins.cpc        ?? '0')) || 0,
        frequency:     parseFloat(String(ins.frequency  ?? '0')) || 0,
        results:       findAction(actions, PURCHASE),
        costPerResult: findAction(costPerAction, PURCHASE),
        thumbnailUrl,
        videoId,
        adTitle,
        adBody,
        ctaType,
        funnel:        extractFunnelMetrics(actions, costPerAction),
        video:         extractVideoMetrics(ins, impressions),
        diagnostics:   extractDiagnostics(ins),
      }
    })

    // Fallback: fetch thumbnails via video_id for ads without thumbnail
    const noThumb = results.filter(a => !a.thumbnailUrl && a.videoId)
    if (noThumb.length > 0) {
      const fetched = await Promise.all(noThumb.map(a => fetchVideoThumbnail(a.videoId!, token)))
      noThumb.forEach((a, idx) => { a.thumbnailUrl = fetched[idx] })
    }

    return results.sort((a, b) => b.spend - a.spend)
  } catch {
    return []
  }
}

// ── Brain data ────────────────────────────────────────────────────────────────

export async function getMetaBrainData(db: SupabaseClient, range: DateRange): Promise<MetaBrainData | null> {
  if (!isMetaConfigured()) return null
  try {
    const data = await getMetaPageData(db, range)
    if (!data.hasData) return null

    const wastedCampaign = data.campaigns.find(c => c.spend > 30 && c.metaPurchases === 0 && c.justOrders === 0)
    const topCampaign    = [...data.campaigns].sort((a, b) => b.realRoas - a.realRoas)[0]

    let mainAlert:      string | null = null
    let recommendation: string | null = null

    if (data.totalSpend > 50 && data.realRoas < 1) {
      mainAlert      = `ROAS real de ${data.realRoas.toFixed(2)}× — investimento sem retorno suficiente`
      recommendation = 'Revisar campanhas com maior gasto e segmentação de público'
    } else if (wastedCampaign) {
      mainAlert      = `"${wastedCampaign.campaignName}" gastou R$ ${wastedCampaign.spend.toFixed(2)} sem conversão`
      recommendation = 'Pausar ou revisar criativos e público desta campanha'
    } else if (topCampaign && topCampaign.realRoas > 2) {
      recommendation = `Aumentar orçamento de "${topCampaign.campaignName}" — ROAS real de ${topCampaign.realRoas.toFixed(2)}×`
    }

    return {
      totalSpend:  data.totalSpend,
      realRoas:    data.realRoas,
      topCampaign: topCampaign?.campaignName ?? null,
      wastedSpend: wastedCampaign ? `R$ ${wastedCampaign.spend.toFixed(2)}` : null,
      mainAlert,
      recommendation,
    }
  } catch {
    return null
  }
}
