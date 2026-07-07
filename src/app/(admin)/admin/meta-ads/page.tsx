import { getAdminSupabase } from '@/lib/admin-client'
import { CheckCircle, XCircle, ExternalLink, AlertTriangle, Wifi, TrendingUp, TrendingDown, BarChart2, Zap, Minus } from 'lucide-react'
import { META_PIXEL_ID } from '@/lib/meta'
import { CopyButton } from './copy-button'
import { MetaSyncButton } from './_components/meta-sync-button'
import { getMetaPageData, isMetaConfigured, getMetaLiveSpend, getMetaLiveCampaigns } from '@/lib/admin/meta-ads'
import { getDateRangeFromSearchParams, type DateRange } from '@/lib/admin/date-range'

const DIAG_STYLE: Record<string, { color: string; bg: string }> = {
  'Gastando sem venda':   { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  'CTR bom, sem ATC':     { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  'ROAS Meta > Real':     { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  'Sessões sem intenção': { color: '#ca8a04', bg: 'rgba(202,138,4,0.08)'  },
  'Candidata a escala':   { color: '#16a34a', bg: 'rgba(22,163,74,0.08)'  },
  'Boa performance':      { color: '#16a34a', bg: 'rgba(22,163,74,0.08)'  },
  'Normal':               { color: 'var(--admin-text-muted)', bg: 'var(--admin-bg)' },
  'Volume baixo':         { color: 'var(--admin-text-muted)', bg: 'var(--admin-bg)' },
}

async function getFeedStats() {
  try {
    const res   = await fetch('https://justhavefun.com.br/meta-feed.xml', { next: { revalidate: 300 } })
    if (!res.ok) return { ok: false, items: 0 }
    const text  = await res.text()
    return { ok: true, items: (text.match(/<item>/g) ?? []).length }
  } catch { return { ok: false, items: 0 } }
}

async function getSKUCount() {
  const db = getAdminSupabase()
  const { count } = await db.from('variants').select('*', { count: 'exact', head: true }).gt('price', 0)
  return count ?? 0
}

function Row({ label, value, ok, note }: { label: string; value: string; ok: boolean; note?: string }) {
  return (
    <div style={{ padding: '14px 0', borderTop: '1px solid var(--admin-border)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      {ok ? <CheckCircle size={16} color="#22c55e" style={{ marginTop: '1px', flexShrink: 0 }} />
           : <XCircle   size={16} color="#ef4444" style={{ marginTop: '1px', flexShrink: 0 }} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--admin-text-sec)' }}>{label}</div>
        <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>{value}</div>
        {note && <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '3px' }}>{note}</div>}
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, highlight, warn }: { label: string; value: string; sub?: string; highlight?: boolean; warn?: boolean }) {
  const color  = highlight ? 'var(--admin-accent)' : warn ? '#ef4444' : 'var(--admin-text-main)'
  const border = highlight ? 'rgba(var(--admin-accent-rgb),0.35)' : warn ? 'rgba(239,68,68,0.25)' : 'var(--admin-border)'
  return (
    <div style={{ background: 'var(--admin-card)', border: `1px solid ${border}`, borderRadius: '12px', padding: '14px 16px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

function DeltaBadge({ current, prev }: { current: number; prev: number }) {
  if (prev === 0) return null
  const pct   = ((current - prev) / prev) * 100
  const up    = pct >= 0
  const color = up ? '#16a34a' : '#ef4444'
  const bg    = up ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)'
  const Icon  = up ? TrendingUp : TrendingDown
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, color, background: bg, padding: '3px 8px', borderRadius: '20px' }}>
      <Icon size={11} /> {up ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function EfficiencyBadge({ cpm }: { cpm: number }) {
  if (cpm <= 0) return null
  const [label, color, bg] =
    cpm < 15 ? ['Eficiente', '#16a34a', 'rgba(22,163,74,0.1)'] :
    cpm < 25 ? ['Atenção',   '#f59e0b', 'rgba(245,158,11,0.1)'] :
               ['Alto CPM',  '#ef4444', 'rgba(239,68,68,0.1)']
  const dot = cpm < 15 ? '🟢' : cpm < 25 ? '🟡' : '🔴'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color, background: bg, padding: '3px 10px', borderRadius: '20px' }}>
      {dot} {label}
    </span>
  )
}

export default async function MetaAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const sp              = await searchParams
  const range: DateRange = getDateRangeFromSearchParams(sp)
  const db              = getAdminSupabase()
  const configured      = isMetaConfigured()

  const [feedStats, skuCount, metaData, liveSpend, liveCampaigns] = await Promise.all([
    getFeedStats(),
    getSKUCount(),
    configured ? getMetaPageData(db, range) : Promise.resolve(null),
    configured ? getMetaLiveSpend(range.start, range.endExclusive) : Promise.resolve(null),
    configured ? getMetaLiveCampaigns(range.start, range.endExclusive) : Promise.resolve([]),
  ])

  const feedUrl  = 'https://justhavefun.com.br/meta-feed.xml'
  const pixelId  = META_PIXEL_ID
  const fmtBrl   = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtInt   = (n: number) => n.toLocaleString('pt-BR')
  const fmtPct   = (n: number) => `${n.toFixed(2)}%`
  const fmtX     = (n: number) => `${n.toFixed(2)}×`
  const hasData  = metaData?.hasData ?? false

  const totalSpend     = liveSpend?.total.spend ?? 0
  const totalPrevSpend = liveSpend?.totalPrev.spend ?? 0
  const periodDays     = liveSpend?.periodDays ?? 1
  const totalImp       = liveSpend?.total.impressions ?? 0
  const totalClicks    = liveSpend?.total.clicks ?? 0
  const avgCtr         = totalImp > 0 ? (totalClicks / totalImp) * 100 : 0
  const avgCpm         = totalImp > 0 ? (totalSpend / totalImp) * 1000 : 0

  const accountStats = liveSpend?.accounts.map(acc => {
    const cpm = acc.period.impressions > 0 ? (acc.period.spend / acc.period.impressions) * 1000 : 0
    const ctr = acc.period.impressions > 0 ? (acc.period.clicks / acc.period.impressions) * 100 : 0
    const cpc = acc.period.clicks > 0 ? acc.period.spend / acc.period.clicks : 0
    return { ...acc, cpm, ctr, cpc }
  }) ?? []

  const acctColors = ['var(--admin-accent)', '#8b5cf6', '#f59e0b']

  // Insight leaders
  const activeAccts     = accountStats.filter(a => a.period.spend > 0)
  const leaderVolume    = activeAccts.length ? activeAccts.reduce((b, a) => a.period.spend > b.period.spend ? a : b, activeAccts[0]) : null
  const leaderCtr       = activeAccts.filter(a => a.period.impressions > 500).length
    ? activeAccts.filter(a => a.period.impressions > 500).reduce((b, a) => a.ctr > b.ctr ? a : b, activeAccts[0]) : null
  const leaderCpm       = activeAccts.filter(a => a.cpm > 0).length
    ? activeAccts.filter(a => a.cpm > 0).reduce((b, a) => a.cpm < b.cpm ? a : b, activeAccts.filter(a => a.cpm > 0)[0]) : null
  const leaderCpc       = activeAccts.filter(a => a.cpc > 0).length
    ? activeAccts.filter(a => a.cpc > 0).reduce((b, a) => a.cpc < b.cpc ? a : b, activeAccts.filter(a => a.cpc > 0)[0]) : null

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      <style>{`.meta-account-card:hover { border-color: var(--admin-accent) !important; box-shadow: 0 0 0 1px var(--admin-accent) !important; }`}</style>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Meta Ads</h1>
          <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>
            Investimento e performance · {range.label}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '20px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)' }}>
            <Wifi size={13} /> 3 contas · LIVE
          </div>
          <MetaSyncButton lastSync={metaData?.lastSync ?? null} configured={configured} />
        </div>
      </div>

      {liveSpend && (
        <>
          {/* ── Hero card — Total Investido ─────────────────────────── */}
          <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '28px 32px', marginBottom: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <BarChart2 size={16} color="var(--admin-accent)" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total Investido</span>
              <span style={{ marginLeft: 'auto' }}>
                <DeltaBadge current={totalSpend} prev={totalPrevSpend} />
              </span>
            </div>

            <div style={{ fontSize: '44px', fontWeight: 800, color: 'var(--admin-text-main)', fontFamily: 'monospace', lineHeight: 1, marginBottom: '6px' }}>
              {fmtBrl.format(totalSpend)}
            </div>
            {totalPrevSpend > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '14px' }}>
                vs período ant. {fmtBrl.format(totalPrevSpend)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', marginTop: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>Impressões</div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{fmtInt(totalImp)}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>Cliques</div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{fmtInt(totalClicks)}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>CTR médio</div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{fmtPct(avgCtr)}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>CPM médio</div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{fmtBrl.format(avgCpm)}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>Período</div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{periodDays}d</div>
              </div>
            </div>
          </div>

          {/* ── Account cards ──────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
            {accountStats.map((acc, i) => {
              const share = totalSpend > 0 ? (acc.period.spend / totalSpend) * 100 : 0
              const color = acctColors[i] ?? 'var(--admin-accent)'
              return (
                <a key={acc.id} href={`/admin/meta-ads/${acc.id}`} className="meta-account-card" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', textDecoration: 'none', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}>

                  {/* Name row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)', flex: 1 }}>{acc.name}</span>
                    {(acc.activeCampaigns > 0 || acc.pausedCampaigns > 0) && (
                      <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                        {acc.activeCampaigns} ativas · {acc.pausedCampaigns} pausadas
                      </span>
                    )}
                  </div>

                  {/* Spend */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{fmtBrl.format(acc.period.spend)}</span>
                    <DeltaBadge current={acc.period.spend} prev={acc.prevPeriod.spend} />
                  </div>

                  {/* Share bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>
                      <span>{share.toFixed(1)}% do total</span>
                      <span>média/dia: {fmtBrl.format(acc.dailyAvg)}</span>
                    </div>
                    <div style={{ height: '5px', background: 'var(--admin-border)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${share}%`, background: color, borderRadius: '99px' }} />
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    <div style={{ background: 'var(--admin-bg)', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>CTR</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{fmtPct(acc.ctr)}</div>
                    </div>
                    <div style={{ background: 'var(--admin-bg)', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>CPM</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{fmtBrl.format(acc.cpm)}</div>
                    </div>
                    <div style={{ background: 'var(--admin-bg)', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>CPC</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{fmtBrl.format(acc.cpc)}</div>
                    </div>
                    <div style={{ background: 'var(--admin-bg)', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>Alcance</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{fmtInt(acc.period.reach)}</div>
                    </div>
                  </div>

                  {/* Efficiency badge + link hint */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <EfficiencyBadge cpm={acc.cpm} />
                    <span style={{ fontSize: '11px', color: 'var(--admin-accent)', fontWeight: 600 }}>Ver campanhas →</span>
                  </div>
                </a>
              )
            })}
          </div>

          {/* ── Insights row ─────────────────────────────────────────── */}
          {activeAccts.length > 0 && (
            <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', gridColumn: '1 / -1', marginBottom: '4px' }}>
                <Zap size={14} color="var(--admin-accent)" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-main)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Destaques do período</span>
              </div>

              {leaderVolume && (
                <div style={{ background: 'var(--admin-bg)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '6px' }}>Maior volume</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--admin-accent)' }}>{leaderVolume.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{fmtBrl.format(leaderVolume.period.spend)}</div>
                </div>
              )}

              {leaderCtr && (
                <div style={{ background: 'var(--admin-bg)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '6px' }}>Melhor CTR</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#16a34a' }}>{leaderCtr.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{fmtPct(leaderCtr.ctr)}</div>
                </div>
              )}

              {leaderCpm && (
                <div style={{ background: 'var(--admin-bg)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '6px' }}>CPM mais baixo</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#8b5cf6' }}>{leaderCpm.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{fmtBrl.format(leaderCpm.cpm)}</div>
                </div>
              )}

              {leaderCpc && (
                <div style={{ background: 'var(--admin-bg)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '6px' }}>CPC mais baixo</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#f59e0b' }}>{leaderCpc.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{fmtBrl.format(leaderCpc.cpc)}</div>
                </div>
              )}
            </div>
          )}

          {/* ── Campanhas ao vivo ──────────────────────────────────────── */}
          {liveCampaigns.length > 0 && (
            <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Campanhas ao vivo</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{liveCampaigns.length} campanha(s) · ordenadas por gasto · {range.label}</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', background: 'rgba(34,197,94,0.1)', padding: '3px 10px', borderRadius: '20px' }}>LIVE</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                      {['Conta', 'Campanha', 'Gasto', 'Impressões', 'Cliques', 'CTR', 'CPM', 'CPC', 'Alcance'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '10px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {liveCampaigns.map((c, idx) => {
                      const acctIdx = accountStats.findIndex(a => a.id === c.accountId)
                      const acctColor = acctColors[acctIdx] ?? 'var(--admin-accent)'
                      return (
                        <tr key={`${c.accountId}-${c.id}-${idx}`} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: acctColor }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: acctColor, display: 'inline-block' }} />
                              {c.accountName}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--admin-text-main)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.name}>{c.name}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--admin-text-main)' }}>{fmtBrl.format(c.spend)}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtInt(c.impressions)}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtInt(c.clicks)}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtPct(c.ctr)}</td>
                          <td style={{ padding: '10px 12px', color: c.cpm < 15 ? '#16a34a' : c.cpm < 25 ? '#f59e0b' : '#ef4444', fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtBrl.format(c.cpm)}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtBrl.format(c.cpc)}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtInt(c.reach)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── KPIs + Campanhas (dados sincronizados) ──────────────────── */}
      {configured && !hasData && (
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '40px', marginBottom: '24px', textAlign: 'center' }}>
          <TrendingUp size={32} color="var(--admin-accent)" style={{ margin: '0 auto 16px', display: 'block' }} />
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '6px' }}>Dados de campanha não sincronizados</div>
          <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', lineHeight: 1.6 }}>
            Os dados de investimento acima são em tempo real. Para ver campanhas, ROAS e análise de funil — clique em &quot;Sincronizar agora&quot;.
          </div>
        </div>
      )}

      {configured && hasData && metaData && (
        <>
          {/* KPI Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '10px' }}>
            <KpiCard label="Gasto (sync)"    value={fmtBrl.format(metaData.totalSpend)} />
            <KpiCard label="Impressões"      value={fmtInt(metaData.totalImpressions)} />
            <KpiCard label="Cliques"         value={fmtInt(metaData.totalClicks)} />
            <KpiCard label="CTR médio"       value={fmtPct(metaData.avgCtr)} />
            <KpiCard label="Compras Meta"    value={fmtInt(metaData.totalMetaPurchases)} />
            <KpiCard label="ROAS Meta"       value={fmtX(metaData.metaRoas)} highlight={metaData.metaRoas > 2} warn={metaData.metaRoas < 1 && metaData.totalSpend > 50} />
          </div>

          {/* KPI Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '12px' }}>
            <KpiCard label="Sessões Meta"   value={fmtInt(metaData.totalMetaSessions)} sub="utm_source=fb/ig" />
            <KpiCard label="Add to Cart"    value={fmtInt(metaData.totalMetaAtc)} />
            <KpiCard label="Checkout"       value={fmtInt(metaData.totalMetaCheckout)} />
            <KpiCard label="Pedidos Reais"  value={fmtInt(metaData.totalMetaOrders)} />
            <KpiCard label="Receita Real"   value={fmtBrl.format(metaData.totalMetaRevenue)} />
            <KpiCard label="ROAS Real"      value={fmtX(metaData.realRoas)} highlight={metaData.realRoas > 2} warn={metaData.realRoas < 1 && metaData.totalSpend > 50} />
          </div>

          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '20px', padding: '8px 12px', background: 'var(--admin-bg)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={11} />
            ROAS real estimado por sessões e pedidos com utm_source=facebook ou instagram. Divergências com Meta são normais.
          </div>

          {/* Campaign Table */}
          <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Campanhas sincronizadas — {range.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{metaData.campaigns.length} campanha(s) · ordenadas por gasto</div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                    {['Campanha', 'Gasto', 'Impressões', 'Cliques', 'CTR', 'CPC', 'Compras Meta', 'ROAS Meta', 'Sessões JHF', 'ATC', 'Pedidos', 'Receita Real', 'ROAS Real', 'Diagnóstico'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '10px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metaData.campaigns.map(c => {
                    const diag     = DIAG_STYLE[c.diagnosis] ?? DIAG_STYLE['Normal']
                    const roasColor = c.realRoas > 2 ? '#16a34a' : c.realRoas > 1 ? 'var(--admin-text-main)' : c.realRoas > 0 ? '#ef4444' : 'var(--admin-text-muted)'
                    const RoasIcon  = c.realRoas > 2 ? TrendingUp : c.realRoas > 0 && c.realRoas < 1 ? TrendingDown : Minus
                    return (
                      <tr key={c.campaignId} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--admin-text-main)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.campaignName}>{c.campaignName}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fmtBrl.format(c.spend)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtInt(c.impressions)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtInt(c.clicks)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtPct(c.ctr)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtBrl.format(c.cpc)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)', textAlign: 'center' }}>{c.metaPurchases}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtX(c.metaRoas)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)', textAlign: 'center' }}>{c.justSessions}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)', textAlign: 'center' }}>{c.justAtc}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)', textAlign: 'center' }}>{c.justOrders}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fmtBrl.format(c.justRevenue)}</td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: roasColor }}>
                            <RoasIcon size={12} /> {fmtX(c.realRoas)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', background: diag.bg, color: diag.color }}>{c.diagnosis}</span>
                        </td>
                      </tr>
                    )
                  })}
                  {metaData.campaigns.length === 0 && (
                    <tr><td colSpan={14} style={{ padding: '32px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Nenhuma campanha no período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Pixel & Feed ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Meta Pixel</h2>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#16a34a', background: 'rgba(34,197,94,0.1)', padding: '4px 10px', borderRadius: '20px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} /> Ativo
            </span>
          </div>
          <Row label="Pixel ID"         value={pixelId}                     ok={true} />
          <Row label="ViewContent"      value="content_ids = [variant.sku]" ok={true} note="Dispara em cada troca de variante" />
          <Row label="AddToCart"        value="content_ids = [variant.sku]" ok={true} note="Dispara ao adicionar ao carrinho" />
          <Row label="InitiateCheckout" value="content_ids = [variant.sku]" ok={true} note="Dispara ao ir para checkout" />
          <Row label="Purchase"         value="Via GTM / Yampi webhook"     ok={true} note="Configurar evento de conversão" />
          <Row label="content_type"     value="'product'"                   ok={true} note="Padrão correto para DPA" />
        </div>

        <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Feed XML</h2>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: feedStats.ok ? '#16a34a' : '#dc2626', background: feedStats.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: '20px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: feedStats.ok ? '#22c55e' : '#ef4444' }} />
              {feedStats.ok ? 'Online' : 'Offline'}
            </span>
          </div>
          <Row label="SKUs no feed"     value={`${feedStats.items} itens`}        ok={feedStats.ok} />
          <Row label="SKUs no Supabase" value={`${skuCount} variantes`}           ok={skuCount > 0} />
          <Row label="Domínio"          value="justhavefun.com.br"                ok={true} />
          <Row label="g:id"             value="variant.sku (JHF-DART_GOLD_VR28)" ok={true} />
          <Row label="Cache"            value="1h (ISR Vercel)"                  ok={true} />
          <a href={feedUrl} target="_blank" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--admin-accent)', textDecoration: 'none', marginTop: '16px', fontWeight: 500 }}>
            <ExternalLink size={13} /> Abrir feed XML
          </a>
        </div>
      </div>

      {/* Pixel ↔ Catálogo */}
      <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '16px' }}>Correspondência Pixel ↔ Catálogo</h2>
        <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <CheckCircle size={16} color="#16a34a" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#15803d' }}>100% Alinhado — Pronto para DPA</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'var(--admin-card)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '6px', fontWeight: 600 }}>PIXEL (ViewContent / AddToCart)</div>
              <code style={{ fontSize: '12px', color: 'var(--admin-accent)' }}>content_ids: [variant.sku]</code>
            </div>
            <div style={{ background: 'var(--admin-card)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '6px', fontWeight: 600 }}>CATÁLOGO META (feed XML)</div>
              <code style={{ fontSize: '12px', color: 'var(--admin-accent)' }}>&lt;g:id&gt;variant.sku&lt;/g:id&gt;</code>
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--admin-bg)', borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-sec)', marginBottom: '4px' }}>URL do Feed</div>
            <code style={{ fontSize: '13px', color: 'var(--admin-accent)' }}>{feedUrl}</code>
          </div>
          <CopyButton text={feedUrl} />
        </div>
      </div>

    </div>
  )
}
