import type { ComponentType } from 'react'
import { redirect } from 'next/navigation'
import { Sparkles, Wallet, Target, Tag, Percent } from 'lucide-react'
import { isMetaConfigured, META_ACCOUNTS, getMetaAccountCampaigns } from '@/lib/admin/meta-ads'
import { getDateRangeFromSearchParams, type DateRange } from '@/lib/admin/date-range'
import { supabaseSource } from '@/lib/admin/analise-suprema-queries'
import { WINDOWS, hasComparableHistory, recortarJanela, META_FATURAMENTO_MES, type Periodo } from '@/lib/admin/analise-suprema-source'
import {
  detectProductSignals, detectDaySignals, detectCampaignSignals, buildFeed,
  type FeedItem,
} from '@/lib/admin/analise-suprema-insights'
import { AnaliseSupremaTabs } from './_components/analise-suprema-tabs'

// Sem período na URL, a página abre nos últimos 7 dias completos — e redireciona
// para isso, para a barra de período do topo mostrar o mesmo que o conteúdo.
const PERIODO_PADRAO = 'last_7_days'



export default async function AnaliseSupremaPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const sp                = await searchParams
  if (!sp.range && !(sp.from && sp.to)) redirect(`/admin/analise-suprema?range=${PERIODO_PADRAO}`)
  const range: DateRange  = getDateRangeFromSearchParams(sp)
  // Todo o conteúdo do período (KPIs, margem, produtos, canais, funil, ofertas,
  // mídia) segue o filtro do topo. Um dia só também vale ("Ontem", ou um dia
  // escolhido no calendário).
  const periodo: Periodo  = { start: range.start, endExclusive: range.endExclusive }
  const incluiHoje        = range.endExclusive > new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const configured        = isMetaConfigured()

  const accountsData = await Promise.all(
    META_ACCOUNTS.filter(a => a.id).map(async (account) => ({
      accountId:   account.id,
      accountName: account.name,
      campaigns:   configured ? await getMetaAccountCampaigns(account.id, range.start, range.endExclusive) : [],
    })),
  )


  const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  // Dado real do Supabase. Cada janela roda em paralelo; a detecção de sinais
  // acontece aqui no servidor pra não pesar no cliente.
  // Um único bloco paralelo. Antes eram três fases sequenciais e a página
  // esperava a mais lenta de cada uma somando ~3,4s; nada aqui depende do
  // resultado do outro, então não há razão para encadear.
  const [
    produtosPorJanela, produtos, serieDiaria, linhasDoMes, campanhas, margem,
    primeiroDado,
    canais, regioes, funil, clientes, ofertas, devolucoes, mes, midia, financeiro,
    referencias, calendario, vendasPorCampanha,
  ] = await Promise.all([
    // Feed de prioridades: janelas fixas de 1 a 60 dias, com botões próprios.
    Promise.all(WINDOWS.map(w => supabaseSource.getProductStats(w).catch(() => []))),
    supabaseSource.getProductStats(periodo).catch(() => []),
    // Uma consulta cobre as seis janelas: elas são recortes da mesma série.
    supabaseSource.getDaySeries().catch(() => []),
    supabaseSource.getMonthlyDailyRows().catch(() => []),
    supabaseSource.getCampaignSeries(30).catch(() => []),
    supabaseSource.getMarginBreakdown(periodo).catch(() => ({
      revenue: 0, cogs: 0, fees: 0, shipping: 0, logistics: 0, marketing: 0,
      netProfit: 0, coveragePct: 0, itemsWithoutCost: 0, itemsTotal: 0, cogsEstimado: 0,
    })),
    supabaseSource.getFirstDataDate().catch(() => null),
    supabaseSource.getChannelBreakdown(periodo).catch(() => ({
      channels: [], attributedRevenue: 0, unattributedRevenue: 0, coveragePct: 0,
    })),
    supabaseSource.getRegionBreakdown(periodo).catch(() => []),
    supabaseSource.getFunnel(periodo).catch(() => ({
      steps: [], sessions: 0, orders: 0, revenue: 0,
      conversionRate: 0, aov: 0, bottleneck: null, countedBy: 'event' as const,
    })),
    supabaseSource.getCustomerStats().catch(() => ({
      totalCustomers: 0, repeatCustomers: 0, repeatRatePct: 0, avgLtv: 0,
      avgOrdersPerCustomer: 0, revenueFromRepeat: 0, revenueFromSingle: 0, atRisk: [],
    })),
    supabaseSource.getOfferComparison(periodo).catch(() => []),
    supabaseSource.getReturnsCost(periodo).catch(() => ({
      naoPagos: { orders: 0, value: 0 },
      estornosMes: { mes: '', valor: null, receitaBruta: 0 },
    })),
    supabaseSource.getMonthRevenue().catch(() => ({ revenue: 0, dayOfMonth: 0, daysInMonth: 30 })),
    supabaseSource.getMidiaRange(periodo).catch(() => ({
      spend: 0, attributedRevenue: 0, unattributedRevenue: 0,
      attributedOrders: 0, unattributedOrders: 0,
      roasMin: 0, roasMax: 0, cpaMin: 0, cpaMax: 0,
      declaredRoas: null, declaredCpa: null,
    })),
    supabaseSource.getFinancial(periodo).catch(() => ({
      revenue: 0, productCost: 0, freightCost: 0, freightPassThrough: 0, logisticsCost: 0, gatewayFee: 0, yampiFee: 0,
      yampiMonthly: 0, mediaTax: 0, salesTax: 0, salesTaxConfigured: false,
      metaSpend: 0, googleAdsSpend: 0,
      netProfit: 0, margin: 0, metaTrusted: false, googleAdsTrusted: false,
      missingCostSources: ['falha ao carregar'],
    })),
    supabaseSource.getReferencias().catch(() => null),
    supabaseSource.getCalendario().catch(() => null),
    // Vendas reais por campanha no MESMO período das abas de campanha (filtro da página).
    supabaseSource.getVendasPorCampanha(range.startISO, range.endISO).catch(() => ({})),
  ])

  const agora = new Date()

  const feedPorJanela: Record<number, FeedItem[]> = {}
  WINDOWS.forEach((w, i) => {
    // Janela sem lastro (ex.: 60 dias com ~50 de histórico) não emite sinal de
    // variação — a janela de comparação estaria vazia e o percentual seria
    // artefato, não sinal.
    const comLastro = primeiroDado ? hasComparableHistory(w, agora, primeiroDado) : true
    feedPorJanela[w] = buildFeed([
      ...detectProductSignals(produtosPorJanela[i], w, { hasComparableHistory: comLastro }),
      ...detectDaySignals(recortarJanela(serieDiaria, w, agora), w),
      ...detectCampaignSignals(campanhas, w),
    ])
  })

  // Sinais só de campanha, para a aba Supremo. Janela de 30 dias: a detecção de
  // retorno decrescente precisa de pelo menos 9 dias ativos por campanha.
  const sinaisCampanha = buildFeed(detectCampaignSignals(campanhas, 30))


  return (
    <div className="as-root" style={{ background: 'var(--admin-bg)', minHeight: '100%' }}>
      <style>{`
        /* Mobile-first: nenhuma seção pode exigir scroll horizontal em 375px. */
        .as-root { padding: 24px 28px 48px; max-width: 1440px; margin: 0 auto; min-width: 0; --admin-text-muted: var(--admin-text-sec); }
        .as-root *, .as-root *::before, .as-root *::after { box-sizing: border-box; }
        .as-root section, .as-root article { min-width: 0; }
        .as-root button, .as-root a { touch-action: manipulation; }
        .as-root button:focus-visible, .as-root a:focus-visible { outline: 2px solid var(--admin-accent); outline-offset: 3px; }
        .as-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
        .as-card-head { flex-wrap: wrap; }
        .as-card-action { min-width: 0; max-width: 100%; }
        .as-day-row, .as-stage { min-width: 0; }
        @media (max-width: 1050px) { .as-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 767px) {
          .as-kpis { grid-template-columns: 1fr; }
          .as-stage { flex-wrap: wrap; }
          .as-stage > div:last-child { width: 100%; justify-content: space-between; }
          .as-signal { flex-direction: column; }
          .as-signal > div:last-child { text-align: left !important; white-space: normal !important; }
          .as-root .as-card-span { grid-column: auto !important; }
          .as-weekdays { gap: 6px !important; }
          .as-month-spend { display: none; }
        }
        .as-table { display: table; }
        .as-cards { display: none; }
        @media (max-width: 1199px) {
          .as-table { display: none !important; }
          .as-cards { display: flex !important; }
        }
        @media (max-width: 767px) {
          .as-root  { padding: var(--sp-5) var(--sp-4); }
          .as-table { display: none !important; }
          .as-cards { display: flex !important; }
        }
        /* Animação só via transform/opacity — compostas na GPU, sem reflow. */
        @keyframes as-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .as-anim { animation: as-fade-in .22s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .as-anim { animation: none !important; transition: none !important; }
        }
      `}</style>
      {/* Cabeçalho editorial: título com respiro, subtítulo em medida de leitura
          confortável. O ícone perdeu o gradiente — um acento chapado pesa menos
          e não compete com os números, que são o assunto da página. */}
      <header style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: 'var(--r-md)',
            background: 'var(--admin-accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Sparkles size={18} color="var(--admin-accent)" />
          </div>
          <h1 style={{
            fontSize: 'var(--fs-xl)', fontWeight: 650, letterSpacing: '-0.025em',
            color: 'var(--admin-text-main)', margin: 0, lineHeight: 'var(--lh-tight)',
          }}>Análise Suprema</h1>
        </div>
        <p style={{
          fontSize: 'var(--fs-md)', color: 'var(--admin-text-sec)',
          margin: 0, maxWidth: '64ch', lineHeight: 'var(--lh-normal)',
        }}>
          Lucro, tráfego e conversão. Da leitura diária à próxima decisão.
        </p>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '16px', fontSize: 'var(--fs-xs)', color: 'var(--admin-text-sec)' }}>
        <span style={{ padding: '6px 10px', borderRadius: '999px', background: 'var(--admin-accent-soft)', color: 'var(--admin-accent)', fontWeight: 600 }}>Período · {range.label}{incluiHoje ? ' (hoje ainda parcial)' : ''}</span>
        <span>Mude o período na barra do topo — vale para toda a página, exceto Visão Diária, Calendário e o feed de prioridades.</span>
        <span>• Leitura gerada {agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div className="as-kpis">
        <KpiCard icon={Wallet} tint="green" label="Lucro líquido" value={fmtBrl.format(financeiro.netProfit)} sub={financeiro.missingCostSources.length > 0 ? 'Parcial · custos pendentes' : 'Após produto, frete, taxas e mídia'} warn={financeiro.netProfit < 0} />
        <KpiCard icon={Percent} tint="green" label="Margem líquida" value={`${(financeiro.margin * 100).toFixed(1)}%`} sub="Sobre a receita paga · mesma conta do Dashboard" warn={financeiro.margin < 0} />
        <KpiCard icon={Tag} tint="purple" label="Receita paga" value={fmtBrl.format(financeiro.revenue)} sub={range.label} />
        <KpiCard icon={Target} tint="blue" label="Investimento em mídia" value={fmtBrl.format(financeiro.metaSpend + financeiro.mediaTax + financeiro.googleAdsSpend)} sub={`Meta + tributo de 13,8% (${fmtBrl.format(financeiro.mediaTax)}) + Google`} />
      </div>
      {financeiro.missingCostSources.length > 0 && (
        <div role="status" style={{ padding: '12px 16px', marginBottom: '16px', borderRadius: 'var(--r-md)', background: 'var(--admin-alert-soft)', color: 'var(--admin-alert)', fontSize: 'var(--fs-sm)' }}>
          <strong>Lucro parcial.</strong> Custos pendentes: {financeiro.missingCostSources.join(', ')}. Confira as lacunas antes de decidir escala.
        </div>
      )}

      <AnaliseSupremaTabs
        configured={configured}
        accountsData={accountsData}
        rangeLabel={range.label}
        feedPorJanela={feedPorJanela}
        produtos={produtos}
        margem={margem}
        periodoLabel={range.label}
        canais={canais}
        regioes={regioes}
        funil={funil}
        linhasDoMes={linhasDoMes}
        sinaisCampanha={sinaisCampanha}
        clientes={clientes}
        ofertas={ofertas}
        devolucoes={devolucoes}
        mes={mes}
        metaMes={META_FATURAMENTO_MES}
        midia={midia}
        financeiro={financeiro}
        referencias={referencias}
        calendario={calendario}
        vendasPorCampanha={vendasPorCampanha}
      />
    </div>
  )
}

const TINTS = {
  blue:   { bg: 'var(--admin-info-soft)', fg: 'var(--admin-info)' },
  green:  { bg: 'var(--admin-green-soft)', fg: 'var(--admin-green)' },
  purple: { bg: 'var(--admin-accent-soft)', fg: 'var(--admin-accent)' },
  red:    { bg: 'var(--admin-red-soft)', fg: 'var(--admin-red)' },
} as const

function KpiCard({ icon: Icon, tint, label, value, sub, warn }: {
  icon: ComponentType<{ size?: number; color?: string }>
  tint: keyof typeof TINTS
  label: string; value: string; sub?: string; warn?: boolean
}) {
  const t = TINTS[tint]
  return (
    <div style={{
      background: 'var(--admin-card)', border: `1px solid ${warn ? 'rgba(239,68,68,0.3)' : 'var(--admin-border)'}`,
      position: 'relative', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    }}>
      <div style={{
        position: 'absolute', top: '12px', right: '12px', width: '26px', height: '26px', borderRadius: 'var(--r-md)', background: t.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} color={t.fg} />
      </div>
      <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, paddingRight: '30px', color: 'var(--admin-text-sec)', marginBottom: 'var(--sp-2)' }}>{label}</div>
      <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: warn ? 'var(--admin-red)' : tint === 'green' ? 'var(--admin-green)' : 'var(--admin-text-main)' }}>{value}</div>
      {sub && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)', marginTop: 'var(--sp-1)' }}>{sub}</div>}
    </div>
  )
}
