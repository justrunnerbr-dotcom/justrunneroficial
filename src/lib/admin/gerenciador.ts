import type { SupabaseClient } from '@supabase/supabase-js'
import type { DateRange } from '@/lib/admin/date-range'
import {
  META_ACCOUNTS,
  getMetaAccountCampaigns,
  getMetaAccountAdsets,
  getMetaAccountAds,
  getMetaCrossDataByField,
  type MetaCrossResult,
} from '@/lib/admin/meta-ads'

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
