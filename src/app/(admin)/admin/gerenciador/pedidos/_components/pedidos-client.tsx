'use client'

import { Fragment, useMemo, useState } from 'react'
import { Search, AlertTriangle, ChevronDown, ChevronRight, Info } from 'lucide-react'
import type { PedidosLucroData, PedidoLucroRow, PedidoCanal } from '@/lib/admin/gerenciador-pedidos'

const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtBrl0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')}%`
const fmtInt = (n: number) => n.toLocaleString('pt-BR')
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
const fmtHour = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

const CANAL_COR: Record<PedidoCanal, string> = {
  'Meta Ads':           '#3b82f6',
  'Google Ads':         '#22c55e',
  'WhatsApp':           '#10b981',
  'Instagram orgânico': '#ec4899',
  'E-mail/SMS':         '#f59e0b',
  'Direto/outros':      '#94a3b8',
}
const CANAIS = Object.keys(CANAL_COR) as PedidoCanal[]

type Modo = 'dia' | 'campanha'
// Linha já com a mídia do modo escolhido aplicada.
type PedidoView = PedidoLucroRow & { mediaCost: number; mediaBasis: string; profit: number }

const PAGAMENTO: Record<string, string> = { pix: 'Pix', credit_card: 'Cartão', billet: 'Boleto', boleto: 'Boleto' }

type SortKey = 'recentes' | 'lucro-desc' | 'lucro-asc' | 'receita-desc' | 'margem-asc'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recentes',     label: 'Mais recentes' },
  { key: 'lucro-desc',   label: 'Maior lucro' },
  { key: 'lucro-asc',    label: 'Menor lucro' },
  { key: 'receita-desc', label: 'Maior receita' },
  { key: 'margem-asc',   label: 'Menor margem' },
]
const PAGE = 100

const margemOf = (r: { revenue: number; profit: number }) => r.revenue > 0 ? r.profit / r.revenue : 0
const custosOf = (r: PedidoView) =>
  r.productCost + r.freightCost + r.logistics + r.gatewayFee + r.yampiFee + r.salesTax

const card: React.CSSProperties = {
  background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '14px',
}
const label: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
}
const money: React.CSSProperties = { fontFamily: 'monospace', whiteSpace: 'nowrap' }

function Kpi({ title, value, sub, tone }: { title: string; value: string; sub?: string; tone?: 'up' | 'down' }) {
  return (
    <div style={{ ...card, padding: '14px 16px' }}>
      <div style={label}>{title}</div>
      <div style={{
        ...money, fontSize: '20px', fontWeight: 700, marginTop: '6px',
        color: tone === 'down' ? 'var(--admin-red)' : tone === 'up' ? 'var(--admin-green)' : 'var(--admin-text-main)',
      }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '3px' }}>{sub}</div>}
    </div>
  )
}

function CanalBadge({ canal }: { canal: PedidoCanal }) {
  const c = CANAL_COR[canal]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700,
      padding: '2px 8px', borderRadius: '99px', color: c, background: `${c}1f`, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: c }} />{canal}
    </span>
  )
}

function MarginBar({ m }: { m: number }) {
  const neg = m < 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
      <div style={{ width: '54px', height: '6px', borderRadius: 99, background: 'var(--admin-bg)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.abs(m) * 100)}%`, height: '100%', background: neg ? 'var(--admin-red)' : 'var(--admin-green)' }} />
      </div>
      <span style={{ ...money, fontSize: '12px', color: neg ? 'var(--admin-red)' : 'var(--admin-text-sec)', minWidth: '44px', textAlign: 'right' }}>{fmtPct(m)}</span>
    </div>
  )
}

function Detalhe({ r }: { r: PedidoView }) {
  const linhas: [string, number, string?][] = [
    ['Receita', r.revenue],
    ['Produto', -r.productCost, r.missingCost ? 'algum item sem custo cadastrado — entrou como zero' : undefined],
    ['Frete', -r.freightCost],
    ['Logística', -r.logistics],
    ['Taxa do gateway', -r.gatewayFee],
    ['Taxa da Yampi', -r.yampiFee],
    ['Imposto', -r.salesTax],
    ['Mídia', -r.mediaCost, r.mediaBasis],
  ]
  const utm: [string, string | null][] = [
    ['Origem', r.source], ['Mídia (medium)', r.medium], ['Campanha', r.campaign], ['Conjunto', r.adset], ['Anúncio', r.ad],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '14px', padding: '14px 16px 18px 46px' }}>
      <div>
        <div style={label}>Itens</div>
        <ul style={{ margin: '8px 0 0', paddingLeft: '16px', fontSize: '12px', color: 'var(--admin-text-sec)', lineHeight: 1.6 }}>
          {r.items.split(', ').map((it, i) => <li key={i}>{it}</li>)}
        </ul>
        <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '8px' }}>
          Pagamento: <strong style={{ color: 'var(--admin-text-sec)' }}>{r.payment ? (PAGAMENTO[r.payment] ?? r.payment) : '—'}</strong>
        </div>
      </div>
      <div>
        <div style={label}>De onde sai o lucro</div>
        <div style={{ marginTop: '8px', fontSize: '12px' }}>
          {linhas.map(([nome, v, nota]) => (
            <div key={nome} title={nota} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '3px 0', borderBottom: '1px dashed var(--admin-border)' }}>
              <span style={{ color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>
                {nome}{nota && <Info size={11} style={{ display: 'inline-block', marginLeft: 4, verticalAlign: '-1px', color: nome === 'Produto' ? 'var(--admin-alert)' : 'var(--admin-text-muted)' }} />}
              </span>
              <span style={{ ...money, color: v < 0 ? 'var(--admin-text-sec)' : 'var(--admin-text-main)' }}>
                {v < 0 ? '− ' : ''}{fmtBrl.format(Math.abs(v))}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', fontWeight: 700 }}>
            <span style={{ color: 'var(--admin-text-main)' }}>Lucro</span>
            <span style={{ ...money, color: r.profit < 0 ? 'var(--admin-red)' : 'var(--admin-green)' }}>{fmtBrl.format(r.profit)}</span>
          </div>
        </div>
      </div>
      <div>
        <div style={label}>UTM do pedido</div>
        <div style={{ marginTop: '8px', fontSize: '12px' }}>
          {utm.map(([k, v]) => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', padding: '3px 0' }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>{k}</span>
              <span style={{ color: v ? 'var(--admin-text-main)' : 'var(--admin-text-muted)', wordBreak: 'break-word' }}>{v ?? '—'}</span>
            </div>
          ))}
          {r.account && (
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', padding: '3px 0' }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>Conta</span>
              <span style={{ color: 'var(--admin-text-main)' }}>{r.account}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function PedidosClient({ data, failedAccounts, rangeLabel }: {
  data: PedidosLucroData
  failedAccounts: string[]
  rangeLabel: string
}) {
  const [canal, setCanal] = useState<'Todos' | PedidoCanal>('Todos')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('recentes')
  const [soPrejuizo, setSoPrejuizo] = useState(false)
  const [aberto, setAberto] = useState<string | null>(null)
  const [limite, setLimite] = useState(PAGE)
  const [modo, setModo] = useState<Modo>('dia')

  const all: PedidoView[] = useMemo(() => data.rows.map(r => {
    const dia = data.cpaDia[r.day]
    const mediaCost = modo === 'dia' ? r.mediaDia : r.mediaCampanha
    const mediaBasis = modo === 'dia'
      ? (dia ? `CPA do dia ${fmtDay(r.createdAt)}: mídia ${fmtBrl.format(dia.spend)} ÷ ${dia.orders} pedidos${data.metaDailyKnown ? '' : ' (gasto diário indisponível: CPA do período)'}` : 'sem gasto de mídia no dia')
      : r.basisCampanha
    return { ...r, mediaCost, mediaBasis, profit: r.baseProfit - mediaCost }
  }), [data, modo])
  const unallocated = data.unallocated[modo]
  const tot = useMemo(() => {
    const t = { n: all.length, revenue: 0, profit: 0, midia: 0, prejuizo: 0, perda: 0, metaN: 0, metaMidia: 0 }
    for (const r of all) {
      t.revenue += r.revenue; t.profit += r.profit; t.midia += r.mediaCost
      if (r.profit < 0) { t.prejuizo++; t.perda += r.profit }
      if (r.canal === 'Meta Ads' && r.mediaCost > 0) { t.metaN++; t.metaMidia += r.mediaCost }
    }
    return t
  }, [all])
  const lucroPeriodo = tot.profit - unallocated - data.yampiMonthly

  const porCanal = useMemo(() => {
    const m = new Map<PedidoCanal, { n: number; revenue: number; profit: number }>()
    for (const r of all) {
      const e = m.get(r.canal) ?? { n: 0, revenue: 0, profit: 0 }
      e.n++; e.revenue += r.revenue; e.profit += r.profit
      m.set(r.canal, e)
    }
    return CANAIS.filter(c => m.has(c)).map(c => ({ canal: c, ...m.get(c)! }))
  }, [all])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const f = all
      .filter(r => canal === 'Todos' || r.canal === canal)
      .filter(r => !soPrejuizo || r.profit < 0)
      .filter(r => !q || [r.externalId, r.customer, r.items, r.campaign, r.adset, r.ad, r.account]
        .some(v => (v ?? '').toLowerCase().includes(q)))
    const by: Record<SortKey, (a: PedidoView, b: PedidoView) => number> = {
      'recentes':     (a, b) => b.createdAt.localeCompare(a.createdAt),
      'lucro-desc':   (a, b) => b.profit - a.profit,
      'lucro-asc':    (a, b) => a.profit - b.profit,
      'receita-desc': (a, b) => b.revenue - a.revenue,
      'margem-asc':   (a, b) => margemOf(a) - margemOf(b),
    }
    return [...f].sort(by[sort])
  }, [all, canal, soPrejuizo, query, sort])

  const sel = useMemo(() => rows.reduce((t, r) => {
    t.revenue += r.revenue; t.custos += custosOf(r); t.midia += r.mediaCost; t.profit += r.profit
    return t
  }, { revenue: 0, custos: 0, midia: 0, profit: 0 }), [rows])

  const filtrando = canal !== 'Todos' || soPrejuizo || query.trim() !== ''

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(16px, 3vw, 36px) clamp(16px, 3vw, 40px)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--admin-text-main)', margin: 0 }}>Pedidos · Lucro real</h1>
          <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
            {rangeLabel} · cada pedido com a origem exata e o que sobra depois de produto, frete, taxas, imposto e mídia
          </div>
        </div>
        <div>
          <div style={{ ...label, marginBottom: '6px' }}>Mídia descontada de cada pedido</div>
          <div role="radiogroup" aria-label="Forma de rateio da mídia" style={{ display: 'inline-flex', padding: '3px', borderRadius: '10px', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
            {([['dia', 'CPA do dia'], ['campanha', 'CPA da campanha']] as const).map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={modo === k} onClick={() => setModo(k)}
                title={k === 'dia'
                  ? 'Gasto total de mídia do dia (Meta + 13,8% + Google) ÷ todos os pedidos do dia'
                  : 'Gasto da campanha de origem ÷ vendas reais dela; orgânico e WhatsApp ficam sem mídia'}
                style={{
                  padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  background: modo === k ? 'var(--admin-accent)' : 'transparent',
                  color: modo === k ? '#fff' : 'var(--admin-text-sec)',
                }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {failedAccounts.length > 0 && (
        <div role="alert" style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(var(--admin-alert-rgb), 0.12)', border: '1px solid var(--admin-alert)', color: 'var(--admin-text-main)', fontSize: '12px' }}>
          A Meta não respondeu para {failedAccounts.join(', ')} agora. A mídia dos pedidos dessas contas está zerada —
          o lucro abaixo está otimista. Atualize em alguns minutos.
        </div>
      )}

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: '10px', marginBottom: '14px' }}>
        <Kpi title="Pedidos" value={fmtInt(tot.n)} sub={tot.n > 0 ? `ticket ${fmtBrl0.format(tot.revenue / tot.n)}` : undefined} />
        <Kpi title="Receita" value={fmtBrl0.format(tot.revenue)} />
        <Kpi title="Lucro do período" value={fmtBrl0.format(lucroPeriodo)} tone={lucroPeriodo < 0 ? 'down' : 'up'}
          sub={tot.revenue > 0 ? `margem ${fmtPct(lucroPeriodo / tot.revenue)}` : undefined} />
        <Kpi title="Lucro por pedido" value={tot.n > 0 ? fmtBrl.format(tot.profit / tot.n) : '—'} sub="média, já com a mídia descontada" />
        <Kpi title="Mídia nos pedidos" value={fmtBrl0.format(tot.midia)}
          sub={modo === 'dia'
            ? (tot.n > 0 ? `CPA médio ${fmtBrl0.format(tot.midia / tot.n)} por pedido` : undefined)
            : (tot.metaN > 0 ? `CPA médio Meta ${fmtBrl0.format(tot.metaMidia / tot.metaN)}` : undefined)} />
        <Kpi title="No prejuízo" value={fmtInt(tot.prejuizo)} tone={tot.prejuizo > 0 ? 'down' : undefined}
          sub={tot.prejuizo > 0 ? `${fmtBrl.format(tot.perda)} somados` : 'nenhum pedido'} />
      </div>

      {/* Canais — também são o filtro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '10px', marginBottom: '16px' }}>
        {[{ canal: 'Todos' as const, n: tot.n, revenue: tot.revenue, profit: tot.profit }, ...porCanal].map(c => {
          const on = canal === c.canal
          const cor = c.canal === 'Todos' ? 'var(--admin-accent)' : CANAL_COR[c.canal]
          return (
            <button key={c.canal} type="button" onClick={() => { setCanal(c.canal); setLimite(PAGE) }} style={{
              ...card, textAlign: 'left', padding: '12px 14px', cursor: 'pointer',
              borderColor: on ? cor : 'var(--admin-border)',
              boxShadow: on ? `inset 0 0 0 1px ${cor}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: on ? cor : 'var(--admin-text-main)' }}>
                {c.canal !== 'Todos' && <span style={{ width: 8, height: 8, borderRadius: 99, background: cor }} />}
                {c.canal}
                <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--admin-text-muted)' }}>{fmtInt(c.n)}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '2px 10px', marginTop: '8px', fontSize: '12px' }}>
                <span style={{ ...money, color: 'var(--admin-text-sec)' }}>{fmtBrl0.format(c.revenue)}</span>
                <span style={{ ...money, fontWeight: 700, color: c.profit < 0 ? 'var(--admin-red)' : 'var(--admin-green)' }}>
                  {fmtBrl0.format(c.profit)} <span style={{ fontWeight: 500, color: 'var(--admin-text-muted)' }}>{c.revenue > 0 ? fmtPct(c.profit / c.revenue) : ''}</span>
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Barra de ferramentas */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '440px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
          <input value={query} onChange={e => { setQuery(e.target.value); setLimite(PAGE) }}
            placeholder="Pedido, cliente, produto, campanha, conjunto, anúncio..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '10px', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-main)', fontSize: '13px', outline: 'none' }} />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value as SortKey)} style={{
          padding: '9px 12px', borderRadius: '10px', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-main)', fontSize: '13px',
        }}>
          {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--admin-text-sec)', cursor: 'pointer' }}>
          <input type="checkbox" checked={soPrejuizo} onChange={e => { setSoPrejuizo(e.target.checked); setLimite(PAGE) }} />
          Só prejuízo
        </label>
        {filtrando && (
          <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginLeft: 'auto' }}>
            {fmtInt(rows.length)} pedido(s) · receita {fmtBrl0.format(sel.revenue)} · lucro{' '}
            <strong style={{ color: sel.profit < 0 ? 'var(--admin-red)' : 'var(--admin-green)' }}>{fmtBrl0.format(sel.profit)}</strong>
          </span>
        )}
      </div>

      {/* Lista */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '880px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                <th style={{ width: '30px' }} />
                <th style={{ ...label, padding: '10px 8px', textAlign: 'left' }}>Pedido</th>
                <th style={{ ...label, padding: '10px 8px', textAlign: 'left' }}>Origem</th>
                <th style={{ ...label, padding: '10px 8px', textAlign: 'right' }}>Receita</th>
                <th style={{ ...label, padding: '10px 8px', textAlign: 'right' }} title="Produto + frete + logística + taxas + imposto">Custos</th>
                <th style={{ ...label, padding: '10px 8px', textAlign: 'right' }} title={modo === 'dia' ? 'CPA do dia: mídia total do dia ÷ pedidos do dia' : 'CPA real da campanha de origem'}>Mídia</th>
                <th style={{ ...label, padding: '10px 8px', textAlign: 'right' }}>Lucro</th>
                <th style={{ ...label, padding: '10px 14px', textAlign: 'right' }}>Margem</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limite).map(r => {
                const open = aberto === r.id
                const trail = [r.campaign, r.adset, r.ad].filter(Boolean) as string[]
                return (
                  <Fragment key={r.id}>
                    <tr onClick={() => setAberto(open ? null : r.id)} style={{
                      borderBottom: open ? 'none' : '1px solid var(--admin-border)', cursor: 'pointer',
                      background: open ? 'rgba(var(--admin-accent-rgb), 0.05)' : undefined,
                    }}>
                      <td style={{ padding: '12px 0 12px 12px', color: 'var(--admin-text-muted)', verticalAlign: 'top' }}>
                        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: 'var(--admin-text-main)' }}>#{r.externalId}</div>
                        <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{fmtDay(r.createdAt)} · {fmtHour(r.createdAt)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--admin-text-sec)', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.customer}</div>
                      </td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top', maxWidth: '420px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <CanalBadge canal={r.canal} />
                          {r.account && <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--admin-text-sec)' }}>{r.account}</span>}
                        </div>
                        {trail.length > 0 ? (
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-sec)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={trail.join(' › ')}>
                            {trail.join(' › ')}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
                            {r.source ? `${r.source}${r.medium ? ` / ${r.medium}` : ''}` : 'sem UTM'}
                          </div>
                        )}
                      </td>
                      <td style={{ ...money, padding: '12px 8px', textAlign: 'right', verticalAlign: 'top', fontWeight: 600, color: 'var(--admin-text-main)' }}>{fmtBrl.format(r.revenue)}</td>
                      <td style={{ ...money, padding: '12px 8px', textAlign: 'right', verticalAlign: 'top', color: 'var(--admin-text-sec)' }}>
                        {fmtBrl.format(custosOf(r))}
                        {r.missingCost && <span title="Algum item sem custo cadastrado — entrou como zero"><AlertTriangle size={12} color="var(--admin-alert)" style={{ display: 'inline-block', marginLeft: 4, verticalAlign: '-2px' }} /></span>}
                      </td>
                      <td style={{ ...money, padding: '12px 8px', textAlign: 'right', verticalAlign: 'top', color: 'var(--admin-text-sec)' }} title={r.mediaBasis}>
                        {r.mediaCost > 0 ? fmtBrl.format(r.mediaCost) : '—'}
                      </td>
                      <td style={{ ...money, padding: '12px 8px', textAlign: 'right', verticalAlign: 'top', fontWeight: 700, color: r.profit < 0 ? 'var(--admin-red)' : 'var(--admin-green)' }}>
                        {fmtBrl.format(r.profit)}
                      </td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'top' }}><MarginBar m={margemOf(r)} /></td>
                    </tr>
                    {open && (
                      <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'rgba(var(--admin-accent-rgb), 0.05)' }}>
                        <td colSpan={8}><Detalhe r={r} /></td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Nenhum pedido com esses filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length > limite && (
          <button type="button" onClick={() => setLimite(l => l + PAGE)} style={{
            width: '100%', padding: '12px', border: 'none', borderTop: '1px solid var(--admin-border)',
            background: 'var(--admin-bg)', color: 'var(--admin-accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>
            Mostrar mais {Math.min(PAGE, rows.length - limite)} de {fmtInt(rows.length - limite)} restantes
          </button>
        )}
      </div>

      {/* Fechamento do período */}
      <div style={{ ...card, padding: '14px 16px', marginTop: '14px' }}>
        <div style={label}>Como fecha o período</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 14px', marginTop: '8px', fontSize: '13px', color: 'var(--admin-text-sec)' }}>
          <span>Lucro dos pedidos <strong style={{ ...money, color: 'var(--admin-text-main)' }}>{fmtBrl.format(tot.profit)}</strong></span>
          <span>− mídia que não ficou em pedido <strong style={money}>{fmtBrl.format(unallocated)}</strong></span>
          <span>− mensalidade Yampi <strong style={money}>{fmtBrl.format(data.yampiMonthly)}</strong></span>
          <span>= <strong style={{ ...money, fontSize: '15px', color: lucroPeriodo < 0 ? 'var(--admin-red)' : 'var(--admin-green)' }}>{fmtBrl.format(lucroPeriodo)}</strong></span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '8px', lineHeight: 1.6 }}>
          Receita, produto, frete e taxas são os mesmos números do Dashboard.{' '}
          {modo === 'dia'
            ? <>Mídia de cada pedido = <strong>CPA do dia</strong>: gasto total de mídia do dia (Meta + 13,8% de tributo + Google) ÷ todos os pedidos pagos do dia — orgânico e WhatsApp incluídos. Só sobra mídia fora dos pedidos em dia que gastou e não vendeu.</>
            : <>Mídia de cada pedido = <strong>CPA da campanha</strong> de origem no período (gasto + 13,8% ÷ vendas reais dela); orgânico, WhatsApp e UTM que não casa ficam sem mídia, e o gasto que não virou pedido aparece acima.</>}
          {!data.metaDailyKnown && ' O gasto diário da Meta não respondeu: o CPA do dia virou CPA do período inteiro.'}
          {!data.salesTaxConfigured && ' Alíquota de imposto não configurada — imposto entrou como zero.'}
          {!data.googleSpendKnown && ' Gasto do Google indisponível agora — pedidos do Google estão sem mídia.'}
        </div>
      </div>
    </div>
  )
}
