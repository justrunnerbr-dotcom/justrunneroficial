'use client'

import { useState, useMemo, useEffect } from 'react'
import { CalendarDays, Sparkles, Filter, AlertTriangle, TrendingUp, TrendingDown, Flame, Snowflake, Table2, Gauge, Package, LayoutDashboard, Radio, Tags } from 'lucide-react'
import type { MetaCampaignDetail } from '@/lib/admin/meta-ads'
import {
  FATOR_TRIBUTO_META, normalizarCampanha,
  type DailyRow, type Referencias, type Calendario, type VendasPorCampanha,
} from '@/lib/admin/analise-suprema-source'
import { DivergingBarChart, SequentialLineChart } from './charts'
import { Card, DeltaBadge, NotConfiguredBanner, MiniStat, StatRow, AlertCard, Callout, ResponsiveTable, fmtBrl } from './shared'
import { ResumoTab } from './tab-resumo'
import { ProdutosTab } from './tab-produtos'
import { CanaisTab } from './tab-canais'
import { OfertasTab } from './tab-ofertas'
import type { FeedItem } from '@/lib/admin/analise-suprema-insights'
import type { ProductStat, MarginBreakdown, RegionStat } from '@/lib/admin/analise-suprema-source'
import type { ChannelBreakdown } from '@/lib/admin/analise-suprema-canais'

type AccountCampaigns = { accountName: string; accountId: string; campaigns: MetaCampaignDetail[] }

interface Props {
  configured: boolean
  accountsData: AccountCampaigns[]
  rangeLabel: string
  feedPorJanela: Record<number, FeedItem[]>
  produtos: ProductStat[]
  margem: MarginBreakdown
  /** Nome do período escolhido no filtro do topo. */
  periodoLabel: string
  canais: ChannelBreakdown
  regioes: RegionStat[]
  midia: import('@/lib/admin/analise-suprema-midia').MidiaRange
  financeiro: import('@/lib/admin/financial-breakdown').FinancialBreakdown
  ofertas: import('@/lib/admin/analise-suprema-ofertas').OfertaStat[]
  devolucoes: import('@/lib/admin/analise-suprema-source').ReturnsCost
  mes: { revenue: number; dayOfMonth: number; daysInMonth: number }
  metaMes: number
  funil: import('@/lib/admin/analise-suprema-funil').FunnelWindow
  clientes: import('@/lib/admin/analise-suprema-clientes').CustomerStats
  /** Mês corrente dia a dia, pela conta oficial do Dashboard. */
  linhasDoMes: DailyRow[]
  /** Sinais de campanha já detectados no servidor, para a aba Supremo. */
  sinaisCampanha: FeedItem[]
  /** CPA de equilíbrio e de escala do último mês fechado (Fechamento do Mês). */
  referencias: Referencias | null
  /** Dias da semana, dias 5/20 e meses, calculados ao vivo. */
  calendario: Calendario | null
  /** Pedidos pagos com a UTM de cada campanha, no período do filtro. */
  vendasPorCampanha: VendasPorCampanha
}

const TABS = [
  { id: 'resumo',     label: 'Resumo',                     icon: LayoutDashboard },
  { id: 'diaria',     label: 'Visão Diária',               icon: Table2 },
  { id: 'produtos',   label: 'Produtos',                   icon: Package },
  { id: 'canais',     label: 'Canais & Região',            icon: Radio },
  { id: 'ofertas',    label: 'Ofertas & Devolução',        icon: Tags },
  { id: 'supremo',    label: 'Supremo',                    icon: Gauge },
  { id: 'calendario', label: 'Calendário & Sazonalidade', icon: CalendarDays },
  { id: 'funil',      label: 'Funil TOFU/MOFU/BOFU',      icon: Filter },
  { id: 'criativos',  label: 'Saúde do Criativo',          icon: Sparkles },
  { id: 'alertas',    label: 'Alertas & Recomendações',    icon: AlertTriangle },
] as const

const MODULE_GROUPS = [
  { label: 'Decisão do dia', ids: ['resumo', 'diaria', 'alertas'] },
  { label: 'Diagnóstico', ids: ['funil', 'produtos', 'canais', 'criativos', 'ofertas'] },
  { label: 'Planejamento', ids: ['supremo', 'calendario'] },
] as const

type TabId = typeof TABS[number]['id']

const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const nomeMes = (mes: string) => mes ? `${MESES_LONGOS[Number(mes.slice(5, 7)) - 1]}/${mes.slice(0, 4)}` : '—'

/** Vendas reais da campanha (pedido pago com a UTM dela) e CPA real com o tributo. */
function realDaCampanha(c: MetaCampaignDetail, vendas: VendasPorCampanha) {
  const v = vendas[normalizarCampanha(c.name)]
  const pedidos = v?.pedidos ?? 0
  const custo = c.spend * FATOR_TRIBUTO_META
  return { pedidos, receita: v?.receita ?? 0, custo, cpa: pedidos > 0 ? custo / pedidos : null }
}

export function AnaliseSupremaTabs({ configured, accountsData, rangeLabel, feedPorJanela, produtos, margem, periodoLabel, canais, regioes, funil, clientes, ofertas, devolucoes, mes, metaMes, midia, financeiro, linhasDoMes, sinaisCampanha, referencias, calendario, vendasPorCampanha }: Props) {
  const [tab, setTab] = useState<TabId>('resumo')
  useEffect(() => {
    const sync = () => setTab(TABS.find(t => t.id === window.location.hash.slice(1))?.id ?? 'resumo')
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  const currentTab = TABS.find(t => t.id === tab)!

  return (
    <div>
      <style>{`
        .as-module-nav { display: grid; grid-template-columns: 1fr 1.6fr 1fr; gap: 16px; margin-bottom: var(--sp-5); padding: 16px; border: 1px solid var(--admin-border); border-radius: var(--r-md); background: var(--admin-card); }
        .as-module-group { min-width: 0; }
        .as-module-group-label { margin: 0 0 8px; color: var(--admin-text-muted); font-size: var(--fs-xs); font-weight: 650; }
        .as-module-group-links { display: flex; flex-wrap: wrap; gap: 6px; }
        .as-module-link { display: flex; align-items: center; gap: 7px; min-width: 0; min-height: 40px; padding: 8px 10px; border-radius: var(--r-md); text-decoration: none; }
        .as-module-link:hover { border-color: var(--admin-accent) !important; }
        .as-module-link:focus-visible { outline: 2px solid var(--admin-accent); outline-offset: 3px; }
        @media (max-width: 900px) { .as-module-nav { grid-template-columns: 1fr; gap: 12px; padding: 12px; } }
      `}</style>
      <nav className="as-module-nav" aria-label="Módulos da Análise Suprema">
        {MODULE_GROUPS.map(group => (
          <div className="as-module-group" key={group.label}>
            <p className="as-module-group-label">{group.label}</p>
            <div className="as-module-group-links">
              {group.ids.map(id => {
                const t = TABS.find(item => item.id === id)!
                const active = t.id === tab
                const Icon = t.icon
                return (
                  <a key={t.id} href={`#${t.id}`} onClick={() => setTab(t.id)} aria-current={active ? 'page' : undefined} aria-controls="as-module-content" className="as-module-link"
                    style={{ fontSize: 'var(--fs-sm)', fontWeight: active ? 650 : 500, color: active ? 'var(--admin-accent)' : 'var(--admin-text-sec)', background: active ? 'var(--admin-accent-soft)' : 'transparent', border: `1px solid ${active ? 'var(--admin-accent)' : 'var(--admin-border)'}` }}>
                    <Icon size={16} style={{ flexShrink: 0 }} />
                    <span style={{ minWidth: 0, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{t.label}</span>
                  </a>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: 'var(--sp-4)' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--fs-lg)', color: 'var(--admin-text-main)', fontWeight: 650 }}>{currentTab.label}</h2>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)' }}>{String(TABS.findIndex(t => t.id === tab) + 1).padStart(2, '0')} / 10</span>
      </div>
      <p style={{ margin: '0 0 16px', color: 'var(--admin-text-sec)', fontSize: 'var(--fs-sm)' }}>
        {({
          resumo: `Conta financeira e conversão · ${periodoLabel}. O feed de prioridades tem as próprias janelas.`,
          diaria: 'Resultado dia a dia do mês corrente, na mesma conta do Dashboard. Hoje ainda é parcial.',
          produtos: `Receita, demanda e margem por produto · ${periodoLabel}.`,
          canais: `Atribuição de receita e distribuição por estado · ${periodoLabel}.`,
          ofertas: `Ofertas e pedidos não pagos · ${periodoLabel}. Meta e projeção do mês corrente.`,
          supremo: `Projeção mensal, margem do período (${periodoLabel}) e sinais de campanha de 30 dias.`,
          calendario: 'Dias da semana e dias 5/20 nos últimos 90 dias; meses pela receita real ÷ mídia com tributo.',
          funil: `Funil das campanhas · ${rangeLabel}. Compras e CPA pelos pedidos pagos reais (UTM da campanha).`,
          criativos: `Diagnóstico de campanhas · ${rangeLabel}, com CPA real.`,
          alertas: `Sinais de campanha · ${rangeLabel}, com CPA real e referências do último mês fechado.`,
        })[tab]}
      </p>
      <div id="as-module-content" key={tab} className="as-anim" role="region" aria-label={currentTab.label}>
      {tab === 'resumo' && <ResumoTab feedPorJanela={feedPorJanela} margem={margem} periodoLabel={periodoLabel} funil={funil} clientes={clientes} financeiro={financeiro} />}
      {tab === 'produtos' && <ProdutosTab stats={produtos} totalFees={margem.fees} />}
      {tab === 'canais' && <CanaisTab canais={canais} regioes={regioes} midia={midia} referencias={referencias} />}
      {tab === 'ofertas' && <OfertasTab periodoLabel={periodoLabel} ofertas={ofertas} devolucoes={devolucoes} receitaMes={mes.revenue} metaMes={metaMes} diaDoMes={mes.dayOfMonth} diasNoMes={mes.daysInMonth} />}
      {tab === 'diaria' && <DiariaTab rows={linhasDoMes} missingCostSources={financeiro.missingCostSources} referencias={referencias} />}
      {tab === 'supremo' && <SupremoTab periodoLabel={periodoLabel} mes={mes} margem={margem} devolucoes={devolucoes} financeiro={financeiro} produtos={produtos} sinaisCampanha={sinaisCampanha} />}
      {tab === 'calendario' && <CalendarioTab calendario={calendario} />}
      {tab === 'funil' && <FunilTab configured={configured} accountsData={accountsData} rangeLabel={rangeLabel} vendas={vendasPorCampanha} referencias={referencias} />}
      {tab === 'criativos' && <CriativosTab configured={configured} accountsData={accountsData} rangeLabel={rangeLabel} vendas={vendasPorCampanha} referencias={referencias} />}
      {tab === 'alertas' && <AlertasTab configured={configured} accountsData={accountsData} vendas={vendasPorCampanha} referencias={referencias} calendario={calendario} />}
      </div>
    </div>
  )
}

/** Texto curto da origem das referências, mostrado onde elas são usadas. */
function origemReferencias(r: Referencias | null): string {
  if (!r || r.cpaEquilibrio === null) return 'Sem referência: o último mês fechado não tem dados suficientes.'
  return `Referências de ${nomeMes(r.mes)} (Fechamento do Mês): equilíbrio ${fmtBrl.format(r.cpaEquilibrio)}${r.cpaEscala !== null ? `, escala ${fmtBrl.format(r.cpaEscala)}` : ''} por pedido, com o tributo do Meta${r.comFixos ? '' : '; sem custos fixos lançados, o equilíbrio é o marginal'}${r.estimado ? '; parte das linhas ainda é sugestão do sistema' : ''}.`
}

// ───────────────────────── Tab: Visão Diária ─────────────────────────

function DiariaTab({ rows, missingCostSources, referencias }: { rows: DailyRow[]; missingCostSources: string[]; referencias: Referencias | null }) {
  const past = rows.filter(r => !r.isFuture)

  const totalLucro = past.reduce((s, r) => s + r.lucro, 0)
  const totalInvest = past.reduce((s, r) => s + r.investimento, 0)
  const totalVendas = past.reduce((s, r) => s + r.vendas, 0)
  const totalReceita = past.reduce((s, r) => s + r.receita, 0)
  const merMes = totalInvest > 0 ? totalReceita / totalInvest : 0
  const comBase = past.filter(r => r.investimento > 0 && !r.isToday)
  const acimaCount = comBase.filter(r => r.vsHistorico.status === 'acima').length

  const linhas = [
    referencias?.merEquilibrio != null && { value: referencias.merEquilibrio, label: `Equilíbrio ${referencias.merEquilibrio.toFixed(2)}x`, color: 'var(--admin-alert)' },
    referencias?.merEscala != null && { value: referencias.merEscala, label: `Escala ${referencias.merEscala.toFixed(2)}x`, color: 'var(--admin-accent)' },
  ].filter(Boolean) as { value: number; label: string; color: string }[]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <Callout tone={missingCostSources.length ? 'warn' : 'info'}>
        <strong>{missingCostSources.length ? 'Leitura parcial.' : 'Resultado do mês.'}</strong>{' '}
        {missingCostSources.length > 0 && <>Fontes de custo pendentes: {missingCostSources.join(', ')}. Lucro e MER podem estar superestimados. </>}
        Mesma conta do Dashboard: receita menos produto, frete (grátis e repassado), logística, taxas e mídia com o tributo de 13,8% do Meta. A mensalidade da Yampi entra só no fechamento do mês.
      </Callout>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 'var(--sp-4)' }}>
        <MiniStat label="Lucro no mês (até hoje)" value={fmtBrl.format(totalLucro)} sub={`${past.length} dias computados`} color="var(--admin-accent)" emphasis />
        <MiniStat label="Investido no mês" value={fmtBrl.format(totalInvest)} sub={`com tributo do Meta · ${totalVendas} vendas`} color="var(--admin-info)" />
        <MiniStat label="MER do mês" value={`${merMes.toFixed(2)}x`} sub="Receita ÷ mídia com tributo" color="var(--admin-accent)" />
        <MiniStat label="Dias acima do normal" value={`${acimaCount} de ${comBase.length}`} sub="Vs. mesmo dia da semana nas 8 semanas anteriores" color={acimaCount >= comBase.length / 2 ? 'var(--admin-accent)' : 'var(--admin-red)'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 'var(--sp-4)' }}>
        <Card title="Lucro diário do mês" desc="Verde = dia com lucro, vermelho = dia no prejuízo. Toque ou passe o mouse para consultar os valores.">
          <DivergingBarChart
            data={past.map(r => ({ label: `${String(r.day).padStart(2, '0')}/${r.weekday}`, value: r.lucro, isToday: r.isToday }))}
            formatValue={(v) => fmtBrl.format(v)}
          />
        </Card>
        <Card title="MER diário do mês" desc={linhas.length ? origemReferencias(referencias) : 'Sem referência de equilíbrio: o último mês fechado não tem dados suficientes.'}>
          <SequentialLineChart
            data={past.map(r => ({ label: `${String(r.day).padStart(2, '0')}/${r.weekday}`, value: r.roas }))}
            thresholds={linhas}
            formatValue={(v) => `${v.toFixed(2)}x`}
          />
        </Card>
      </div>

      <Card title="Dia a dia do mês" desc="Cada linha compara o MER do dia com a média do mesmo dia da semana nas 8 semanas anteriores ao mês.">
        <ResponsiveTable<DailyRow>
          rows={past} rowKey={r => r.date} emptyLabel="Nenhum dia disponível neste mês."
          columns={[
            { key: 'dia', header: 'Dia', primary: true, render: r => <span>{String(r.day).padStart(2, '0')} · {r.weekday}{r.isToday ? ' · Hoje (parcial)' : ''}</span> },
            { key: 'lucro', header: 'Lucro', align: 'right', render: r => <strong style={{ color: r.lucro < 0 ? 'var(--admin-red)' : 'var(--admin-green)' }}>{fmtBrl.format(r.lucro)}</strong> },
            { key: 'invest', header: 'Investido', align: 'right', render: r => fmtBrl.format(r.investimento) },
            { key: 'roas', header: 'MER', align: 'right', render: r => r.investimento > 0 ? `${r.roas.toFixed(2)}x` : '—' },
            { key: 'ticket', header: 'Ticket', align: 'right', render: r => r.vendas > 0 ? fmtBrl.format(r.ticketMedio) : '—' },
            { key: 'vendas', header: 'Vendas', align: 'right', render: r => r.vendas },
            { key: 'historico', header: 'Vs. normal', align: 'right', render: r => r.investimento > 0 ? <DeltaBadge status={r.vsHistorico.status} pct={r.vsHistorico.pct} /> : '—' },
          ]}
        />
      </Card>
    </div>
  )
}

// ───────────────────────── Tab: Supremo ─────────────────────────

type SupremoProps = {
  periodoLabel: string
  mes: { revenue: number; dayOfMonth: number; daysInMonth: number }
  margem: MarginBreakdown
  devolucoes: import('@/lib/admin/analise-suprema-source').ReturnsCost
  financeiro: import('@/lib/admin/financial-breakdown').FinancialBreakdown
  produtos: ProductStat[]
  sinaisCampanha: FeedItem[]
}

function SupremoTab({ periodoLabel, mes, margem, devolucoes, financeiro, produtos, sinaisCampanha }: SupremoProps) {
  // Mesma projeção da aba Ofertas: média dos dias COMPLETOS do mês × dias do mês.
  const projecao = mes.dayOfMonth > 0 ? (mes.revenue / mes.dayOfMonth) * mes.daysInMonth : null

  // Margem bruta = receita menos custo de produto, sobre os pedidos e custos do Dashboard.
  const brutaPct = margem.revenue > 0 ? ((margem.revenue - margem.cogs) / margem.revenue) * 100 : 0
  const liquidaPct = financeiro.margin * 100
  const est = devolucoes.estornosMes
  const estornoPp = est.valor !== null && est.receitaBruta > 0 ? (est.valor / est.receitaBruta) * 100 : null

  // Produtos que mais corroem margem: menor margem unitária. Só entra quem tem custo.
  const sugadores = useMemo(() => produtos
    .flatMap(p => {
      const custo = p.unitCost
      if (custo === null || custo <= 0 || p.units <= 0 || p.revenue <= 0) return []
      const receitaUnit = p.revenue / p.units
      if (receitaUnit <= 0) return []
      return [{
        key: p.key, title: p.title, units: p.units, revenue: p.revenue, unitCost: custo,
        costIsEstimate: p.costIsEstimate,
        marginPct: ((receitaUnit - custo) / receitaUnit) * 100,
        lucroPeriodo: (receitaUnit - custo) * p.units,
      }]
    })
    .sort((a, b) => a.marginPct - b.marginPct)
    .slice(0, 5), [produtos])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <Callout tone="info">
        <strong style={{ color: 'var(--admin-info)' }}>Leitura financeira.</strong> Margem e lucro vêm da conta oficial do admin
        (a mesma do Dashboard); os alertas de campanha vêm do detector que roda sobre a Meta sincronizada; os produtos usam o
        custo cadastrado oficial, com estimativa identificada quando não há cadastro.
        {margem.coveragePct < 100 && (
          <> Cobertura de custo: {margem.coveragePct.toFixed(1)}% dos itens.</>
        )}
      </Callout>

      <Card
        title={`Run Rate — projeção de fechamento (${mes.dayOfMonth}/${mes.daysInMonth} dias completos)`}
        desc="Média diária dos dias completos do mês × dias do mês. Hoje fica de fora por estar pela metade."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 'var(--sp-4)' }}>
          <MiniStat label="Receita até ontem" value={fmtBrl.format(mes.revenue)} sub={`${mes.dayOfMonth} dias completos`} color="var(--admin-info)" />
          <MiniStat label="Projeção do mês" value={projecao !== null ? fmtBrl.format(projecao) : '—'} sub={projecao !== null ? 'Run rate linear' : 'Primeiro dia do mês: ainda sem dia completo'} color="var(--admin-accent)" />
          <MiniStat label="Comparação mensal" value="—" sub="Veja os meses fechados em Calendário & Sazonalidade" color="var(--admin-text-muted)" />
        </div>
      </Card>

      <Card title="Margem real" desc="Bruta (receita − custo de produto) e líquida pela conta oficial do admin. Estornos pelo extrato da AppMax do último mês fechado.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 'var(--sp-4)' }}>
          <MiniStat label="Margem bruta" value={`${brutaPct.toFixed(1)}%`} sub={`Só custo de produto · ${periodoLabel}`} color="var(--admin-text-muted)" />
          <MiniStat
            label={`Estornos (${nomeMes(est.mes)})`}
            value={estornoPp !== null ? `${estornoPp.toFixed(1)}pp` : '—'}
            sub={est.valor !== null ? `${fmtBrl.format(est.valor)} pelo extrato AppMax` : 'Lance os estornos no Fechamento do Mês'}
            color="var(--admin-red)"
          />
          <MiniStat label="Margem líquida" value={`${liquidaPct.toFixed(1)}%`} sub={`Depois de tudo, inclusive mídia · ${periodoLabel}`} color={liquidaPct >= 0 ? 'var(--admin-accent)' : 'var(--admin-red)'} emphasis />
          <MiniStat label="Lucro líquido" value={fmtBrl.format(financeiro.netProfit)} sub={financeiro.missingCostSources.length > 0 ? 'parcial — falta fonte de custo' : periodoLabel} color={financeiro.netProfit >= 0 ? 'var(--admin-accent)' : 'var(--admin-red)'} />
        </div>
      </Card>

      <Card title="Alertas de campanha" desc="Sinais sobre a tendência da Meta sincronizada: queda de retorno e retorno decrescente na escala. A tendência é confiável mesmo com o retorno declarado pela Meta inflado, porque o viés se repete todos os dias.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {sinaisCampanha.length === 0 && (
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--admin-text-muted)', padding: '8px 0' }}>
              Nenhum sinal de campanha no período. Silêncio aqui significa que nenhuma campanha bateu os limiares —
              o painel de Saúde mostra se o sync da Meta está em dia.
            </div>
          )}
          {sinaisCampanha.map((s, i) => (
            <div className="as-signal" key={`${s.kind}-${s.subject}-${i}`} style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--sp-4)',
              background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
              borderLeft: `3px solid ${s.severity === 'crit' ? 'var(--admin-red)' : 'var(--admin-alert)'}`,
              borderRadius: 'var(--r-md)', padding: '12px 16px',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 650, color: 'var(--admin-text-main)' }}>{s.subject}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-sec)', marginTop: 'var(--sp-1)', lineHeight: 'var(--lh-normal)' }}>{s.narrative.body}</div>
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, fontFamily: 'monospace', color: s.severity === 'crit' ? 'var(--admin-red)' : 'var(--admin-alert)' }}>
                  {s.narrative.headline}
                </div>
                {s.narrative.actionHint && (
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)', marginTop: 'var(--sp-1)' }}>{s.narrative.actionHint}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Produtos com pior margem" desc="Margem por unidade, sobre o preço realmente pago e o custo cadastrado oficial. Custos estimados estão identificados. Produto sem custo fica de fora.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {sugadores.length === 0 && (
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--admin-text-muted)', padding: '8px 0' }}>
              Nenhum produto com custo cadastrado e venda no período.
            </div>
          )}
          {sugadores.map((p) => (
            <div key={p.key} style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: 'var(--r-md)', padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 650, color: 'var(--admin-text-main)' }}>{p.title}</div>
                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: p.marginPct < 20 ? 'var(--admin-red)' : 'var(--admin-alert)', whiteSpace: 'nowrap' }}>
                  margem {p.marginPct.toFixed(1)}%
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-4)', fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)', flexWrap: 'wrap' }}>
                <span>Vendidos: {p.units}</span>
                <span>Receita: {fmtBrl.format(p.revenue)}</span>
                <span>Custo/un: {fmtBrl.format(p.unitCost)}</span>
                <span>Lucro no período: {fmtBrl.format(p.lucroPeriodo)}</span>
                {p.costIsEstimate && <span style={{ color: 'var(--admin-alert)' }}>custo estimado</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ───────────────────────── Tab: Calendário ─────────────────────────

function CalendarioTab({ calendario }: { calendario: Calendario | null }) {
  if (!calendario) {
    return <Callout tone="warn">Não foi possível calcular o calendário agora. Tente recarregar a página.</Callout>
  }
  const dias = calendario.diasDaSemana.filter(d => d.mer !== null)
  const maxMer = Math.max(0.0001, ...dias.map(d => d.mer ?? 0))
  const melhor = [...dias].sort((a, b) => (b.mer ?? 0) - (a.mer ?? 0))[0]
  const pior = [...dias].sort((a, b) => (a.mer ?? 0) - (b.mer ?? 0))[0]
  const pg = calendario.pagamento
  const meses = calendario.meses.filter(m => m.mer !== null)
  const maxMesMer = Math.max(0.0001, ...meses.map(m => m.mer ?? 0))
  const p = calendario.periodo
  const fmtData = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 'var(--sp-3)' }}>
        <MiniStat label="Melhor dia da semana" value={melhor?.label ?? '—'} sub={melhor ? `MER ${melhor.mer!.toFixed(2)}x` : 'sem dado'} color="var(--admin-accent)" />
        <MiniStat label="Pior dia da semana" value={pior?.label ?? '—'} sub={pior ? `MER ${pior.mer!.toFixed(2)}x` : 'sem dado'} color="var(--admin-red)" />
        <MiniStat
          label='Hipótese "dias 5 e 20"'
          value={pg.confirmado ? 'Confirmada' : 'Não confirmada'}
          sub={pg.merDias5e20 !== null && pg.merDemais !== null ? `${pg.merDias5e20.toFixed(2)}x vs ${pg.merDemais.toFixed(2)}x` : `${pg.ocorrencias} ocorrências`}
          color={pg.confirmado ? 'var(--admin-accent)' : 'var(--admin-red)'}
        />
      </div>

      <Card title="Mídia média e MER por dia da semana" desc={`${fmtData(p.start)} a ${fmtData(p.endExclusive)} (últimos ${p.dias} dias completos) · receita paga ÷ mídia com tributo · só dias com investimento.`}>
        <div className="as-weekdays" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 'var(--sp-3)' }}>
          {calendario.diasDaSemana.map((w) => (
            <div key={w.label} style={{ textAlign: 'center' }}>
              <div style={{ height: '110px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 'var(--sp-2)' }}>
                <div style={{
                  width: '60%', height: `${((w.mer ?? 0) / maxMer) * 100}%`, minHeight: w.mer ? '4px' : 0, borderRadius: '6px 6px 0 0',
                  background: w.label === melhor?.label ? 'var(--admin-accent)' : w.label === pior?.label ? 'var(--admin-red)' : 'var(--admin-card-hover)',
                  border: '1px solid var(--admin-border)', position: 'relative',
                }}>
                  <span style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--admin-text-main)', whiteSpace: 'nowrap' }}>{w.mer !== null ? `${w.mer.toFixed(1)}x` : '—'}</span>
                </div>
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--admin-text-sec)' }}>{w.label}</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)' }}>R${w.avgSpend.toFixed(0)} · {w.dias}d</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{
        background: pg.confirmado ? 'var(--admin-info-soft)' : 'var(--admin-red-soft)',
        border: `1px solid ${pg.confirmado ? 'var(--admin-info)' : 'var(--admin-red)'}`,
        borderRadius: 'var(--r-md)', padding: '16px 20px', fontSize: 'var(--fs-sm)', color: 'var(--admin-text-sec)', lineHeight: 'var(--lh-normal)',
      }}>
        <strong style={{ color: 'var(--admin-text-main)' }}>Dias 5 e 20 (pagamento):</strong> {pg.nota}
      </div>

      <Card title="Força de vendas por mês" desc="Receita paga (Yampi) ÷ mídia com tributo, em ordem de retorno. Meses fechados do histórico real (a Black Friday e o Natal de 2025 estão na Yampi); o mês corrente é ao vivo e parcial.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {[...meses].sort((a, b) => (b.mer ?? 0) - (a.mer ?? 0)).map((m, idx) => (
            <div key={m.mes} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <div style={{ width: '20px', fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)', fontWeight: 600 }}>#{idx + 1}</div>
              <div style={{ width: '64px', fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--admin-text-main)' }}>{m.label}{m.parcial ? '*' : ''}</div>
              <div style={{ flex: 1, height: '18px', background: 'var(--admin-bg)', borderRadius: 'var(--r-sm)', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  height: '100%', width: `${((m.mer ?? 0) / maxMesMer) * 100}%`,
                  background: (m.mer ?? 0) >= 3.5 ? 'var(--admin-accent)' : (m.mer ?? 0) >= 2.5 ? 'var(--admin-alert)' : 'var(--admin-red)',
                  borderRadius: 'var(--r-sm)',
                }} />
              </div>
              <div style={{ width: '52px', textAlign: 'right', fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{m.mer!.toFixed(2)}x</div>
              <div className="as-month-spend" style={{ width: '120px', textAlign: 'right', fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>R${(m.receita / 1000).toFixed(0)}k / R${(m.midia / 1000).toFixed(0)}k</div>
            </div>
          ))}
          {meses.some(m => m.parcial) && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)' }}>* mês corrente, até ontem.</div>}
        </div>
      </Card>
    </div>
  )
}

// ───────────────────────── Tab: Funil ─────────────────────────

function FunilTab({ configured, accountsData, rangeLabel, vendas, referencias }: { configured: boolean; accountsData: AccountCampaigns[]; rangeLabel: string; vendas: VendasPorCampanha; referencias: Referencias | null }) {
  const allCampaigns = accountsData.flatMap(a => a.campaigns)
  const withSpend = allCampaigns.filter(c => c.spend > 0)

  const totals = withSpend.reduce((acc, c) => {
    const real = realDaCampanha(c, vendas)
    acc.spend += c.spend
    acc.clicks += c.inlineLinkClicks
    acc.atc += c.funnel.addToCart
    acc.ic += c.funnel.initiateCheckout
    acc.declaradas += c.results
    acc.reais += real.pedidos
    return acc
  }, { spend: 0, clicks: 0, atc: 0, ic: 0, declaradas: 0, reais: 0 })

  const custo = totals.spend * FATOR_TRIBUTO_META
  const cpc = totals.clicks > 0 ? custo / totals.clicks : 0
  const costPerAtc = totals.atc > 0 ? custo / totals.atc : 0
  const costPerIc = totals.ic > 0 ? custo / totals.ic : 0
  const cpaReal = totals.reais > 0 ? custo / totals.reais : 0
  const clickToAtc = totals.clicks > 0 ? (totals.atc / totals.clicks) * 100 : 0
  const atcToIc = totals.atc > 0 ? (totals.ic / totals.atc) * 100 : 0
  const icToPurchase = totals.ic > 0 ? (totals.reais / totals.ic) * 100 : 0
  const teto = referencias?.cpaEquilibrio ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      {!configured && <NotConfiguredBanner />}
      {configured && withSpend.length === 0 && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--admin-text-muted)', padding: 'var(--sp-5)', textAlign: 'center' }}>Sem campanhas com spend no período ({rangeLabel}).</div>
      )}

      <Callout tone="info">
        Cliques, add to cart e checkout são eventos declarados pela Meta. <strong>Compras são pedidos pagos reais</strong> com a UTM da campanha
        ({totals.reais} reais contra {totals.declaradas} declaradas pela Meta). Custos incluem o tributo de 13,8%. Pedidos sem UTM não entram, então o CPA real é um teto.
      </Callout>
      <FunnelStage label="TOFU — Cliques no link" value={totals.clicks} cost={cpc} costLabel="CPC" good={cpc > 0} />
      <FunnelStage label="MOFU — Add to Cart" value={totals.atc} cost={costPerAtc} costLabel="Custo por ATC" sub={`${clickToAtc.toFixed(1)}% dos cliques`} good={totals.atc > 0} />
      <FunnelStage label="MOFU/BOFU — Initiate Checkout" value={totals.ic} cost={costPerIc} costLabel="Custo por IC" sub={`${atcToIc.toFixed(1)}% dos ATC`} good={totals.ic > 0} />
      <FunnelStage label="BOFU — Compras reais" value={totals.reais} cost={cpaReal} costLabel="CPA real" sub={`${icToPurchase.toFixed(1)}% dos IC`} good={cpaReal > 0 && teto !== null && cpaReal <= teto} critical={teto !== null && cpaReal > teto} />

      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)', textAlign: 'center' }}>{origemReferencias(referencias)}</div>
    </div>
  )
}

function FunnelStage({ label, value, cost, costLabel, sub, good, critical }: { label: string; value: number; cost: number; costLabel: string; sub?: string; good?: boolean; critical?: boolean }) {
  const color = critical ? 'var(--admin-red)' : good ? 'var(--admin-accent)' : 'var(--admin-text-muted)'
  return (
    <div className="as-stage" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)',
      background: 'var(--admin-card)', border: `1px solid ${critical ? 'var(--admin-red)' : 'var(--admin-border)'}`,
      borderRadius: 'var(--r-md)', padding: '16px 22px',
    }}>
      <div>
        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--admin-text-main)' }}>{label}</div>
        {sub && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)', marginTop: 'var(--sp-1)' }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Volume</div>
          <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{value.toLocaleString('pt-BR')}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>{costLabel}</div>
          <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color, fontFamily: 'monospace' }}>{cost > 0 ? `R$${cost.toFixed(2)}` : '—'}</div>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── Tab: Criativos (Saúde) ─────────────────────────

const RANKING_LABEL: Record<string, { label: string; color: string }> = {
  ABOVE_AVERAGE:      { label: 'Acima da média', color: 'var(--admin-accent)' },
  AVERAGE:            { label: 'Na média', color: 'var(--admin-text-muted)' },
  BELOW_AVERAGE_35:    { label: 'Abaixo (top 35%)', color: 'var(--admin-alert)' },
  BELOW_AVERAGE_20:    { label: 'Abaixo (top 20%)', color: 'var(--admin-red)' },
  BELOW_AVERAGE_10:    { label: 'Abaixo (top 10%)', color: 'var(--admin-red)' },
  UNKNOWN:             { label: 'Sem dado', color: 'var(--admin-text-muted)' },
}

/** Mínimo de vendas reais para recomendar escalar: abaixo disso o CPA é ruído. */
const MIN_VENDAS_ESCALA = 3

type Sugestao = { action: string; color: string }

/** Recomendação de orçamento pelo CPA REAL contra as referências do último mês fechado. */
function sugerirOrcamento(real: ReturnType<typeof realDaCampanha>, ref: Referencias | null): Sugestao | null {
  if (!ref || ref.cpaEquilibrio === null) return null
  if (real.pedidos === 0) {
    return real.custo >= ref.cpaEquilibrio ? { action: 'Reduzir/Pausar (sem venda real)', color: 'var(--admin-red)' } : null
  }
  if (real.cpa! > ref.cpaEquilibrio) return { action: 'Reduzir/Pausar', color: 'var(--admin-red)' }
  if (ref.cpaEscala !== null && real.cpa! <= ref.cpaEscala && real.pedidos >= MIN_VENDAS_ESCALA) return { action: 'Aumentar 15–20%', color: 'var(--admin-accent)' }
  return { action: 'Manter', color: 'var(--admin-text-muted)' }
}

function CriativosTab({ configured, accountsData, rangeLabel, vendas, referencias }: { configured: boolean; accountsData: AccountCampaigns[]; rangeLabel: string; vendas: VendasPorCampanha; referencias: Referencias | null }) {
  const rows = accountsData.flatMap(a => a.campaigns.filter(c => c.spend > 0).map(c => ({ ...c, accountName: a.accountName, real: realDaCampanha(c, vendas) })))
    .sort((a, b) => b.spend - a.spend)

  return (
    <div>
      {!configured && <NotConfiguredBanner />}
      {configured && rows.length === 0 && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--admin-text-muted)', padding: 'var(--sp-5)', textAlign: 'center' }}>Sem campanhas com spend no período ({rangeLabel}).</div>
      )}
      <Callout tone="info">Leitura por campanha · {rangeLabel}. CPA real = gasto com tributo ÷ pedidos pagos com a UTM da campanha (a Meta declara cerca de 2,7× mais compras). {origemReferencias(referencias)} Escalar exige pelo menos {MIN_VENDAS_ESCALA} vendas reais.</Callout>
      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: 'var(--sp-3)' }}>
          {rows.map((c) => {
            const budget = sugerirOrcamento(c.real, referencias)
            const ranking = RANKING_LABEL[c.diagnostics.qualityRanking] ?? RANKING_LABEL.UNKNOWN
            const acimaTeto = c.real.cpa !== null && referencias?.cpaEquilibrio != null && c.real.cpa > referencias.cpaEquilibrio
            return (
              <div key={c.id} style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: 'var(--r-md)', padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: budget?.color ?? 'var(--admin-border)' }} />
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 650, color: 'var(--admin-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 'var(--sp-1)' }} title={c.name}>{c.name}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)', marginBottom: 'var(--sp-3)' }}>{c.accountName} · qualidade: <span style={{ color: ranking.color }}>{ranking.label}</span></div>
                <StatRow label="Gasto (com tributo)" value={`R$${c.real.custo.toFixed(0)}`} />
                <StatRow label="Vendas reais" value={`${c.real.pedidos}`} />
                <StatRow label="CPA real" value={c.real.cpa !== null ? `R$${c.real.cpa.toFixed(2)}` : '—'} color={acimaTeto ? 'var(--admin-red)' : c.real.cpa !== null ? 'var(--admin-accent)' : undefined} />
                <StatRow label="CPA Meta (declarado)" value={c.costPerResult > 0 ? `R$${c.costPerResult.toFixed(2)}` : '—'} />
                <StatRow label="CTR" value={`${c.ctr.toFixed(2)}%`} />
                <StatRow label="Frequência" value={c.frequency.toFixed(2) + 'x'} />
                {budget && (
                  <div style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-xs)', fontWeight: 700, color: budget.color, background: 'var(--admin-card-hover)', padding: '4px 10px', borderRadius: '999px', display: 'inline-block' }}>
                    Budget diário: {budget.action}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ───────────────────────── Tab: Alertas ─────────────────────────

function AlertasTab({ configured, accountsData, vendas, referencias, calendario }: { configured: boolean; accountsData: AccountCampaigns[]; vendas: VendasPorCampanha; referencias: Referencias | null; calendario: Calendario | null }) {
  const allCampaigns = accountsData.flatMap(a => a.campaigns.filter(c => c.spend > 0).map(c => ({ ...c, accountName: a.accountName, real: realDaCampanha(c, vendas) })))
  const eq = referencias?.cpaEquilibrio ?? null
  const esc = referencias?.cpaEscala ?? null

  const kill = eq === null ? [] : allCampaigns.filter(c => (c.real.cpa !== null && c.real.cpa > eq) || (c.real.pedidos === 0 && c.real.custo >= eq))
  const scale = esc === null ? [] : allCampaigns
    .filter(c => c.real.cpa !== null && c.real.cpa <= esc && c.real.pedidos >= MIN_VENDAS_ESCALA)
    .sort((a, b) => a.real.cpa! - b.real.cpa!)

  const dias = (calendario?.diasDaSemana ?? []).filter(d => d.mer !== null)
  const melhorDia = [...dias].sort((a, b) => (b.mer ?? 0) - (a.mer ?? 0))[0]
  const meses = (calendario?.meses ?? []).filter(m => m.mer !== null && !m.parcial)
  const melhorMes = [...meses].sort((a, b) => (b.mer ?? 0) - (a.mer ?? 0))[0]
  const piorMes = [...meses].sort((a, b) => (a.mer ?? 0) - (b.mer ?? 0))[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      {!configured && <NotConfiguredBanner />}

      <Callout tone="info">CPA real pelos pedidos pagos com a UTM de cada campanha, com o tributo de 13,8%. {origemReferencias(referencias)} As sugestões abaixo não executam mudanças.</Callout>
      {melhorDia && <AlertCard type="scale" icon={TrendingUp} title={`Melhor dia da semana: ${melhorDia.label}`} desc={`MER de ${melhorDia.mer!.toFixed(2)}x nos últimos 90 dias (receita ÷ mídia com tributo, ${melhorDia.dias} ocorrências).`} />}
      {melhorMes && <AlertCard type="scale" icon={Flame} title={`${melhorMes.label} foi o mês de melhor retorno`} desc={`MER de ${melhorMes.mer!.toFixed(2)}x (receita real ÷ mídia com tributo). Referência para planejamento; confirme a margem atual.`} />}
      {piorMes && <AlertCard type="watch" icon={Snowflake} title={`${piorMes.label} foi o mês mais fraco`} desc={`MER de ${piorMes.mer!.toFixed(2)}x. Considere reduzir a meta de CPA ou reforçar a oferta em meses parecidos.`} />}

      {configured && scale.slice(0, 3).map(c => (
        <AlertCard key={c.id} type="scale" icon={TrendingUp} title={`Escalar: "${c.name}"`} desc={`${c.accountName} — ${c.real.pedidos} vendas reais, CPA real R$${c.real.cpa!.toFixed(2)}, abaixo da escala de R$${esc!.toFixed(2)}. Aumentar 15–20%.`} />
      ))}
      {configured && kill.slice(0, 5).map(c => (
        <AlertCard key={c.id} type="kill" icon={TrendingDown} title={`Revisar/Pausar: "${c.name}"`} desc={`${c.accountName} — ${c.real.pedidos === 0 ? `gastou R$${c.real.custo.toFixed(0)} (com tributo) sem nenhuma venda real` : `CPA real R$${c.real.cpa!.toFixed(2)}, acima do equilíbrio de R$${eq!.toFixed(2)}`}.`} />
      ))}
      {configured && eq === null && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--admin-text-muted)', textAlign: 'center', padding: 'var(--sp-3)' }}>Sem referência de equilíbrio do último mês fechado: as campanhas não são classificadas.</div>
      )}
      {configured && eq !== null && kill.length === 0 && scale.length === 0 && allCampaigns.length > 0 && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--admin-text-muted)', textAlign: 'center', padding: 'var(--sp-3)' }}>Nenhuma campanha em zona crítica ou de escala clara no período — tudo dentro da faixa intermediária.</div>
      )}
    </div>
  )
}
