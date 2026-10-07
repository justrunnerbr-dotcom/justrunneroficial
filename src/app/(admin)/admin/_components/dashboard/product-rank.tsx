'use client'
import { useState } from 'react'
import type { ProductRankRow } from '@/lib/admin/dashboard-data'
import { METRICS } from '@/lib/admin/metric-contract'
import { ExportCsvButton } from './export-csv'

type SortKey = 'units' | 'revenue' | 'views' | 'carts'
const TABS: { key: SortKey; label: string }[] = [
  { key: 'units', label: 'Unidades' },
  { key: 'revenue', label: 'Receita' },
  { key: 'views', label: 'Visualizações' },
  { key: 'carts', label: 'Carrinho' },
]

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const int = (v: number) => v.toLocaleString('pt-BR')
const pct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

/** Procura alta com conversão baixa: bem acima da mediana de visualizações e
 *  com conversão abaixo da metade da mediana. Só marca com amostra mínima. */
function flags(rows: ProductRankRow[]): Map<string, string> {
  const withViews = rows.filter(r => (r.views ?? 0) >= 200 && r.conv !== null)
  if (withViews.length < 5) return new Map()
  const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
  const mv = med(withViews.map(r => r.views ?? 0))
  const mc = med(withViews.map(r => r.conv ?? 0))
  const out = new Map<string, string>()
  for (const r of withViews) {
    if ((r.views ?? 0) >= mv * 1.5 && (r.conv ?? 0) < mc / 2) out.set(r.key, 'muita procura e conversão abaixo da metade da mediana')
  }
  return out
}

export function ProductRank({ rows, unmatchedUnits, csvPeriod }: { rows: ProductRankRow[]; unmatchedUnits: number; csvPeriod: string }) {
  const [by, setBy] = useState<SortKey>('units')
  const f = flags(rows)
  const top = [...rows].sort((a, b) => (b[by] ?? -1) - (a[by] ?? -1)).slice(0, 8)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div className="dsh-seg" role="group" aria-label="Ordenar produtos por">
          {TABS.map(t => <button key={t.key} type="button" aria-pressed={by === t.key} onClick={() => setBy(t.key)}>{t.label}</button>)}
        </div>
        <ExportCsvButton
          meta={{ table: 'Produtos em destaque', period: csvPeriod, sources: METRICS.rank.sources, coverage: unmatchedUnits > 0 ? `${unmatchedUnits} unidade(s) sem produto do catálogo ligado` : undefined }}
          header={['Produto', 'Slug', 'Unidades', 'Pedidos', 'Receita', 'Visualizações', 'Carrinho', 'Conversão (pedidos/visualizações)']}
          rows={[...rows].sort((a, b) => (b[by] ?? -1) - (a[by] ?? -1)).map(r => [r.name, r.slug, r.units, r.orders, r.revenue, r.views, r.carts, r.conv])}
        />
      </div>
      {top.length === 0 ? <p className="dsh-empty" style={{ marginTop: 12 }}>Nenhum produto vendido ou visto no período.</p> : (
        <div className="dsh-tbl-w">
          <table className="dsh-tbl">
            <thead><tr><th>Produto</th><th className="r">Unid.</th><th className="r">Receita</th><th className="r">Visual.</th><th className="r">Carrinho</th><th className="r">Conv.</th></tr></thead>
            <tbody>
              {top.map(r => (
                <tr key={r.key}>
                  <td>{r.name}</td>
                  <td className="r">{int(r.units)}</td>

                  <td className="r">{brl(r.revenue)}</td>
                  <td className="r">{r.views === null ? '—' : int(r.views)}</td>
                  <td className="r">{r.carts === null ? '—' : int(r.carts)}</td>
                  <td className="r">{r.conv === null ? '—' : f.has(r.key) ? <span className="dsh-flag" title={f.get(r.key)}>{pct(r.conv)} ⚑</span> : pct(r.conv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {top.some(r => f.has(r.key)) && <p className="dsh-note">⚑ muita procura e conversão baixa em relação aos demais produtos.</p>}
      {unmatchedUnits > 0 && <p className="dsh-note">{int(unmatchedUnits)} unidade(s) vendidas sem SKU ligado a um produto do catálogo aparecem pelo nome, sem visualizações.</p>}
    </div>
  )
}
