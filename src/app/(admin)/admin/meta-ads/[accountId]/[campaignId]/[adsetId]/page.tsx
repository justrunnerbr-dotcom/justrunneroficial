import Link from 'next/link'
import { ArrowLeft, Play, Pause, PlayCircle, TrendingUp } from 'lucide-react'
import { getMetaAdsetAds } from '@/lib/admin/meta-ads'
import { getDateRangeFromSearchParams } from '@/lib/admin/date-range'
import { AiAnalysisPanel } from '../../../_components/ai-analysis-panel'

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
  const IconC = status === 'ACTIVE' ? Play : Pause
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color, background: bg, padding: '2px 7px', borderRadius: '20px' }}>
      <IconC size={9} /> {label}
    </span>
  )
}

function MetricBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: 1, minWidth: '70px' }}>
      <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: color ?? 'var(--admin-text-main)', fontFamily: 'monospace' }}>{value}</div>
    </div>
  )
}

function rateColor(value: number, goodAbove: number, warnAbove: number): string {
  return value <= 0 ? 'var(--admin-text-muted)' : value >= goodAbove ? '#16a34a' : value >= warnAbove ? '#f59e0b' : '#ef4444'
}

const RANKING_LABELS: Record<string, [string, string, string]> = {
  ABOVE_AVERAGE:    ['Qualidade: acima da média', '#16a34a', 'rgba(22,163,74,0.1)'],
  AVERAGE:          ['Qualidade: na média',       '#f59e0b', 'rgba(245,158,11,0.1)'],
  BELOW_AVERAGE_35: ['Qualidade: abaixo (35%)',   '#ef4444', 'rgba(239,68,68,0.1)'],
  BELOW_AVERAGE_20: ['Qualidade: abaixo (20%)',   '#ef4444', 'rgba(239,68,68,0.1)'],
  BELOW_AVERAGE_10: ['Qualidade: abaixo (10%)',   '#ef4444', 'rgba(239,68,68,0.1)'],
  UNKNOWN:          ['Qualidade: sem dados',      'var(--admin-text-muted)', 'var(--admin-bg)'],
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

export default async function AdsetAdsPage({
  params,
  searchParams,
}: {
  params:       Promise<{ accountId: string; campaignId: string; adsetId: string }>
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const { accountId, campaignId, adsetId } = await params
  const sp      = await searchParams
  const range   = getDateRangeFromSearchParams(sp)
  const accName = ACCOUNT_NAMES[accountId] ?? `Conta ${accountId}`

  const ads = await getMetaAdsetAds(accountId, adsetId, range.start, range.endExclusive)

  const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtInt = (n: number) => n.toLocaleString('pt-BR')
  const fmtPct = (n: number) => n > 0 ? `${n.toFixed(2)}%` : '—'

  const totalSpend   = ads.reduce((s, a) => s + a.spend, 0)
  const totalImp     = ads.reduce((s, a) => s + a.impressions, 0)
  const totalClicks  = ads.reduce((s, a) => s + a.clicks, 0)
  const totalResults = ads.reduce((s, a) => s + a.results, 0)
  const avgCpm       = totalImp > 0 ? (totalSpend / totalImp) * 1000 : 0
  const avgCtr       = totalImp > 0 ? (totalClicks / totalImp) * 100 : 0
  const avgFreq      = ads.length > 0 ? ads.reduce((s, a) => s + a.frequency, 0) / ads.length : 0

  const totalViewContent      = ads.reduce((s, a) => s + a.funnel.viewContent, 0)
  const totalAddToCart        = ads.reduce((s, a) => s + a.funnel.addToCart, 0)
  const totalInitiateCheckout = ads.reduce((s, a) => s + a.funnel.initiateCheckout, 0)
  const totalAddPaymentInfo   = ads.reduce((s, a) => s + a.funnel.addPaymentInfo, 0)
  const totalVideoPlays       = ads.reduce((s, a) => s + a.video.videoPlays, 0)
  const totalThruPlays        = ads.reduce((s, a) => s + a.video.videoThruPlays, 0)
  const avgHookRate           = totalImp > 0 ? (totalVideoPlays / totalImp) * 100 : 0
  const avgHoldRate           = totalVideoPlays > 0 ? (totalThruPlays / totalVideoPlays) * 100 : 0

  const adsetMetrics = {
    spend: totalSpend, impressions: totalImp, clicks: totalClicks,
    reach: ads.reduce((s, a) => s + a.reach, 0),
    ctr: avgCtr, cpm: avgCpm,
    cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    frequency: avgFreq, results: totalResults,
    costPerResult: totalResults > 0 ? totalSpend / totalResults : 0,
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
        <Link href="/admin/meta-ads" style={{ color: 'var(--admin-accent)', textDecoration: 'none' }}>Meta Ads</Link>
        <span>›</span>
        <Link href={`/admin/meta-ads/${accountId}`} style={{ color: 'var(--admin-accent)', textDecoration: 'none' }}>{accName}</Link>
        <span>›</span>
        <Link href={`/admin/meta-ads/${accountId}/${campaignId}`} style={{ color: 'var(--admin-accent)', textDecoration: 'none' }}>Campanha</Link>
        <span>›</span>
        <span>Conjunto</span>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Link href={`/admin/meta-ads/${accountId}/${campaignId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--admin-accent)', textDecoration: 'none', fontSize: '13px', marginBottom: '8px' }}>
          <ArrowLeft size={13} /> Voltar para conjuntos
        </Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px', fontFamily: 'monospace' }}>
          {adsetId}
        </h1>
        <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
          {ads.length} criativo(s) · {range.label} · {accName}
        </div>
      </div>

      {/* Totals */}
      {totalSpend > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '24px' }}>
          {[
            ['Total Gasto',  fmtBrl.format(totalSpend)],
            ['Impressões',   fmtInt(totalImp)],
            ['Cliques',      fmtInt(totalClicks)],
            ['CTR médio',    fmtPct(avgCtr)],
            ['CPM médio',    fmtBrl.format(avgCpm)],
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
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px', marginBottom: '24px' }}>
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
                <span style={{ color: rateColor(avgHookRate, 28, 20), fontWeight: 700, fontFamily: 'monospace', fontSize: '16px' }}>{avgHookRate > 0 ? `${avgHookRate.toFixed(1)}%` : '—'}</span>
                <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>reproduções 3s ÷ impressões</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Hold Rate</div>
                <span style={{ color: rateColor(avgHoldRate, 25, 15), fontWeight: 700, fontFamily: 'monospace', fontSize: '16px' }}>{avgHoldRate > 0 ? `${avgHoldRate.toFixed(1)}%` : '—'}</span>
                <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>ThruPlay ÷ reproduções 3s</div>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--admin-text-sec)', paddingTop: '10px', borderTop: '1px solid var(--admin-border)' }}>
              {fmtInt(totalVideoPlays)} reproduções (3s) · {fmtInt(totalThruPlays)} ThruPlays
            </div>
          </div>
        </div>
      )}

      {/* Ads Grid */}
      {ads.length === 0 ? (
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
          <TrendingUp size={32} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '6px' }}>Nenhum criativo com dados</div>
          <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>Este conjunto não teve veiculação no período selecionado.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {ads.map(ad => {
            const cpmColor = ad.cpm <= 0 ? 'var(--admin-text-muted)' : ad.cpm < 15 ? '#16a34a' : ad.cpm < 25 ? '#f59e0b' : '#ef4444'
            const freqWarn = ad.frequency >= 3.5
            return (
              <div key={ad.id} style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '14px', overflow: 'hidden' }}>

                {/* Thumbnail */}
                <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: 'var(--admin-bg)', overflow: 'hidden' }}>
                  {ad.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ad.thumbnailUrl}
                      alt={ad.name}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PlayCircle size={40} color="var(--admin-border)" />
                    </div>
                  )}
                  {/* Status overlay */}
                  <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
                    <StatusBadge status={ad.status} />
                  </div>
                  {/* Spend overlay */}
                  {ad.spend > 0 && (
                    <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
                      {fmtBrl.format(ad.spend)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '6px', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {ad.adTitle ?? ad.name}
                  </div>
                  {ad.adBody && (
                    <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '10px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {ad.adBody}
                    </div>
                  )}

                  {/* Metrics row 1 */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--admin-border)', flexWrap: 'wrap' }}>
                    <MetricBox label="Impressões" value={ad.impressions > 0 ? fmtInt(ad.impressions) : '—'} />
                    <MetricBox label="Cliques"    value={ad.clicks > 0 ? fmtInt(ad.clicks) : '—'} />
                    <MetricBox label="CTR"        value={fmtPct(ad.ctr)} />
                  </div>

                  {/* Metrics row 2 */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: ad.video.videoPlays > 0 ? '8px' : 0, paddingBottom: ad.video.videoPlays > 0 ? '8px' : 0, borderBottom: ad.video.videoPlays > 0 ? '1px solid var(--admin-border)' : 'none' }}>
                    <MetricBox label="CPM"  value={ad.cpm > 0 ? fmtBrl.format(ad.cpm) : '—'}   color={cpmColor} />
                    <MetricBox label="CPC"  value={ad.cpc > 0 ? fmtBrl.format(ad.cpc) : '—'} />
                    <MetricBox label="Freq" value={ad.frequency > 0 ? ad.frequency.toFixed(2) : '—'} color={freqWarn ? '#ef4444' : undefined} />
                    {ad.results > 0 && <MetricBox label="Conv" value={ad.results.toFixed(0)} color="#16a34a" />}
                  </div>

                  {/* Metrics row 3 — vídeo (só se o criativo for vídeo) */}
                  {ad.video.videoPlays > 0 && (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <MetricBox label="Video Plays" value={fmtInt(ad.video.videoPlays)} />
                      <MetricBox label="ThruPlay"     value={fmtInt(ad.video.videoThruPlays)} />
                      <MetricBox label="Hook Rate"    value={ad.video.hookRate > 0 ? `${ad.video.hookRate.toFixed(1)}%` : '—'} color={rateColor(ad.video.hookRate, 28, 20)} />
                      <MetricBox label="Hold Rate"    value={ad.video.holdRate > 0 ? `${ad.video.holdRate.toFixed(1)}%` : '—'} color={rateColor(ad.video.holdRate, 25, 15)} />
                    </div>
                  )}

                  {/* Funil compacto do anúncio */}
                  {ad.funnel.viewContent > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--admin-border)', fontSize: '10px', color: 'var(--admin-text-muted)', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                      <span>VC {fmtInt(ad.funnel.viewContent)}</span>
                      <span>→</span>
                      <span>ATC {fmtInt(ad.funnel.addToCart)}</span>
                      <span>→</span>
                      <span>IC {fmtInt(ad.funnel.initiateCheckout)}</span>
                      <span>→</span>
                      <span>API {fmtInt(ad.funnel.addPaymentInfo)}</span>
                      <span>→</span>
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>Compra {ad.results.toFixed(0)}</span>
                    </div>
                  )}

                  <div style={{ marginTop: '10px' }}>
                    <RankingBadge ranking={ad.diagnostics.qualityRanking} />
                  </div>

                  {freqWarn && (
                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#ef4444', fontWeight: 600, background: 'rgba(239,68,68,0.08)', padding: '5px 8px', borderRadius: '6px' }}>
                      ⚠ Frequência alta ({ad.frequency.toFixed(2)}×) — risco de fadiga
                    </div>
                  )}

                  {ad.ctaType && (
                    <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>CTA: {ad.ctaType}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AiAnalysisPanel
        level="adset"
        entityName={`Conjunto ${adsetId}`}
        metrics={adsetMetrics}
        since={range.start}
        until={range.endExclusive}
        accountId={accountId}
      />
    </div>
  )
}
