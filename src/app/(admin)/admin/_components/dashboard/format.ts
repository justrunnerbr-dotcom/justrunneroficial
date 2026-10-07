export type ValueKind = 'brl' | 'int' | 'pct0' | 'pct1' | 'pct2' | 'x'

export function formatKind(v: number, kind: ValueKind): string {
  switch (kind) {
    case 'brl':  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    case 'int':  return Math.round(v).toLocaleString('pt-BR')
    case 'pct0': return `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`
    case 'pct1': return `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    case 'pct2': return `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    case 'x':    return `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`
  }
}
