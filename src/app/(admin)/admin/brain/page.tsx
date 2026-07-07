import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getDateRangeFromSearchParams } from '@/lib/admin/date-range'
import { getCommerceBrainData } from '@/lib/admin/commerce-brain'
import type { FunnelStep, ProductDiagnostic, TrafficDiagnostic, DeviceDiagnostic, SessionJourney, BrainInsight, BrainSummary } from '@/lib/admin/commerce-brain'
import { RunBrainButton } from './_components/run-brain-button'
import { getMetaBrainData } from '@/lib/admin/meta-ads'
import Link from 'next/link'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtPct(v: number) {
  return (v * 100).toFixed(1) + '%'
}
function fmtNum(v: number) {
  return v.toLocaleString('pt-BR')
}

// ── Status styling ────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  healthy:   { bg: 'rgba(34,197,94,0.12)', text: '#16a34a', dot: '#22c55e' },
  attention: { bg: 'rgba(245,158,11,0.12)', text: '#d97706', dot: '#f59e0b' },
  critical:  { bg: 'rgba(239,68,68,0.12)',  text: '#dc2626', dot: '#ef4444' },
}

const INSIGHT_COLORS: Record<string, { bg: string; border: string; label: string; labelBg: string }> = {
  critical:    { bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.3)',   label: 'Crítico',       labelBg: '#dc2626' },
  high:        { bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.3)',  label: 'Alto',          labelBg: '#d97706' },
  medium:      { bg: 'rgba(99,102,241,0.06)',  border: 'rgba(99,102,241,0.3)',  label: 'Médio',         labelBg: '#4f46e5' },
  opportunity: { bg: 'rgba(34,197,94,0.06)',   border: 'rgba(34,197,94,0.3)',   label: 'Oportunidade',  labelBg: '#16a34a' },
}

const JOURNEY_STATUS_COLORS: Record<string, string> = {
  'Comprou':              '#16a34a',
  'Abandonou no checkout': '#d97706',
  'Abandonou no carrinho': '#d97706',
  'Abandonou no produto':  '#64748b',
  'Explorou sem intenção': '#94a3b8',
}

// ── Sub-components (server, inline) ──────────────────────────────────────────

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '18px 20px' }}>
      <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-main)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

function StatusBadge({ status }: { status: 'healthy' | 'attention' | 'critical' }) {
  const c = STATUS_COLORS[status]
  const label = { healthy: 'OK', attention: 'Atenção', critical: 'Crítico' }[status]
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function FunnelBar({ steps }: { steps: FunnelStep[] }) {
  const max = steps[0]?.count ?? 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {steps.map((step, i) => {
        const c = STATUS_COLORS[i === 0 ? 'healthy' : step.status]
        const barW = Math.max((step.count / max) * 100, step.count > 0 ? 1 : 0)
        return (
          <div key={step.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--admin-text-main)', minWidth: '190px' }}>{step.label}</span>
                {i > 0 && <StatusBadge status={step.status} />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
                {i > 0 && (
                  <span style={{ color: 'var(--admin-text-muted)' }}>
                    {fmtPct(step.rateFromPrev)} da etapa anterior
                  </span>
                )}
                <span style={{ fontWeight: 700, color: 'var(--admin-text-main)', minWidth: '50px', textAlign: 'right' }}>
                  {fmtNum(step.count)}
                </span>
              </div>
            </div>
            <div style={{ height: '8px', background: 'var(--admin-card-hover)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${barW}%`, background: c.dot, borderRadius: '4px', transition: 'width 0.4s ease' }} />
            </div>
            {i > 0 && step.dropCount > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
                ↓ {fmtNum(step.dropCount)} não avançaram
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function InsightCard({ insight }: { insight: BrainInsight }) {
  const c = INSIGHT_COLORS[insight.type] ?? INSIGHT_COLORS.medium
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ background: c.labelBg, color: '#fff', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', flexShrink: 0, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {INSIGHT_COLORS[insight.type]?.label ?? 'Info'}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>{insight.title}</div>
          <div style={{ fontSize: '13px', color: 'var(--admin-text-sec)', lineHeight: 1.5, marginBottom: '8px' }}>{insight.evidence}</div>
          <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>→ {insight.action}</div>
        </div>
      </div>
    </div>
  )
}

function ProductsTable({ products, storeAvgAtc }: { products: ProductDiagnostic[]; storeAvgAtc: number }) {
  if (products.length === 0) return (
    <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', margin: 0 }}>Nenhum dado de produto no período.</p>
  )

  const CLASSIFICATION_COLORS: Record<string, string> = {
    'Campeão': '#16a34a', 'Promissor': '#0284c7', 'OK': '#64748b',
    'Atenção': '#d97706', 'Alto tráfego, baixo interesse': '#dc2626',
    'Sem carrinho': '#dc2626', 'Poucos dados': '#94a3b8',
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
            {['Produto', 'Views', 'ATC', 'Taxa ATC', 'Classificação', 'Alerta'].map((h) => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={p.slug} style={{ borderBottom: i < products.length - 1 ? '1px solid var(--admin-border)' : 'none' }}>
              <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--admin-text-main)', fontWeight: 500 }}>{p.slug}</td>
              <td style={{ padding: '10px 12px', color: 'var(--admin-text-main)', fontWeight: 600 }}>{fmtNum(p.views)}</td>
              <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)' }}>{fmtNum(p.atc)}</td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{
                  color: p.atcRate >= storeAvgAtc ? '#16a34a' : p.atcRate >= storeAvgAtc * 0.5 ? '#d97706' : '#dc2626',
                  fontWeight: 600,
                }}>
                  {fmtPct(p.atcRate)}
                </span>
              </td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{
                  background: `${CLASSIFICATION_COLORS[p.classification] ?? '#64748b'}18`,
                  color: CLASSIFICATION_COLORS[p.classification] ?? '#64748b',
                  fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap',
                }}>
                  {p.classification}
                </span>
              </td>
              <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--admin-text-muted)', maxWidth: '200px' }}>
                {p.alert ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TrafficTable({ traffic }: { traffic: TrafficDiagnostic[] }) {
  if (traffic.length === 0) return (
    <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', margin: 0 }}>Nenhuma sessão com UTM no período.</p>
  )

  const CLASS_COLORS: Record<string, string> = {
    'Tráfego comprador': '#16a34a', 'Médio': '#64748b',
    'Baixa qualidade': '#dc2626', 'Sem compras': '#f59e0b', 'Volume baixo': '#94a3b8',
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
            {['Origem', 'Sessões', 'Pedidos', 'Receita', 'Conversão', 'R$/Sessão', 'Qualidade'].map((h) => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {traffic.map((t, i) => (
            <tr key={t.source} style={{ borderBottom: i < traffic.length - 1 ? '1px solid var(--admin-border)' : 'none' }}>
              <td style={{ padding: '10px 12px', color: 'var(--admin-text-main)', fontWeight: 600 }}>{t.source}</td>
              <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)' }}>{fmtNum(t.sessions)}</td>
              <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)' }}>{t.orders}</td>
              <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)' }}>{t.revenue > 0 ? fmt(t.revenue) : '—'}</td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ color: t.conversionRate > 0 ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
                  {t.orders > 0 ? fmtPct(t.conversionRate) : '0%'}
                </span>
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--admin-text-sec)' }}>
                {t.revenuePerSession > 0 ? fmt(t.revenuePerSession) : '—'}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{
                  background: `${CLASS_COLORS[t.classification] ?? '#64748b'}18`,
                  color: CLASS_COLORS[t.classification] ?? '#64748b',
                  fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap',
                }}>
                  {t.classification}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DeviceCards({ devices }: { devices: DeviceDiagnostic[] }) {
  if (devices.length === 0) return (
    <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', margin: 0 }}>Nenhum dado de dispositivo.</p>
  )

  const totalSessions = devices.reduce((s, d) => s + d.sessions, 0)
  const ICONS: Record<string, string> = { mobile: '📱', desktop: '🖥️', tablet: '📋', desconhecido: '❓' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
      {devices.map((d) => (
        <div key={d.device} style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '20px', marginBottom: '8px' }}>{ICONS[d.device] ?? '❓'}</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)', textTransform: 'capitalize', marginBottom: '12px' }}>{d.device}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>Sessões</span>
              <span style={{ color: 'var(--admin-text-main)', fontWeight: 600 }}>{fmtNum(d.sessions)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>Views</span>
              <span style={{ color: 'var(--admin-text-sec)' }}>{fmtNum(d.views)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>ATC</span>
              <span style={{ color: 'var(--admin-text-sec)' }}>{fmtNum(d.atc)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--admin-border)' }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>Taxa ATC</span>
              <span style={{ color: d.atcRate > 0 ? '#16a34a' : '#94a3b8', fontWeight: 700 }}>{fmtPct(d.atcRate)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>% do tráfego</span>
              <span style={{ color: 'var(--admin-text-sec)' }}>{totalSessions > 0 ? Math.round((d.sessions / totalSessions) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function JourneyList({ journeys }: { journeys: SessionJourney[] }) {
  if (journeys.length === 0) return (
    <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', margin: 0 }}>Nenhuma jornada registrada no período.</p>
  )

  const EVENT_LABELS: Record<string, string> = {
    page_view: 'Visualizou página',
    view_content: 'Viu produto',
    add_to_cart: 'Adicionou ao carrinho',
    cart_open: 'Abriu carrinho',
    initiate_checkout: 'Iniciou checkout',
    purchase: 'Comprou',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {journeys.map((j) => {
        const statusColor = JOURNEY_STATUS_COLORS[j.status] ?? '#94a3b8'
        return (
          <div key={j.sessionId} style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--admin-text-muted)' }}>{j.sessionId}</span>
                <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)', background: 'var(--admin-card)', padding: '2px 6px', borderRadius: '4px', textTransform: 'capitalize' }}>{j.device}</span>
                {j.utmSource && (
                  <span style={{ fontSize: '11px', color: '#0284c7', background: 'rgba(2,132,199,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{j.utmSource}</span>
                )}
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor, whiteSpace: 'nowrap' }}>{j.status}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {j.events.map((e, idx) => (
                <span key={idx} style={{ fontSize: '11px', color: 'var(--admin-text-muted)', background: 'var(--admin-card)', padding: '3px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {EVENT_LABELS[e.event_type] ?? e.event_type}
                  {e.product_slug && <span style={{ color: 'var(--admin-accent)', fontWeight: 600 }}>· {e.product_slug}</span>}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EmptyState({ summary }: { summary: BrainSummary }) {
  return (
    <div style={{ background: 'var(--admin-card)', border: '1px dashed var(--admin-border)', borderRadius: '16px', padding: '40px 32px', textAlign: 'center', marginTop: '24px' }}>
      <div style={{ fontSize: '32px', marginBottom: '16px' }}>📊</div>
      <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: 'var(--admin-text-main)' }}>
        Volume insuficiente para análise
      </h3>
      <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--admin-text-muted)', lineHeight: 1.6 }}>
        São necessárias pelo menos 10 sessões no período selecionado para gerar diagnósticos confiáveis.
        <br />Atualmente: <strong style={{ color: 'var(--admin-text-main)' }}>{summary.sessions} sessão(ões)</strong> registradas.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
        <span>✓ Tracking ativo</span>
        <span>✓ Events coletados</span>
        <span>⏳ Aguardando volume</span>
      </div>
    </div>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--admin-text-main)' }}>{title}</h2>
        {sub && <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--admin-text-muted)' }}>{sub}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CommerceBrainPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  if (!secret || token !== secret) return null

  const sp    = await searchParams
  const range = getDateRangeFromSearchParams(sp)
  const db    = getDb()
  const [data, metaBrain] = await Promise.all([
    getCommerceBrainData(db, range),
    getMetaBrainData(db, range),
  ])
  const { summary, funnel, products, traffic, devices, journeys, insights } = data
  const storeAvgAtc = summary.productViews > 0 ? summary.atc / summary.productViews : 0

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--admin-text-main)' }}>Commerce Brain</h1>
            <span style={{ background: 'rgba(124,58,237,0.15)', color: '#7c3aed', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', letterSpacing: '0.5px' }}>
              TEMPO REAL
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--admin-text-muted)' }}>
            Inteligência de conversão · {range.label}
          </p>
        </div>
        <RunBrainButton />
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <SummaryCard label="Sessões"      value={fmtNum(summary.sessions)} />
        <SummaryCard label="Views produto" value={fmtNum(summary.productViews)} />
        <SummaryCard
          label="Add to Cart"
          value={fmtNum(summary.atcSessions)}
          sub={`Sessões · ${fmtNum(summary.atc)} eventos (Leve 2 gera ~2x)`}
        />
        <SummaryCard label="Checkout"     value={fmtNum(summary.checkout)} />
        <SummaryCard label="Pedidos"      value={fmtNum(summary.paidOrders)} />
        <SummaryCard label="Receita"      value={fmt(summary.revenue)} />
        <SummaryCard
          label="Conversão total"
          value={fmtPct(summary.totalConversion)}
          sub={`Sessão → pedido pago`}
        />
        <SummaryCard
          label="Maior gargalo"
          value={summary.biggestGap}
        />
      </div>

      {!summary.hasEnoughData ? (
        <EmptyState summary={summary} />
      ) : (
        <>
          {/* Insights */}
          {insights.length > 0 && (
            <Section title="Diagnóstico Automático" sub={`${insights.length} ponto(s) identificado(s) no período`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
              </div>
            </Section>
          )}

          {insights.length === 0 && (
            <Section title="Diagnóstico Automático">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', fontSize: '14px', color: 'var(--admin-text-muted)' }}>
                <span style={{ fontSize: '20px' }}>✅</span>
                Nenhuma anomalia crítica detectada no período. Funil dentro dos parâmetros esperados.
              </div>
            </Section>
          )}

          {/* Funnel */}
          <Section
            title="Funil de Conversão"
            sub={`Maior gargalo identificado: ${summary.biggestGap}`}
          >
            <FunnelBar steps={funnel} />
            <div style={{ marginTop: '20px', padding: '14px 16px', background: 'var(--admin-bg)', borderRadius: '10px', fontSize: '13px', color: 'var(--admin-text-muted)', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <span><strong style={{ color: STATUS_COLORS.healthy.text }}>OK</strong> = etapa saudável</span>
              <span><strong style={{ color: STATUS_COLORS.attention.text }}>Atenção</strong> = taxa abaixo do esperado</span>
              <span><strong style={{ color: STATUS_COLORS.critical.text }}>Crítico</strong> = gargalo forte — prioridade de ação</span>
            </div>
          </Section>

          {/* Products */}
          <Section
            title="Diagnóstico por Produto"
            sub={`${products.length} produto(s) com dados no período · Média ATC da loja: ${fmtPct(storeAvgAtc)}`}
          >
            <ProductsTable products={products} storeAvgAtc={storeAvgAtc} />
          </Section>

          {/* Traffic */}
          <Section title="Diagnóstico por Origem de Tráfego" sub="Sessões agrupadas por utm_source">
            <TrafficTable traffic={traffic} />
          </Section>

          {/* Devices */}
          <Section title="Diagnóstico por Dispositivo">
            <DeviceCards devices={devices} />
          </Section>

          {/* Meta Ads Intelligence */}
          <Section title="Meta Ads Intelligence" sub="Dados de mídia paga cruzados com Commerce Brain">
            {metaBrain ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { label: 'Investimento Meta', value: `R$ ${metaBrain.totalSpend.toFixed(2)}` },
                    { label: 'ROAS Real estimado', value: `${metaBrain.realRoas.toFixed(2)}×` },
                    { label: 'Melhor campanha', value: metaBrain.topCampaign ?? '—' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: 'var(--admin-bg)', borderRadius: '10px', padding: '12px 14px', border: '1px solid var(--admin-border)' }}>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>{label}</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)', lineHeight: 1.2 }}>{value}</div>
                    </div>
                  ))}
                </div>
                {metaBrain.mainAlert && (
                  <div style={{ display: 'flex', gap: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--admin-text-main)' }}>
                      <span style={{ fontWeight: 600 }}>Alerta: </span>{metaBrain.mainAlert}
                    </div>
                  </div>
                )}
                {metaBrain.recommendation && (
                  <div style={{ display: 'flex', gap: '10px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: 'var(--admin-text-sec)' }}>
                    <span style={{ fontWeight: 600, color: '#16a34a' }}>→</span> {metaBrain.recommendation}
                  </div>
                )}
                <Link href="/admin/meta-ads" style={{ fontSize: '13px', color: 'var(--admin-accent)', fontWeight: 500, textDecoration: 'none' }}>
                  Ver análise completa de Meta Ads →
                </Link>
              </div>
            ) : (
              <div style={{ background: 'var(--admin-bg)', borderRadius: '10px', padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                Meta Ads não conectado ou sem dados no período.{' '}
                <Link href="/admin/meta-ads" style={{ color: 'var(--admin-accent)', fontWeight: 500, textDecoration: 'none' }}>Configurar →</Link>
              </div>
            )}
          </Section>

          {/* Journeys */}
          <Section
            title="Jornadas Recentes"
            sub="Últimas 20 sessões com eventos registrados"
          >
            <JourneyList journeys={journeys} />
          </Section>
        </>
      )}
    </div>
  )
}
