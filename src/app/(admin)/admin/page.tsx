import type { ReactNode } from 'react'
import Link from 'next/link'
import { Bell, DollarSign, Package, Receipt, Megaphone } from 'lucide-react'
import { CeoRefreshButton } from './_components/ceo-refresh-button'
import { CeoSyncButton } from './_components/ceo-sync-button'
import { DashboardEditableLayout, type DashboardWidget } from './_components/dashboard-editable-layout'
import { ReorderableRow } from './_components/reorderable-row'
import { HoverBreakdownCard } from './_components/hover-breakdown-card'
import { LucroLiquidoCard } from './_components/lucro-liquido-card'
import { InvestmentBarChart } from './_components/investment-bar-chart'
import { HourlySalesChart } from './_components/hourly-sales-chart'
import { PaymentMethodDonut } from './_components/payment-method-donut'
import { ApprovalRateRings } from './_components/approval-rate-rings'
import { RegionalAnalysis } from './_components/regional-analysis'
import { HelpTip } from './_components/dashboard/help-tip'
import { PeriodBar } from './_components/dashboard/period-bar'
import { EvolutionChart } from './_components/dashboard/evolution-chart'
import { ProductRank } from './_components/dashboard/product-rank'
import { KpiValue } from './_components/dashboard/kpi-value'
import { MetaTaxToggleButton, MetaTaxValue, MetaTaxBase } from './_components/dashboard/meta-tax'
import { ExportCsvButton } from './_components/dashboard/export-csv'
import { formatKind, type ValueKind } from './_components/dashboard/format'
import './_components/dashboard/dashboard.css'
import { getDateRangeFromSearchParams } from '@/lib/admin/date-range'
import { getDashboardData, type DashboardData } from '@/lib/admin/dashboard-data'
import { METRICS, type MetricKey } from '@/lib/admin/metric-contract'
import { getMetaLiveSpend } from '@/lib/admin/meta-ads'
import { getSalesBreakdown } from '@/lib/admin/sales-breakdown'
import { checkAuth } from '@/lib/admin/auth'

// ── formatação ───────────────────────────────────────────────────────────────

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const int = (v: number) => Math.round(v).toLocaleString('pt-BR')
const brlShort = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const pct = (v: number, d = 1) => `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`
const dec = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`

function ago(iso: string | null): string {
  if (!iso) return 'sem registro'
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 48) return `há ${h} h${min % 60 ? ` ${min % 60} min` : ''}`
  return `há ${Math.floor(h / 24)} dias`
}

// ── KPI ──────────────────────────────────────────────────────────────────────

type Tone = 'up' | 'down' | 'neutral'
type State = 'ok' | 'partial' | 'na'

interface Kpi {
  id:     MetricKey
  value:  number | null
  base:   number | null
  kind:   ValueKind
  /** 'up' = subir é bom; 'down' = subir é ruim; 'neutral' = depende do contexto. */
  tone:   Tone
  state?: State
  why?:   string
  sub?:   string
  /** Sem comparação quando a referência não é equivalente (ex.: mídia de hoje por hora). */
  noCmp?: boolean
}

function Delta({ cur, base, tone }: { cur: number; base: number; tone: Tone }) {
  if (base === 0) return <span className="dsh-dl dsh-dl-neu">{cur === 0 ? 'igual' : 'sem base %'}</span>
  const d = (cur - base) / Math.abs(base)
  if (Math.abs(d) < 0.0005) return <span className="dsh-dl dsh-dl-neu">igual</span>
  const good = tone === 'neutral' ? null : tone === 'up' ? d > 0 : d < 0
  const cls = good === null ? 'dsh-dl-neu' : good ? 'dsh-dl-good' : 'dsh-dl-bad'
  return <span className={`dsh-dl ${cls}`}><span className="dsh-dl-a">{d > 0 ? '▲' : '▼'}</span>{Math.abs(d * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
}

/** Para onde cada card leva. O período escolhido vai junto na URL. */
const DRILL: Partial<Record<MetricKey, { href: string; label: string }>> = {
  receita:     { href: '/admin/pedidos', label: 'Pedidos' },
  pagos:       { href: '/admin/pedidos', label: 'Pedidos' },
  ticket:      { href: '/admin/pedidos', label: 'Pedidos' },
  pendentes:   { href: '/admin/pedidos', label: 'Pedidos' },
  lucro:       { href: '/admin/financeiro/agente', label: 'Financeiro' },
  margem:      { href: '/admin/financeiro/agente', label: 'Financeiro' },
  midia:       { href: '/admin/gestor-trafego', label: 'Tráfego' },
  meta:        { href: '/admin/gestor-trafego', label: 'Tráfego' },
  google:      { href: '/admin/gestor-trafego', label: 'Tráfego' },
  mer:         { href: '/admin/gestor-trafego', label: 'Tráfego' },
  roi:         { href: '/admin/gestor-trafego', label: 'Tráfego' },
  cpa:         { href: '/admin/gestor-trafego', label: 'Tráfego' },
  conversao:   { href: '/admin/brain', label: 'Commerce Brain' },
  carrinhos:   { href: '/admin/brain', label: 'Commerce Brain' },
  checkouts:   { href: '/admin/brain', label: 'Commerce Brain' },
  recorrentes: { href: '/admin/clientes', label: 'Clientes' },
  custos:      { href: '/admin/custos', label: 'Custos' },
  atribuicao:  { href: '/admin/analise-suprema', label: 'Análise Suprema' },
}

function Spark({ vals, color }: { vals: (number | null)[]; color: string }) {
  const nums = vals.filter((v): v is number => v !== null)
  if (nums.length < 2) return null
  const min = Math.min(...nums), max = Math.max(...nums)
  const W = 100, H = 24
  const x = (i: number) => (i / (vals.length - 1)) * W
  const y = (v: number) => H - 2 - ((v - min) / (max - min || 1)) * (H - 4)
  let d = '', pen = false
  vals.forEach((v, i) => {
    if (v === null) { pen = false; return }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    pen = true
  })
  const gid = `sp-${color.replace(/\W/g, '')}`
  return (
    <svg className="dsh-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="dsh-rv">
        {!d.slice(1).includes('M') && <path d={`${d}L${x(vals.length - 1)},${H}L${x(0)},${H}Z`} fill={`url(#${gid})`} />}
        <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  )
}

const SPARK_COLOR: Partial<Record<MetricKey, string>> = { receita: 'var(--c1)', lucro: 'var(--c2)', pagos: 'var(--c3)', midia: 'var(--c4)' }

function KpiCard({ k, refLabel, qs, spark }: { k: Kpi; refLabel: string; qs: string; spark?: (number | null)[] }) {
  const def = METRICS[k.id]
  const state: State = k.value === null ? 'na' : (k.state ?? 'ok')
  const drill = DRILL[k.id]
  // o gasto Meta tem o botão de somar os 13,8% de imposto, como no layout antigo
  const isMeta = k.id === 'meta'
  return (
    <div className={`dsh-kpi${drill ? ' dsh-kpi-go' : ''}${state === 'partial' ? ' dsh-kpi-partial' : ''}`}>
      {/* link esticado sobre o card; o "?" fica por cima e não navega */}
      {drill && <Link className="dsh-kpi-link" href={`${drill.href}${qs}`} aria-label={`${def.label}: ver detalhe em ${drill.label}`} />}
      <div className="dsh-kpi-l">
        <span>{def.label}</span>
        <span className="dsh-kpi-tools">
          {isMeta && <MetaTaxToggleButton />}
          <HelpTip def={def} />
        </span>
      </div>
      <div className="dsh-kpi-v num">
        {k.value === null
          ? <span className="dsh-kpi-na">indisponível</span>
          : isMeta ? <MetaTaxValue value={k.value} /> : <KpiValue value={k.value} kind={k.kind} />}
      </div>
      {drill && <span className="dsh-kpi-arrow" aria-hidden="true">→</span>}
      <div className="dsh-kpi-f">
        {k.value !== null && (k.base !== null && !k.noCmp
          ? <Delta cur={k.value} base={k.base} tone={k.tone} />
          : <span className="dsh-dl dsh-dl-neu" title={k.noCmp ? 'Mídia e lucro não têm leitura por hora, então hoje ficam sem comparação' : undefined}>sem comparação</span>)}
        {state === 'partial' && <span className="dsh-badge dsh-badge-partial">parcial</span>}
        {!k.sub && k.value !== null && k.base !== null && !k.noCmp && (isMeta
          ? <MetaTaxBase base={k.base} title={refLabel} />
          : <span className="dsh-kpi-sub" title={refLabel}>ant. {formatKind(k.base, k.kind)}</span>)}
      </div>
      {state !== 'ok' && k.why && <div className="dsh-kpi-why" title={k.why}>{k.why}</div>}
      {k.sub && <div className="dsh-kpi-sub">{k.sub}</div>}
      {spark && <Spark vals={spark} color={SPARK_COLOR[k.id] ?? 'var(--c1)'} />}
    </div>
  )
}

function Card({ title, help, right, cls, children }: { title: string; help?: MetricKey; right?: ReactNode; cls: string; children: ReactNode }) {
  return (
    <section className={`dsh-card ${cls}`}>
      <div className="dsh-card-h">
        <h2 className="dsh-card-t">{title}{help && <HelpTip def={METRICS[help]} />}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

// ── blocos ───────────────────────────────────────────────────────────────────

function kpis(d: DashboardData): { title: string; items: Kpi[] }[] {
  const { cur, base: ref, curD, baseD: refD } = d
  const hourCut = d.compareNote !== null && d.singleDay
  const pm = d.partialMedia.join('; ')
  const pp = d.partialProfit.join('; ')
  const mediaState: State = pm ? 'partial' : 'ok'
  const profitState: State = pp ? 'partial' : 'ok'
  const missingCost = cur.paid - cur.costOk
  const noOrigin = cur.yampiPaid - cur.attributed

  return [
    {
      title: 'Resultado',
      items: [
        { id: 'receita', value: cur.revenue, base: ref.revenue, kind: 'brl', tone: 'up' },
        { id: 'lucro', value: cur.profit, base: ref.profit, kind: 'brl', tone: 'up', state: profitState, why: pp, noCmp: hourCut },
        { id: 'margem', value: curD.margin, base: refD.margin, kind: 'pct1', tone: 'up', state: profitState, why: pp ? 'herda o lucro parcial' : undefined, noCmp: hourCut },
        { id: 'pagos', value: cur.paid, base: ref.paid, kind: 'int', tone: 'up' },
        { id: 'ticket', value: curD.ticket, base: refD.ticket, kind: 'brl', tone: 'up' },
        { id: 'conversao', value: curD.conv, base: refD.conv, kind: 'pct2', tone: 'up', why: d.funnelReason ?? undefined },
      ],
    },
    {
      title: 'Mídia e eficiência',
      items: [
        { id: 'midia', value: cur.media, base: ref.media, kind: 'brl', tone: 'neutral', state: mediaState, why: pm, noCmp: hourCut },
        { id: 'meta', value: cur.meta, base: ref.meta, kind: 'brl', tone: 'neutral', state: d.financials.metaTrusted ? 'ok' : 'partial', why: d.financials.metaTrusted ? undefined : 'API ao vivo falhou — usando o último sync', noCmp: hourCut },
        { id: 'google', value: cur.google, base: ref.google, kind: 'brl', tone: 'neutral', state: d.financials.googleAdsTrusted ? 'ok' : 'partial', why: d.financials.googleAdsTrusted ? undefined : 'API ao vivo falhou — usando o último sync', noCmp: hourCut },
        { id: 'mer', value: curD.mer, base: refD.mer, kind: 'x', tone: 'up', state: mediaState, why: pm ? 'mídia incompleta: valor superestimado' : undefined, noCmp: hourCut },
        { id: 'roi', value: curD.roi, base: refD.roi, kind: 'pct0', tone: 'up', state: profitState, why: pp ? 'depende do lucro parcial' : undefined, noCmp: hourCut },
        { id: 'cpa', value: curD.cpa, base: refD.cpa, kind: 'brl', tone: 'down', state: mediaState, why: pm ? 'mídia incompleta: valor subestimado' : undefined, noCmp: hourCut },
      ],
    },
    {
      title: 'Operação e qualidade dos dados',
      items: [
        { id: 'pendentes', value: d.pendingNow, base: null, kind: 'int', tone: 'neutral', sub: `${int(d.pendingInPeriod)} criados no período ainda pendentes` },
        { id: 'carrinhos', value: cur.cartSessions, base: ref.cartSessions, kind: 'int', tone: 'up', why: d.funnelReason ?? undefined },
        { id: 'checkouts', value: cur.checkoutSessions, base: ref.checkoutSessions, kind: 'int', tone: 'up', why: d.funnelReason ?? undefined },
        { id: 'recorrentes', value: curD.recShare, base: refD.recShare, kind: 'pct1', tone: 'up' },
        { id: 'custos', value: curD.costCov, base: null, kind: 'pct1', tone: 'up', state: missingCost > 0 ? 'partial' : 'ok', sub: missingCost > 0 ? `${int(missingCost)} pedido(s) sem custo` : 'todos os pedidos com custo' },
        { id: 'atribuicao', value: curD.attrCov, base: null, kind: 'pct1', tone: 'up', sub: `${int(noOrigin)} pedido(s) sem origem` },
      ],
    },
  ]
}

function Summary({ d }: { d: DashboardData }) {
  const { cur, curD, base: ref } = d
  const chg = ref.revenue > 0 ? (cur.revenue - ref.revenue) / ref.revenue : null
  const neg = d.alerts?.[0]
  return (
    <section className="dsh-card dsh-sum">
      <span className="dsh-eyebrow">Em resumo · {d.curLabel}</span>
      <p>
        Receita paga de <b className="num">{brl(cur.revenue)}</b>
        {chg !== null && <> ({chg >= 0 ? '+' : '−'}{pct(Math.abs(chg))} contra {d.refLabel})</>} em <b className="num">{int(cur.paid)} pedidos</b>
        {curD.ticket !== null && <>, ticket de {brl(curD.ticket)}</>}.{' '}
        {cur.profit !== null && <>Lucro gerencial de <b className="num">{brl(cur.profit)}</b>{d.partialProfit.length > 0 && <> <span className="dsh-badge dsh-badge-partial">parcial</span></>}{curD.margin !== null && <> e margem de {pct(curD.margin)}</>}. </>}
        {cur.media !== null && <>Mídia de {brl(cur.media + (cur.mediaTax ?? 0))} com o tributo do Meta{d.partialMedia.length > 0 && <> <span className="dsh-badge dsh-badge-partial">parcial</span></>}{curD.mer !== null && <>, com ROAS combinado de {dec(curD.mer)}</>}.</>}
      </p>
      {neg && (
        <div className="dsh-sum-a">
          <Link href="/admin/alertas" className="dsh-sum-i">
            <span className={`dsh-sg ${neg.severidade === 'critico' ? 'dsh-sg-bad' : 'dsh-sg-warn'}`} />
            <span><small>Atenção</small><b>{neg.titulo}</b></span>
            <em>→</em>
          </Link>
        </div>
      )}
    </section>
  )
}

function MetaSim({ d }: { d: DashboardData }) {
  const { profit, meta, mediaTax } = d.cur
  if (profit === null || meta === null || mediaTax === null) return <p className="dsh-empty">Sem lucro calculado neste período.</p>
  return (
    <>
      <div className="dsh-sim">
        <div><span>Resultado antes do gasto Meta</span><b className="num">{brl(profit + meta + mediaTax)}</b></div>
        <div><span>Gasto Meta + tributo de 13,8%</span><b className="num neg">− {brl(meta + mediaTax)}</b></div>
        <div className="dsh-sim-t"><span>Lucro gerencial (com Meta)</span><b className="num">{brl(profit)}</b></div>
      </div>
      <p className="dsh-note">
        Simulação com os mesmos pedidos e a mesma receita. Não quer dizer que a receita existiria sem anúncio.
        {d.partialProfit.length > 0 && <> <b>Parcial:</b> {d.partialProfit.join('; ')}.</>}
      </p>
    </>
  )
}

function Funnel({ d }: { d: DashboardData }) {
  const c = d.cur
  if (c.sessions === null || c.productSessions === null || c.cartSessions === null || c.checkoutSessions === null) {
    return <p className="dsh-empty">Funil indisponível: {d.funnelReason ?? 'sem dados do tracking'}.</p>
  }
  const steps: [string, number][] = [
    ['Sessões', c.sessions],
    ['Viram produto', c.productSessions],
    ['Adicionaram ao carrinho', c.cartSessions],
    ['Iniciaram checkout', c.checkoutSessions],
    ['Compraram (pago)', c.purchaseSessions],
  ]
  const top = steps[0][1] || 1
  let worst = 1, worstRate = Infinity
  for (let i = 1; i < steps.length; i++) {
    const r = steps[i - 1][1] > 0 ? steps[i][1] / steps[i - 1][1] : Infinity
    if (r < worstRate) { worstRate = r; worst = i }
  }
  return (
    <>
      <div className="dsh-fun">
        {steps.map(([label, v], i) => (
          <div className={`dsh-fun-r${i === worst && Number.isFinite(worstRate) ? ' worst' : ''}`} key={label}>
            <span className="dsh-fun-l">{label}</span>
            {/* raiz quadrada: sem ela as etapas finais somem numa barra de 1px.
                70% deixa espaço para o número ao lado da barra. */}
            <div className="dsh-fun-b"><i style={{ width: `${Math.max(3, Math.sqrt(v / top) * 70)}%` }} /><b className="num">{int(v)}</b></div>
            <span className="dsh-fun-c num">{i && steps[i - 1][1] > 0 ? pct(v / steps[i - 1][1]) : ''}</span>
            <span className="dsh-fun-a num">{i ? pct(v / top, 2) : ''}</span>
          </div>
        ))}
      </div>
      <div className="dsh-fun-foot">
        {Number.isFinite(worstRate) && <span>Maior abandono: <b>{steps[worst - 1][0].toLowerCase()} → {steps[worst][0].toLowerCase()} ({pct(1 - worstRate)} saem)</b></span>}
        <span><b className="num">{int(c.noSessionPaid)}</b> compra(s) sem sessão identificada — entram na receita, não no funil.</span>
        <span>Largura das barras em escala de raiz quadrada. <Link className="dsh-link" href="/admin/brain">Análise completa do funil →</Link></span>
      </div>
    </>
  )
}

function States({ d }: { d: DashboardData }) {
  const top = d.states.slice(0, 8)
  if (top.length === 0) return <p className="dsh-empty">Nenhum pedido pago no período.</p>
  const max = top[0].revenue || 1
  return (
    <>
      <div className="dsh-hb">
        {top.map((s, i) => (
          <div className="dsh-hb-r" key={s.uf}>
            <span className="dsh-hb-l">{s.uf}</span>
            <span className="dsh-hb-v">{brlShort(s.revenue)} · {int(s.paid)} ped. · ticket {brlShort(s.ticket)}</span>
            <div className="dsh-hb-t"><i style={{ width: `${(s.revenue / max) * 100}%`, ['--i' as string]: i }} /></div>
          </div>
        ))}
      </div>
      <p className="dsh-note">Estado de entrega dos pedidos pagos. Vendas manuais ficam fora (sem endereço no admin).</p>
    </>
  )
}

function Alerts({ d }: { d: DashboardData }) {
  if (d.alerts === null) return <p className="dsh-empty">A verificação de alertas falhou agora — ver a página de Alertas.</p>
  if (d.alerts.length === 0) return <p className="dsh-empty">Nenhum alerta aberto neste momento.</p>
  return (
    <div className="dsh-al">
      {d.alerts.slice(0, 5).map(a => (
        <Link key={a.chave} href="/admin/alertas">
          <span className={`dsh-sg ${a.severidade === 'critico' ? 'dsh-sg-bad' : 'dsh-sg-warn'}`} />
          <span><b>{a.titulo}</b><small>{a.detalhe}</small></span>
          <span className={`dsh-badge ${a.severidade === 'critico' ? 'dsh-badge-bad' : 'dsh-badge-warn'}`}>{a.severidade === 'critico' ? 'alta' : 'média'}</span>
        </Link>
      ))}
    </div>
  )
}

// ── página ───────────────────────────────────────────────────────────────────

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; cmp?: string }>
}) {
  if (!(await checkAuth())) return null

  const sp    = await searchParams
  const range = getDateRangeFromSearchParams(sp)
  const [d, liveSpend, salesBreakdown] = await Promise.all([
    getDashboardData(range, sp.cmp),
    getMetaLiveSpend(range.start, range.endExclusive),
    getSalesBreakdown(range),
  ])
  const f = d.financials
  const meta = liveSpend.data

  const groups = kpis(d)
  // Mantém o período ao descer para o detalhe.
  const qsParams = new URLSearchParams()
  for (const key of ['range', 'from', 'to'] as const) { const v = sp[key]; if (v) qsParams.set(key, v) }
  const qs = qsParams.size ? `?${qsParams.toString()}` : ''
  const sparks: Partial<Record<MetricKey, (number | null)[]>> = d.series.hourly ? {} : {
    receita: d.series.cur.map(p => p.revenue),
    lucro:   d.series.cur.map(p => p.profit),
    pagos:   d.series.cur.map(p => p.paid),
    midia:   d.series.cur.map(p => p.media),
  }
  const sourcesBad = [
    ...d.partialMedia.map(s => `${s.replace(' (usando o último sync)', '')} parcial`),
    ...(d.funnelReason ? ['Tracking: funil indisponível'] : []),
  ]
  const csvPeriod =`${d.curLabel} (comparação: ${d.refLabel})`
  const refLabel = d.refLabel
  const anteriorLabel = d.singleDay ? (d.curLabel.startsWith('Hoje') ? 'Ontem até esta hora' : 'Dia anterior') : 'Período anterior'

  const more: DashboardWidget[] = [
    {
      id: 'composicao',
      label: 'Composição do lucro e investimento por conta',
      node: (
        <div style={{ display: 'grid', gap: 16 }}>
          <ReorderableRow
            storageKey="composicao"
            gridTemplateColumns="1fr 1fr"
            items={[
              {
                id: 'lucro-liquido',
                node: (
                  <LucroLiquidoCard
                    revenue={f.revenue} productCost={f.productCost} freightCost={f.freightCost} freightPassThrough={f.freightPassThrough}
                    logisticsCost={f.logisticsCost} gatewayFee={f.gatewayFee} yampiFee={f.yampiFee}
                    yampiMonthly={f.yampiMonthly} mediaTax={f.mediaTax} salesTax={f.salesTax}
                    metaSpend={f.metaSpend} googleAdsSpend={f.googleAdsSpend} netProfit={f.netProfit}
                    margin={f.margin} missingCostSources={f.missingCostSources}
                  />
                ),
              },
              {
                id: 'investimento-contas',
                node: (
                  <section className="dsh-card" style={{ height: '100%' }}>
                    <div className="dsh-card-h"><h2 className="dsh-card-t">Investimento por conta</h2></div>
                    <InvestmentBarChart
                      sources={[
                        ...(meta?.accounts.map(acc => ({ name: acc.name, spend: acc.period.spend, isMeta: true })) ?? []),
                        ...(f.googleAdsTrusted ? [{ name: 'Google Ads', spend: f.googleAdsSpend, isMeta: false }] : []),
                      ]}
                    />
                  </section>
                ),
              },
            ]}
          />
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 12 }}>
            <HoverBreakdownCard
              icon={<DollarSign size={13} color="var(--admin-text-muted)" />}
              label="Receita Aprovada"
              value={brl(f.revenue)}
              rows={[{ label: 'Pedidos pagos', value: int(d.cur.paid) }]}
            />
            <HoverBreakdownCard
              icon={<Package size={13} color="var(--admin-text-muted)" />}
              label="Custos Operacionais"
              value={brl(f.productCost + f.freightCost + f.logisticsCost)}
              rows={[
                { label: 'Custo de Produto', value: brl(f.productCost) },
                { label: 'Frete pago pela loja', value: brl(f.freightCost - f.freightPassThrough) },
                { label: 'Frete repassado (pago pelo cliente)', value: brl(f.freightPassThrough) },
                { label: 'Logística (por pedido)', value: brl(f.logisticsCost) },
              ]}
              footerLabel="Produtos / Receita"
              footerValue={f.revenue > 0 ? pct(f.productCost / f.revenue, 2) : '—'}
            />
            <HoverBreakdownCard
              icon={<Receipt size={13} color="var(--admin-text-muted)" />}
              label="Taxas e Impostos"
              value={brl(f.gatewayFee + f.yampiFee + f.yampiMonthly + f.mediaTax)}
              rows={[
                { label: 'Gateway (AppMax)', value: brl(f.gatewayFee) },
                { label: 'Checkout (Yampi)', value: brl(f.yampiFee) },
                { label: 'Mensalidade (Yampi)', value: brl(f.yampiMonthly) },
                { label: 'Tributo 13,8% s/ mídia', value: brl(f.mediaTax) },
              ]}
              footerLabel="Taxas / Receita"
              footerValue={f.revenue > 0 ? pct((f.gatewayFee + f.yampiFee + f.yampiMonthly + f.mediaTax) / f.revenue, 2) : '—'}
            />
            <HoverBreakdownCard
              icon={<Megaphone size={13} color="var(--admin-text-muted)" />}
              label="Custo Marketing"
              value={brl(f.metaSpend + f.googleAdsSpend)}
              rows={[
                { label: 'Meta (Facebook/Instagram)', value: f.metaTrusted ? brl(f.metaSpend) : <span style={{ color: 'var(--admin-alert)' }}>parcial</span> },
                { label: 'Google Ads', value: f.googleAdsTrusted ? brl(f.googleAdsSpend) : <span style={{ color: 'var(--admin-alert)' }}>parcial</span> },
              ]}
              footerLabel="Ads / Receita"
              footerValue={f.revenue > 0 ? pct((f.metaSpend + f.googleAdsSpend) / f.revenue, 2) : '—'}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'vendas-detalhe',
      label: 'Vendas por horário, pagamento e aprovação',
      node: (
        <ReorderableRow
          storageKey="vendas-detalhe"
          gridTemplateColumns="2fr 1fr 1fr"
          items={[
            { id: 'vendas-horario', node: <section className="dsh-card" style={{ height: '100%' }}><div className="dsh-card-h"><h2 className="dsh-card-t">Vendas por horário</h2></div><HourlySalesChart data={salesBreakdown.hourly} /></section> },
            { id: 'vendas-pagamento', node: <section className="dsh-card" style={{ height: '100%' }}><div className="dsh-card-h"><h2 className="dsh-card-t">Vendas por pagamento</h2></div><PaymentMethodDonut data={salesBreakdown.byPayment} /></section> },
            { id: 'taxa-aprovacao', node: <section className="dsh-card" style={{ height: '100%' }}><div className="dsh-card-h"><h2 className="dsh-card-t">Taxa de aprovação</h2></div><ApprovalRateRings data={salesBreakdown.approvalByPayment} /></section> },
          ]}
        />
      ),
    },
    { id: 'regional-analysis', label: 'Mapa de vendas por estado', node: <RegionalAnalysis data={salesBreakdown.byState} /> },
  ]

  return (
    <div className="dsh">
      <header className="dsh-top">
        <div className="dsh-top-r1">
          <div className="dsh-ttl">
            <span>Visão geral</span>
            <h1>Dashboard</h1>
          </div>
          <Link href="/admin/saude" className={`dsh-src ${sourcesBad.length ? 'dsh-src-bad' : 'dsh-src-ok'}`} title={sourcesBad.join('; ') || undefined}>
            <i />{sourcesBad.length ? sourcesBad[0] : 'Fontes em dia'}
          </Link>
          <Link href="/admin/alertas" className="dsh-bell" aria-label={`Alertas: ${d.alerts?.length ?? 0} abertos`}>
            <Bell size={16} />
            {(d.alerts?.length ?? 0) > 0 && <em>{d.alerts?.length}</em>}
          </Link>
          <div className="dsh-actions">
            <CeoRefreshButton />
            <CeoSyncButton />
          </div>
        </div>
        <PeriodBar
          compare={d.compare}
          singleDay={d.singleDay}
          anteriorLabel={anteriorLabel}
          note={<><b>{d.curLabel}</b> · comparado com {refLabel}</>}
        />
      </header>

      {/* Informação de contexto, fechada por padrão para não empurrar os números
          para baixo. Alerta de dado incompleto fica fora, sempre visível. */}
      <details className="dsh-info">
        <summary>Sobre este painel <span>· fontes, atualização e comparação</span></summary>
        <div className="dsh-info-body">
          <p className="dsh-desc">Leitura executiva do período: resultado, investimento, eficiência e funil. Clique em um indicador para ver o detalhe; o “?” explica a conta.</p>
          <div className="dsh-meta">
            <span>Fontes: pedidos Yampi, tracking da loja, Meta Ads, Google Ads, custos</span>
            <span>Pedidos {ago(d.freshness.lastOrder)} · Tracking {ago(d.freshness.lastSession)} · Mídia {f.metaTrusted && f.googleAdsTrusted ? 'ao vivo' : `sync ${ago(d.freshness.lastMediaSync)}`}</span>
          </div>
          {d.compareNote && <div className="dsh-banner dsh-banner-info">{d.compareNote}</div>}
        </div>
      </details>

      {d.partialMedia.length > 0 && (
        <div className="dsh-banner">
          <b>Gasto de mídia incompleto.</b> {d.partialMedia.join('; ')}. Investimento, lucro, margem, MER, ROI e custo por pedido aparecem como <b>parciais</b>. <Link className="dsh-link" href="/admin/saude">Ver na Saúde do sistema →</Link>
        </div>
      )}

      <Summary d={d} />

      {groups.map((g, gi) => (
        <details className={`dsh-grp${gi === 0 ? ' dsh-grp-main' : ''}`} key={g.title} open>
          <summary>{g.title}</summary>
          <div className="dsh-kpis">
            {g.items.map(k => <KpiCard key={k.id} k={k} refLabel={refLabel} qs={qs} spark={sparks[k.id]} />)}
          </div>
        </details>
      ))}

      <div className="dsh-g12">
        <Card title="Evolução" help="evolucao" cls="dsh-c8" right={
          <ExportCsvButton
            meta={{ table: 'Evolução', period: csvPeriod, sources: METRICS.evolucao.sources }}
            header={[d.series.hourly ? 'Hora (acumulado)' : 'Dia', 'Receita', 'Pedidos pagos', 'Lucro', 'Mídia', 'Comparação: dia', 'Comparação: receita', 'Comparação: pedidos', 'Comparação: lucro', 'Comparação: mídia']}
            rows={d.series.cur.map((p, i) => {
              const b = d.series.base[i]
              return [p.label, p.revenue, p.paid, p.profit, p.media, b?.label ?? null, b?.revenue ?? null, b?.paid ?? null, b?.profit ?? null, b?.media ?? null]
            })}
          />
        }>
          <EvolutionChart cur={d.series.cur} base={d.series.base} hourly={d.series.hourly} curLabel={d.curLabel} refLabel={refLabel} />
        </Card>
        <Card title="Com e sem o gasto Meta" help="simMeta" cls="dsh-c4">
          <MetaSim d={d} />
        </Card>
        <Card title="Funil de conversão" help="funil" cls="dsh-c6" right={<small style={{ color: 'var(--admin-text-muted)', fontSize: 11 }}>etapa · acumulada</small>}>
          <Funnel d={d} />
        </Card>
        <Card title="Produtos em destaque" help="rank" cls="dsh-c6">
          <ProductRank rows={d.products} unmatchedUnits={d.unmatchedUnits} csvPeriod={csvPeriod} />
        </Card>
        <Card title="Estados com mais vendas" help="estados" cls="dsh-c6" right={
          <ExportCsvButton
            meta={{ table: 'Vendas por estado', period: csvPeriod, sources: METRICS.estados.sources }}
            header={['Estado', 'Receita', 'Pedidos pagos', 'Ticket médio']}
            rows={d.states.map(s => [s.uf, s.revenue, s.paid, s.ticket])}
          />
        }>
          <States d={d} />
        </Card>
        <Card title="Alertas abertos" cls="dsh-c6" right={<Link className="dsh-link" href="/admin/alertas">Ver todos →</Link>}>
          <Alerts d={d} />
        </Card>
      </div>

      <details className="dsh-more">
        <summary>Mais análises</summary>
        <DashboardEditableLayout widgets={more} />
      </details>
    </div>
  )
}
