import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DateRange } from '@/lib/admin/date-range'
import {
  META_ACCOUNTS,
  getMetaAccountCampaigns,
  getMetaAccountAdsets,
  getMetaAccountAds,
  getMetaCrossDataByField,
  getMetaUtmCross,
  getMetaAccountDailySpend,
  type MetaCrossResult,
} from '@/lib/admin/meta-ads'
import { getGoogleAdsLiveSpend, getGoogleAdsDailySpend } from '@/lib/admin/google-ads'
import { getPedidosLucro, type PedidosLucroData } from '@/lib/admin/gerenciador-pedidos'

export interface GerenciadorRow {
  id:             string
  name:           string
  parentLabel:    string | null
  // Nome da campanha/conjunto pai — usado pra filtrar em cascata (clicar numa
  // campanha filtra os conjuntos/anúncios dela nas outras abas). parentLabel
  // acima é só pra exibição (pode juntar campanha+conjunto num texto só).
  campaignName:   string | null
  adsetName:      string | null
  status:         string
  accountName:    string
  dailyBudget:    number | null
  spend:          number
  sessions:       number
  orders:         number
  conversionRate: number
  metaResults:    number
  thumbnailUrl?:  string | null
}

export interface GerenciadorTotals {
  spend:          number
  sessions:       number
  orders:         number
  conversionRate: number
  metaResults:    number
}

export interface GerenciadorTabData {
  rows:   GerenciadorRow[]
  totals: GerenciadorTotals
}

export interface GerenciadorAccount {
  id:   string
  name: string
}

export interface GerenciadorData {
  campanhas:  GerenciadorTabData
  conjuntos:  GerenciadorTabData
  anuncios:   GerenciadorTabData
  accounts:   GerenciadorAccount[]
  configured: boolean
}

function crossFor(cross: MetaCrossResult, name: string) {
  return cross.byKey[name.toLowerCase()] ?? { sessions: 0, orders: 0, revenue: 0 }
}

function buildTotals(rows: GerenciadorRow[]): GerenciadorTotals {
  const spend       = rows.reduce((s, r) => s + r.spend, 0)
  const sessions    = rows.reduce((s, r) => s + r.sessions, 0)
  const orders      = rows.reduce((s, r) => s + r.orders, 0)
  const metaResults = rows.reduce((s, r) => s + r.metaResults, 0)
  return { spend, sessions, orders, metaResults, conversionRate: sessions > 0 ? (orders / sessions) * 100 : 0 }
}

export async function getGerenciadorData(db: SupabaseClient, range: DateRange): Promise<GerenciadorData> {
  const accounts = META_ACCOUNTS.filter(a => a.id)
  if (!accounts.length) {
    const empty = { rows: [], totals: { spend: 0, sessions: 0, orders: 0, conversionRate: 0, metaResults: 0 } }
    return { campanhas: empty, conjuntos: empty, anuncios: empty, accounts: [], configured: false }
  }

  const [campaignsByAcc, adsetsByAcc, adsByAcc, campaignCross, adsetCross, adCross] = await Promise.all([
    Promise.all(accounts.map(a => getMetaAccountCampaigns(a.id, range.start, range.endExclusive))),
    Promise.all(accounts.map(a => getMetaAccountAdsets(a.id, range.start, range.endExclusive))),
    Promise.all(accounts.map(a => getMetaAccountAds(a.id, range.start, range.endExclusive))),
    getMetaCrossDataByField(db, range, 'utm_campaign'),
    getMetaCrossDataByField(db, range, 'utm_term'),
    getMetaCrossDataByField(db, range, 'utm_content'),
  ])

  const campanhaRows: GerenciadorRow[] = accounts.flatMap((acc, i) => campaignsByAcc[i].map(c => {
    const cross = crossFor(campaignCross, c.name)
    return {
      id:             c.id,
      name:           c.name,
      parentLabel:    null,
      campaignName:   null,
      adsetName:      null,
      status:         c.status,
      accountName:    acc.name,
      dailyBudget:    c.dailyBudget,
      spend:          c.spend,
      sessions:       cross.sessions,
      orders:         cross.orders,
      conversionRate: cross.sessions > 0 ? (cross.orders / cross.sessions) * 100 : 0,
      metaResults:    c.results,
    }
  })).sort((a, b) => b.spend - a.spend)

  const conjuntoRows: GerenciadorRow[] = accounts.flatMap((acc, i) => adsetsByAcc[i].map(a => {
    const cross = crossFor(adsetCross, a.name)
    return {
      id:             a.id,
      name:           a.name,
      parentLabel:    a.campaignName || null,
      campaignName:   a.campaignName || null,
      adsetName:      null,
      status:         a.status,
      accountName:    acc.name,
      dailyBudget:    a.dailyBudget > 0 ? a.dailyBudget : null,
      spend:          a.spend,
      sessions:       cross.sessions,
      orders:         cross.orders,
      conversionRate: cross.sessions > 0 ? (cross.orders / cross.sessions) * 100 : 0,
      metaResults:    a.results,
    }
  })).sort((a, b) => b.spend - a.spend)

  const anuncioRows: GerenciadorRow[] = accounts.flatMap((acc, i) => adsByAcc[i].map(a => {
    const cross = crossFor(adCross, a.name)
    return {
      id:             a.id,
      name:           a.name,
      parentLabel:    [a.campaignName, a.adsetName].filter(Boolean).join(' · ') || null,
      campaignName:   a.campaignName || null,
      adsetName:      a.adsetName || null,
      status:         a.status,
      accountName:    acc.name,
      dailyBudget:    null,
      spend:          a.spend,
      sessions:       cross.sessions,
      orders:         cross.orders,
      conversionRate: cross.sessions > 0 ? (cross.orders / cross.sessions) * 100 : 0,
      metaResults:    a.results,
      thumbnailUrl:   a.thumbnailUrl,
    }
  })).sort((a, b) => b.spend - a.spend)

  return {
    campanhas: { rows: campanhaRows, totals: buildTotals(campanhaRows) },
    conjuntos: { rows: conjuntoRows, totals: buildTotals(conjuntoRows) },
    anuncios:  { rows: anuncioRows,  totals: buildTotals(anuncioRows) },
    accounts:  accounts.map(a => ({ id: a.id, name: a.name })),
    configured: true,
  }
}

// ── Página Gerenciador › Pedidos ─────────────────────────────────────────────
// Só precisa do gasto por campanha (não de conjuntos/anúncios), então tem cache
// próprio e leve: 5 min por conta+período. Erro nunca vai pro cache (strict).

const cachedAccountCampaignSpend = unstable_cache(
  async (accountId: string, since: string, until: string) => {
    const campaigns = await getMetaAccountCampaigns(accountId, since, until, true)
    return campaigns.map(c => ({ name: c.name, spend: c.spend }))
  },
  ['pedidos-account-campaign-spend-v1'],
  { revalidate: 300 },
)

// A Just Runner não tem conta de Google Ads: 'not_configured' é gasto zero de
// verdade (mesma regra do financial-breakdown), não fonte faltando. Erro de
// API continua subindo e vira "gasto do Google indisponível" na tela.
const cachedGoogleSpend = unstable_cache(
  async (since: string, until: string) => {
    const r = await getGoogleAdsLiveSpend(since, until)
    if (r.status === 'not_configured') return 0
    if (r.status !== 'ok' || !r.data) throw new Error(r.error ?? 'Google Ads indisponível')
    return r.data.spend
  },
  ['pedidos-google-spend-v1'],
  { revalidate: 300 },
)

// Gasto por dia (Meta: soma das contas; Google: conta única), base do CPA do dia.
const cachedMetaDailySpend = unstable_cache(
  async (accountId: string, since: string, until: string) => getMetaAccountDailySpend(accountId, since, until),
  ['pedidos-meta-daily-spend-v1'],
  { revalidate: 300 },
)
const cachedGoogleDailySpend = unstable_cache(
  async (since: string, until: string) => {
    const r = await getGoogleAdsDailySpend(since, until)
    if (r.status === 'not_configured') return [] as { date: string; spend: number }[]
    if (r.status !== 'ok' || !r.data) throw new Error(r.error ?? 'Google Ads indisponível')
    return r.data.map(d => ({ date: d.date, spend: d.spend }))
  },
  ['pedidos-google-daily-spend-v1'],
  { revalidate: 300 },
)

export interface PedidosPageData {
  pedidos:        PedidosLucroData
  failedAccounts: string[]
}

export async function getPedidosPageData(db: SupabaseClient, range: DateRange): Promise<PedidosPageData> {
  const accounts = META_ACCOUNTS.filter(a => a.id)
  const failedAccounts: string[] = []
  const [perAccount, cross, googleSpend, metaDaily, googleDaily] = await Promise.all([
    Promise.all(accounts.map(a => cachedAccountCampaignSpend(a.id, range.start, range.endExclusive)
      .then(list => list.map(c => ({ ...c, account: a.name })))
      .catch(err => {
        console.error(`[pedidos] leitura da Meta falhou (${a.name}):`, err)
        failedAccounts.push(a.name)
        return []
      }))),
    getMetaUtmCross(db, range),
    cachedGoogleSpend(range.start, range.endExclusive).catch(() => null),
    // Uma conta falhando no diário derruba o diário inteiro (null): melhor cair
    // pro CPA do período, declarado na tela, do que somar um dia sem uma conta.
    Promise.all(accounts.map(a => cachedMetaDailySpend(a.id, range.start, range.endExclusive)))
      .then(lists => {
        const m = new Map<string, number>()
        for (const l of lists) for (const d of l) m.set(d.date, (m.get(d.date) ?? 0) + d.spend)
        return m
      })
      .catch(err => { console.error('[pedidos] gasto diário da Meta falhou:', err); return null }),
    cachedGoogleDailySpend(range.start, range.endExclusive)
      .then(l => new Map(l.map(d => [d.date, d.spend])))
      .catch(() => null),
  ])
  const pedidos = await getPedidosLucro(range, perAccount.flat(), cross, googleSpend, { meta: metaDaily, google: googleDaily })
  return { pedidos, failedAccounts }
}
