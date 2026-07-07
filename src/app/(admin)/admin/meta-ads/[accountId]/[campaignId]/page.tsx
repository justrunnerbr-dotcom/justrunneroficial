import Link from 'next/link'
import { ArrowLeft, Play, Pause, Archive, TrendingUp } from 'lucide-react'
import { getMetaCampaignAdsets } from '@/lib/admin/meta-ads'
import { getDateRangeFromSearchParams } from '@/lib/admin/date-range'
import { AiAnalysisPanel } from '../../_components/ai-analysis-panel'
import { ClickableRow }    from '../../_components/clickable-row'

const ACCOUNT_NAMES: Record<string, string> = {
  '854900492694029':  'Conta 1',
  '1540670043430836': 'Conta 3',
  '1326224171373480': 'Conta 4',
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string, string]> = {
    ACTIVE:   ['Ativo',   '#16a34a', 'rgba(22,163,74,0.1)'],
    PAUSED:   ['Pausado', '#f59e0b', 'rgba(245,158,11,0.1)'],
    ARCHIVED: ['Arquivo', '#6b7280', 'rgba(107,114,128,0.1)'],
    DELETED:  ['Deletado','#ef4444', 'rgba(239,68,68,0.1)'],
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
  const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const color  = cpm <= 0 ? 'var(--admin-text-muted)' : cpm < 15 ? '#16a34a' : cpm < 25 ? '#f59e0b' : '#ef4444'
  return <span style={{ color, fontWeight: 600, fontFamily: 'monospace' }}>{cpm > 0 ? fmtBrl.format(cpm) : '—'}</span>
}

function FreqCell({ freq }: { freq: number }) {
  const color = freq <= 0 ? 'var(--admin-text-muted)' : freq < 2.5 ? 'var(--admin-text-sec)' : freq < 3.5 ? '#f59e0b' : '#ef4444'
  return <span style={{ color, fontWeight: freq >= 3.5 ? 700 : 400 }}>{freq > 0 ? `${freq.toFixed(2)}${freq >= 3.5 ? ' ⚠' : ''}` : '—'}</span>
}

function RateCell({ value, goodAbove, warnAbove }: { value: number; goodAbove: number; warnAbove: number }) {
  const color = value <= 0 ? 'var(--admin-text-muted)' : value >= goodAbove ? '#16a34a' : value >= warnAbove ? '#f59e0b' : '#ef4444'
  return <span style={{ color, fontWeight: 600, fontFamily: 'monospace' }}>{value > 0 ? `${value.toFixed(1)}%` : '—'}</span>
}

const RANKING_LABELS: Record<string, [string, string, string]> = {
  ABOVE_AVERAGE:    ['Acima da média', '#16a34a', 'rgba(22,163,74,0.1)'],
  AVERAGE:          ['Na média',       '#f59e0b', 'rgba(245,158,11,0.1)'],
  BELOW_AVERAGE_35: ['Abaixo (35%)',   '#ef4444', 'rgba(239,68,68,0.1)'],
  BELOW_AVERAGE_20: ['Abaixo (20%)',   '#ef4444', 'rgba(239,68,68,0.1)'],
  BELOW_AVERAGE_10: ['Abaixo (10%)',   '#ef4444', 'rgba(239,68,68,0.1)'],
  UNKNOWN:          ['Sem dados',      'var(--admin-text-muted)', 'var(--admin-bg)'],
}

function RankingBadge({ ranking }: { ranking: string }) {
  const [label, color, bg] = RANKING_LABELS[ranking] ?? RANKING_LABELS.UNKNOWN
  return <span style={{ fontSize: '10px', fontWeight: 700, color, background: bg, padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{label}</span>
}

function FunnelBar({ label, value, maxValue, sub }: { label: string; value: number; maxValue: number; sub?: string }) {
  const pct = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 2 : 0) : 0
  const fmtInt = (n: number) => n.toLocaleString('pt-BR')
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '12px', marginBottom: '5px' }}>
        <span style={{ color: 'var(--admin-text-sec)', fontWeight: 600 }}>{label}</span>
        <span style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
          {sub && <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{sub}</span>}
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--admin-text-main)' }}>{fmtInt(value)}</span>
        </span>
      </div>
      <div style={{ height: '18px', background: 'var(--admin-bg)', borderRadius: '5px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--admin-accent)', borderRadius: '5px', transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

export default async function CampaignAdsetsPage({
  params,
  searchParams,
}: {
  params:       Promise<{ accountId: string; campaignId: string }>
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const { accountId, campaignId } = await params
  const sp      = await searchParams
  const range   = getDateRangeFromSearchParams(sp)
  const accName = ACCOUNT_NAMES[accountId] ?? `Conta ${accountId}`

  const adsets = await getMetaCampaignAdsets(accountId, campaignId, range.start, range.endExclusive)

  const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtInt = (n: number) => n.toLocaleString('pt-BR')
  const fmtPct = (n: number) => n > 0 ? `${n.toFixed(2)}%` : '—'

  const campaignName = adsets[0] ? `Campanha ${campaignId}` : `Campanha ${campaignId}`
  const totalSpend   = adsets.reduce((s, a) => s + a.spend, 0)
  const totalImp     = adsets.reduce((s, a) => s + a.impressions, 0)
  const totalClicks  = adsets.reduce((s, a) => s + a.clicks, 0)
  const totalResults = adsets.reduce((s, a) => s + a.results, 0)
  const avgCpm       = totalImp > 0 ? (totalSpend / totalImp) * 1000 : 0
  const avgCtr       = totalImp > 0 ? (totalClicks / totalImp) * 100 : 0

  // Funil de conversão agregado — soma bruta das 5 etapas do e-commerce em todos os conjuntos
  const totalViewContent      = adsets.reduce((s, a) => s + a.funnel.viewContent, 0)
  const totalAddToCart        = adsets.reduce((s, a) => s + a.funnel.addToCart, 0)
  const totalInitiateCheckout = adsets.reduce((s, a) => s + a.funnel.initiateCheckout, 0)
  const totalAddPaymentInfo   = adsets.reduce((s, a) => s + a.funnel.addPaymentInfo, 0)
  const totalVideoPlays       = adsets.reduce((s, a) => s + a.video.videoPlays, 0)
  const totalThruPlays        = adsets.reduce((s, a) => s + a.video.videoThruPlays, 0)
  const avgHookRate           = totalImp > 0 ? (totalVideoPlays / totalImp) * 100 : 0
  const avgHoldRate           = totalVideoPlays > 0 ? (totalThruPlays / totalVideoPlays) * 100 : 0

  const campaignMetrics = {
    spend: totalSpend, impressions: totalImp, clicks: totalClicks,
    reach: adsets.reduce((s, a) => s + a.reach, 0),
    ctr: avgCtr, cpm: avgCpm, cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    frequency: adsets.length > 0 ? adsets.reduce((s, a) => s + a.frequency, 0) / adsets.length : 0,
    results: totalResults, costPerResult: totalResults > 0 ? totalSpend / totalResults : 0,
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
        <Link href="/admin/meta-ads" style={{ color: 'var(--admin-accent)', textDecoration: 'none' }}>Meta Ads</Link>
        <span>›</span>
        <Link href={`/admin/meta-ads/${accountId}`} style={{ color: 'var(--admin-accent)', textDecoration: 'none' }}>{accName}</Link>
        <span>›</span>
        <span>Campanha</span>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Link href={`/admin/meta-ads/${accountId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--admin-accent)', textDecoration: 'none', fontSize: '13px', marginBottom: '8px' }}>
          <ArrowLeft size={13} /> {accName}
        </Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px', fontFamily: 'monospace' }}>
          {campaignId}
        </h1>
        <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
          {adsets.length} conjunto(s) · {range.label} · {accName}
        </div>
      </div>

      {/* Totals */}
      {totalSpend > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            ['Total Gasto',  fmtBrl.format(totalSpend)],
            ['Impressões',   fmtInt(totalImp)],
            ['Cliques',      fmtInt(totalClicks)],
            ['CTR médio',    fmtPct(avgCtr)],
            ['Conversões',   totalResults > 0 ? totalResults.toFixed(0) : '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '5px' }}>{label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Funil de Conversão Completo */}
      {totalSpend > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '18px 20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '14px' }}>Funil de Conversão Completo</div>
            <FunnelBar label="Visualizou conteúdo (ViewContent)" value={totalViewContent} maxValue={totalViewContent} />
            <FunnelBar
              label="Adicionou ao carrinho (AddToCart)"
              value={totalAddToCart}
              maxValue={totalViewContent}
              sub={totalViewContent > 0 ? `${((totalAddToCart / totalViewContent) * 100).toFixed(1)}% do topo` : undefined}
            />
            <FunnelBar
              label="Iniciou checkout (InitiateCheckout)"
              value={totalInitiateCheckout}
              maxValue={totalViewContent}
              sub={totalAddToCart > 0 ? `${((totalInitiateCheckout / totalAddToCart) * 100).toFixed(1)}% do ATC` : undefined}
            />
            <FunnelBar
              label="Info. de pagamento (AddPaymentInfo)"
              value={totalAddPaymentInfo}
              maxValue={totalViewContent}
              sub={totalInitiateCheckout > 0 ? `${((totalAddPaymentInfo / totalInitiateCheckout) * 100).toFixed(1)}% do IC` : undefined}
            />
            <FunnelBar
              label="Compras (Purchase)"
              value={totalResults}
              maxValue={totalViewContent}
              sub={totalAddPaymentInfo > 0 ? `${((totalResults / totalAddPaymentInfo) * 100).toFixed(1)}% do API` : undefined}
            />
            {totalViewContent > 0 && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--admin-border)', fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                Conversão geral (ViewContent → Compra): <strong style={{ color: 'var(--admin-text-main)' }}>{((totalResults / totalViewContent) * 100).toFixed(2)}%</strong>
              </div>
            )}
          </div>

          <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '18px 20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '14px' }}>Vídeo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Hook Rate</div>
                <RateCell value={avgHookRate} goodAbove={28} warnAbove={20} />
                <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>reproduções 3s ÷ impressões</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Hold Rate</div>
                <RateCell value={avgHoldRate} goodAbove={25} warnAbove={15} />
                <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>ThruPlay ÷ reproduções 3s</div>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--admin-text-sec)', paddingTop: '10px', borderTop: '1px solid var(--admin-border)' }}>
              {fmtInt(totalVideoPlays)} reproduções (3s) · {fmtInt(totalThruPlays)} ThruPlays
            </div>
          </div>
        </div>
      )}

      {/* Ad Sets Table */}
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Conjuntos de Anúncios</div>
          <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>Clique em um conjunto para ver os criativos</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                {['Conjunto', 'Status', 'Orçamento/dia', 'Gasto', 'Impressões', 'Cliques', 'CTR', 'CPM', 'CPC', 'Frequência', 'Alcance', 'Conversões', 'Custo/Conv', 'Hook Rate', 'Hold Rate', 'Qualidade'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '10px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adsets.map(a => (
                <ClickableRow key={a.id} href={`/admin/meta-ads/${accountId}/${campaignId}/${a.id}`}>
                  <td style={{ padding: '12px 14px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--admin-accent)' }} title={a.name}>{a.name}</span>
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}><StatusBadge status={a.status} /></td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{a.dailyBudget > 0 ? fmtBrl.format(a.dailyBudget) : '—'}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--admin-text-main)', whiteSpace: 'nowrap' }}>{a.spend > 0 ? fmtBrl.format(a.spend) : '—'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{a.impressions > 0 ? fmtInt(a.impressions) : '—'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{a.clicks > 0 ? fmtInt(a.clicks) : '—'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtPct(a.ctr)}</td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}><CpmCell cpm={a.cpm} /></td>
                  <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{a.cpc > 0 ? fmtBrl.format(a.cpc) : '—'}</td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}><FreqCell freq={a.frequency} /></td>
                  <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{a.reach > 0 ? fmtInt(a.reach) : '—'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', textAlign: 'center' }}>{a.results > 0 ? a.results.toFixed(0) : '—'}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', whiteSpace: 'nowrap', color: 'var(--admin-text-sec)' }}>{a.costPerResult > 0 ? fmtBrl.format(a.costPerResult) : '—'}</td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}><RateCell value={a.video.hookRate} goodAbove={28} warnAbove={20} /></td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}><RateCell value={a.video.holdRate} goodAbove={25} warnAbove={15} /></td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}><RankingBadge ranking={a.diagnostics.qualityRanking} /></td>
                </ClickableRow>
              ))}
              {adsets.length === 0 && (
                <tr><td colSpan={16} style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                  <TrendingUp size={28} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                  Nenhum conjunto de anúncios com dados no período.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AiAnalysisPanel
        level="campaign"
        entityName={campaignName}
        metrics={campaignMetrics}
        since={range.start}
        until={range.endExclusive}
        accountId={accountId}
      />
    </div>
  )
}
