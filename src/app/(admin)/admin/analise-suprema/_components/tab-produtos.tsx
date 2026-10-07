'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Droplets } from 'lucide-react'
import { Card, MiniStat, ResponsiveTable, type Column } from './shared'
import type { ProductStat } from '@/lib/admin/analise-suprema-source'
import { productMargins, portfolioMarginPct } from '@/lib/admin/analise-suprema-margem'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const int = (v: number) => v.toLocaleString('pt-BR')

// Identidade de métrica, não polaridade: azul é sempre venda, laranja sempre
// comportamento. Nunca colorir por valor — o tamanho da barra já é a magnitude.
const COR_VENDA = 'var(--admin-accent)'
const COR_COMPORTAMENTO = 'var(--admin-alert)'

type Sinal = 'convergente' | 'divergente' | 'queda' | 'normal'

const SINAL = {
  convergente: { label: 'Convergente', cor: 'var(--admin-accent)', Icone: TrendingUp },
  divergente:  { label: 'Divergente',  cor: 'var(--admin-alert)',  Icone: AlertTriangle },
  queda:       { label: 'Em queda',    cor: 'var(--admin-red)',    Icone: TrendingDown },
  normal:      { label: 'Normal',      cor: 'var(--admin-text-muted)', Icone: null },
} as const

type Ordem = 'receita' | 'unidades' | 'views' | 'atc'

function classificar(p: ProductStat, medViews: number, medRev: number): Sinal {
  if (p.revenuePrev > 0 && p.revenue > p.revenuePrev * 1.25) return 'convergente'
  if (p.revenuePrev > 0 && p.revenue < p.revenuePrev * 0.6) return 'queda'
  if (medViews > 0 && medRev > 0 && p.views > medViews * 1.3 && p.revenue < medRev * 0.7) return 'divergente'
  return 'normal'
}

function mediana(v: number[]): number {
  if (!v.length) return 0
  const s = [...v].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function ProdutosTab({ stats, totalFees }: { stats: ProductStat[]; totalFees: number }) {
  const [ordem, setOrdem] = useState<Ordem>('receita')
  const [expandido, setExpandido] = useState(false)

  const { linhas, maxRev, maxViews, sugadores, margemCarteira } = useMemo(() => {
    const medViews = mediana(stats.map(s => s.views))
    const medRev = mediana(stats.map(s => s.revenue))

    const margens = productMargins(
      stats.map(s => ({ key: s.key, title: s.title, revenue: s.revenue, units: s.units, unitCost: s.unitCost })),
      totalFees,
    )
    const porChave = new Map(margens.map(m => [m.key, m]))

    const chave = { receita: 'revenue', unidades: 'units', views: 'views', atc: 'addToCarts' } as const
    const campo = chave[ordem]
    const ordenado = [...stats]
      .map(p => ({ ...p, sinal: classificar(p, medViews, medRev), margem: porChave.get(p.key) }))
      .sort((a, b) => (b[campo] as number) - (a[campo] as number))

    return {
      linhas: ordenado,
      maxRev: Math.max(1, ...stats.map(s => s.revenue)),
      maxViews: Math.max(1, ...stats.map(s => s.views)),
      sugadores: [...margens].filter(m => m.drag > 0).sort((a, b) => b.drag - a.drag).slice(0, 5),
      margemCarteira: portfolioMarginPct(margens),
    }
  }, [stats, ordem, totalFees])

  const visiveis = expandido ? linhas : linhas.slice(0, 10)

  type Linha = typeof linhas[number]

  const colunas: Column<Linha>[] = [
    {
      key: 'produto', header: 'Produto', primary: true,
      render: (r) => <span style={{ fontWeight: 600 }}>{r.title}</span>,
    },
    {
      key: 'venda', header: 'Venda',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: '150px' }}>
          <Barra frac={r.revenue / maxRev} cor={COR_VENDA} />
          <span style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)', whiteSpace: 'nowrap' }}>
            {brl(r.revenue)}
          </span>
        </div>
      ),
    },
    {
      key: 'unidades', header: 'Un.', align: 'right',
      render: (r) => <span style={{ fontFamily: 'monospace' }}>{int(r.units)}</span>,
    },
    {
      key: 'comportamento', header: 'Comportamento',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: '150px' }}>
          <Barra frac={r.views / maxViews} cor={COR_COMPORTAMENTO} />
          <span style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)', whiteSpace: 'nowrap' }}>
            {int(r.views)} · {int(r.addToCarts)} atc
          </span>
        </div>
      ),
    },
    {
      key: 'custo', header: 'Custo un.', align: 'right',
      render: (r) => r.unitCost === null
        ? <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-alert)' }}>sem cadastro</span>
        : (
          <span style={{ fontFamily: 'monospace', color: r.costIsEstimate ? 'var(--admin-alert)' : undefined }}>
            {brl(r.unitCost)}
            {r.costIsEstimate && <span style={{ fontSize: 'var(--fs-xs)', marginLeft: '4px' }}>est.</span>}
          </span>
        ),
    },
    {
      key: 'margem', header: 'Margem', align: 'right',
      render: (r) => {
        const m = r.margem
        if (!m || m.marginPct === null) {
          return <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)' }}>—</span>
        }
        const critico = m.marginPct < 0
        const baixo = m.marginPct < 40
        const cor = critico ? 'var(--admin-red)' : baixo ? 'var(--admin-alert)' : 'var(--admin-text-main)'
        return (
          <span style={{ fontFamily: 'monospace', color: cor, fontWeight: baixo ? 700 : 400 }}>
            {m.marginPct.toFixed(0)}%
          </span>
        )
      },
    },
    {
      key: 'sinal', header: 'Sinal',
      render: (r) => {
        const cfg = SINAL[r.sinal]
        const Icone = cfg.Icone
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)',
            fontSize: 'var(--fs-xs)', fontWeight: 600, color: cfg.cor,
            background: `color-mix(in srgb, ${cfg.cor} 10%, transparent)`,
            borderRadius: '999px', padding: '2px 8px', whiteSpace: 'nowrap',
          }}>
            {Icone && <Icone size={11} />}
            {cfg.label}
          </span>
        )
      },
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      {sugadores.length > 0 && (
        <Card
          title="Quem está sugando margem"
          desc="Margem perdida por render abaixo da média da carteira, já ponderada pelo quanto cada um vende. Produto ruim que vende pouco não é problema — o que vende muito é."
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 'var(--sp-3)' }}>
            {sugadores.map(s => (
              <MiniStat
                key={s.key}
                label={s.title.length > 28 ? `${s.title.slice(0, 28)}…` : s.title}
                value={`−${brl(s.drag)}`}
                sub={`Margem ${s.marginPct!.toFixed(0)}% · carteira ${margemCarteira?.toFixed(0) ?? '—'}%`}
                color="var(--admin-red)"
              />
            ))}
          </div>
          <div style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <Droplets size={12} />
            Taxa de gateway rateada pela participação na receita — aproximação, já que a taxa é cobrada por pedido e não por item.
          </div>
        </Card>
      )}

    <Card
      title="Ranking de produtos"
      desc="Venda real (pedidos pagos) e comportamento (visitas e add to cart) lado a lado. Quando os dois discordam, o gargalo não é tráfego."
      action={
        <select
          value={ordem}
          onChange={(e) => setOrdem(e.target.value as Ordem)}
          style={{
            fontSize: 'var(--fs-xs)', padding: '4px 8px', borderRadius: 'var(--r-sm)',
            border: '1px solid var(--admin-border)', background: 'var(--admin-card)',
            color: 'var(--admin-text-sec)', cursor: 'pointer',
          }}
        >
          <option value="receita">Ordenar por receita</option>
          <option value="unidades">Ordenar por unidades</option>
          <option value="views">Ordenar por visitas</option>
          <option value="atc">Ordenar por add to cart</option>
        </select>
      }
    >
      <div style={{ display: 'flex', gap: 'var(--sp-4)', marginBottom: 'var(--sp-3)', fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)', flexWrap: 'wrap' }}>
        <Legenda cor={COR_VENDA} label="Venda (receita)" />
        <Legenda cor={COR_COMPORTAMENTO} label="Comportamento (visitas)" />
      </div>

      <ResponsiveTable
        columns={colunas}
        rows={visiveis}
        rowKey={(r) => r.key}
        emptyLabel="Nenhum produto com venda ou visita no período."
      />

      {linhas.length > 10 && (
        <button
          onClick={() => setExpandido(v => !v)}
          style={{
            marginTop: 'var(--sp-3)', fontSize: 'var(--fs-xs)', color: 'var(--admin-accent)',
            background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0',
          }}
        >
          {expandido ? 'Ver top 10' : `Ver todos os ${linhas.length}`}
        </button>
      )}
    </Card>
    </div>
  )
}

function Barra({ frac, cor }: { frac: number; cor: string }) {
  return (
    <span style={{
      display: 'inline-block', width: '58px', height: '6px', flexShrink: 0,
      borderRadius: '999px', background: 'var(--admin-bg)', overflow: 'hidden',
    }}>
      <span style={{
        display: 'block', height: '100%', borderRadius: '999px', background: cor,
        width: `${Math.max(2, Math.min(100, frac * 100))}%`,
      }} />
    </span>
  )
}

function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
      <span style={{ width: '10px', height: '6px', borderRadius: '999px', background: cor }} />
      {label}
    </span>
  )
}
