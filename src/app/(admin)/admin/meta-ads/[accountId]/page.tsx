import Link from 'next/link'
import { ArrowLeft, Play, Pause, Archive, TrendingUp } from 'lucide-react'
import { getMetaAccountCampaigns } from '@/lib/admin/meta-ads'
import { getDateRangeFromSearchParams } from '@/lib/admin/date-range'
import { AiAnalysisPanel }     from '../_components/ai-analysis-panel'
import { ClickableRow }        from '../_components/clickable-row'
import { MetricsCustomizer, type MetricValues } from '../_components/metrics-customizer'

const ACCOUNT_NAMES: Record<string, string> = {
  '854900492694029':  'Conta 1',
  '1540670043430836': 'Conta 3',
  '1326224171373480': 'Conta 4',
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string, string]> = {
    ACTIVE:   ['Ativo',    '#16a34a', 'rgba(22,163,74,0.1)'],
    PAUSED:   ['Pausado',  '#f59e0b', 'rgba(245,158,11,0.1)'],
    ARCHIVED: ['Arquivo',  '#6b7280', 'rgba(107,114,128,0.1)'],
    DELETED:  ['Deletado', '#ef4444', 'rgba(239,68,68,0.1)'],
  }
  const [label, color, bg] = map[status] ?? ['—', '#6b7280', 'rgba(107,114,128,0.1)']
  const IconC = status === 'ACTIVE' ? Play : status === 'PAUSED' ? Pause : Archive
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color, background: bg, padding: '3px 8px', borderRadius: '20px' }}>
      <IconC size={10} /> {label}
    </span>
  )
}

function CpmCell({ cpm }: { cpm: number }) {
  const color = cpm <= 0 ? 'var(--admin-text-muted)' : cpm < 15 ? '#16a34a' : cpm < 25 ? '#f59e0b' : '#ef4444'
  const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  return <span style={{ color, fontWeight: 600, fontFamily: 'monospace' }}>{cpm > 0 ? fmtBrl.format(cpm) : '—'}</span>
}

function FreqCell({ freq }: { freq: number }) {
  const color = freq <= 0 ? 'var(--admin-text-muted)' : freq < 2.5 ? 'var(--admin-text-sec)' : freq < 3.5 ? '#f59e0b' : '#ef4444'
  return (
    <span style={{ color, fontWeight: freq >= 3.5 ? 700 : 400 }}>
      {freq > 0 ? freq.toFixed(2) : '—'}
      {freq >= 3.5 && ' ⚠'}
    </span>
  )
}

export default async function AccountCampaignsPage({
  params,
  searchParams,
}: {
  params:       Promise<{ accountId: string }>
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const { accountId } = await params
  const sp     = await searchParams
  const range  = getDateRangeFromSearchParams(sp)
  const name   = ACCOUNT_NAMES[accountId] ?? `Conta ${accountId}`

  const campaigns = await getMetaAccountCampaigns(accountId, range.start, range.endExclusive)

  const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtInt = (n: number) => n.toLocaleString('pt-BR')
  const fmtPct = (n: number) => n > 0 ? `${n.toFixed(2)}%` : '—'
  const fmtX   = (n: number) => n > 0 ? `${n.toFixed(2)}×` : '—'
  const sum    = (key: keyof typeof campaigns[0]) => campaigns.reduce((s, c) => s + (c[key] as number), 0)

  const totalSpend   = sum('spend')
  const totalImp     = sum('impressions')
  const totalClicks  = sum('clicks')
  const totalILC     = sum('inlineLinkClicks')
  const totalUniqueC = sum('uniqueClicks')
  const totalReach   = sum('reach')
  const totalResults = sum('results')
  const totalVPlays  = sum('videoPlays')
  const totalThru    = sum('videoThruPlays')
  const totalEngage  = sum('engagements')
  const avgFreq      = campaigns.length > 0 ? sum('frequency') / campaigns.filter(c => c.frequency > 0).length || 0 : 0
  const avgCpm       = totalImp > 0 ? (totalSpend / totalImp) * 1000 : 0
  const avgCtr       = totalImp > 0 ? (totalClicks / totalImp) * 100 : 0
  const avgUniqueCtr = totalReach > 0 ? (totalUniqueC / totalReach) * 100 : 0
  const cpc          = totalClicks > 0 ? totalSpend / totalClicks : 0
  const uniqueCpc    = totalUniqueC > 0 ? totalSpend / totalUniqueC : 0
  const costPerRes   = totalResults > 0 ? totalSpend / totalResults : 0
  const costThru     = totalThru > 0 ? totalSpend / totalThru : 0
  const periodDays   = Math.max(1, Math.ceil((new Date(range.endExclusive).getTime() - new Date(range.start).getTime()) / 86400000))
  const activeCamps  = campaigns.filter(c => c.status === 'ACTIVE').length

  const metricValues: MetricValues = {
    spend:            totalSpend,
    impressions:      totalImp,
    reach:            totalReach,
    frequency:        avgFreq,
    clicks:           totalClicks,
    inlineLinkClicks: totalILC,
    uniqueClicks:     totalUniqueC,
    ctr:              avgCtr,
    uniqueCtr:        avgUniqueCtr,
    cpm:              avgCpm,
    cpc,
    uniqueCpc,
    results:          totalResults,
    costPerResult:    costPerRes,
    videoPlays:       totalVPlays,
    videoThruPlays:   totalThru,
    costPerThruPlay:  costThru,
    engagements:      totalEngage,
    dailyAvg:         periodDays > 0 ? totalSpend / periodDays : 0,
    activeCampaigns:  activeCamps,
  }

  // Metrics for AI analysis
  const accountMetrics = {
    spend: totalSpend, impressions: totalImp, clicks: totalClicks,
    reach: totalReach, ctr: avgCtr, cpm: avgCpm, cpc,
    frequency: avgFreq, results: totalResults, costPerResult: costPerRes,
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px' }}>

      {/* Breadcrumb + Header */}
      <div style={{ marginBottom: '20px' }}>
        <Link href="/admin/meta-ads" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--admin-accent)', textDecoration: 'none', fontSize: '13px', marginBottom: '12px' }}>
          <ArrowLeft size={13} /> Meta Ads
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>{name}</h1>
            <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>
              {campaigns.length} campanha(s) · {range.label} ·{' '}
              <span style={{ fontFamily: 'monospace' }}>{accountId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas personalizadas */}
      {totalSpend > 0 && <MetricsCustomizer values={metricValues} />}

      {/* Campaigns Table */}
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Campanhas</div>
          <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>Clique em uma campanha para ver os conjuntos de anúncios</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                {['Campanha', 'Status', 'Objetivo', 'Gasto', 'Impressões', 'Cliques', 'CTR', 'CPM', 'CPC', 'Frequência', 'Alcance', 'Conversões', 'Custo/Conv'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '10px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <ClickableRow key={c.id} href={`/admin/meta-ads/${accountId}/${c.id}`}>
                  <td style={{ padding: '12px 14px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--admin-accent)' }} title={c.name}>{c.name}</span>
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}><StatusBadge status={c.status} /></td>
                  <td style={{ padding: '12px 14px', color: 'var(--admin-text-muted)', fontSize: '11px', whiteSpace: 'nowrap' }}>{c.objective || '—'}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--admin-text-main)', whiteSpace: 'nowrap' }}>{c.spend > 0 ? fmtBrl.format(c.spend) : '—'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{c.impressions > 0 ? fmtInt(c.impressions) : '—'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{c.clicks > 0 ? fmtInt(c.clicks) : '—'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtPct(c.ctr)}</td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}><CpmCell cpm={c.cpm} /></td>
                  <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{c.cpc > 0 ? fmtBrl.format(c.cpc) : '—'}</td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}><FreqCell freq={c.frequency} /></td>
                  <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{c.reach > 0 ? fmtInt(c.reach) : '—'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', textAlign: 'center' }}>{c.results > 0 ? c.results.toFixed(0) : '—'}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', whiteSpace: 'nowrap', color: 'var(--admin-text-sec)' }}>{c.costPerResult > 0 ? fmtBrl.format(c.costPerResult) : '—'}</td>
                </ClickableRow>
              ))}
              {campaigns.length === 0 && (
                <tr><td colSpan={13} style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                  <TrendingUp size={28} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                  Nenhuma campanha com dados no período.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Panel */}
      <AiAnalysisPanel
        level="account"
        entityName={name}
        metrics={accountMetrics}
        since={range.start}
        until={range.endExclusive}
        accountId={accountId}
      />
    </div>
  )
}
