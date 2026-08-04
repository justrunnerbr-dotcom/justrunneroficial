'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { Supplier } from '@/lib/admin/product-costs'
import type { DailyRestockReport } from '@/lib/admin/daily-restock'

const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function DailyRestockReportView({ suppliers, supplierId, report }: {
  suppliers: Supplier[]
  supplierId: string
  report: DailyRestockReport
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleSupplierChange(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('fornecedor', id)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)' }}>Fornecedor:</label>
        <select
          value={supplierId}
          onChange={e => handleSupplierChange(e.target.value)}
          style={{
            background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '8px',
            padding: '8px 12px', color: 'var(--admin-text-main)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
          use o filtro &quot;Período&quot; no topo pra escolher o dia (ou intervalo) das vendas
        </span>
      </div>

      <div className="grid grid-cols-2" style={{ gap: '12px', marginBottom: '16px', maxWidth: '480px' }}>
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Unidades a pedir</div>
          <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'monospace' }}>{report.totalUnits}</div>
        </div>
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Custo total estimado</div>
          <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'monospace', color: '#16a34a' }}>{fmtBrl.format(report.total)}</div>
        </div>
      </div>

      {report.rows.length === 0 && report.unmatched.length === 0 && report.needsReview.length === 0 && (
        <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', padding: '24px 0', textAlign: 'center' }}>
          Nenhuma venda desse fornecedor no período selecionado.
        </p>
      )}

      {report.rows.length > 0 && (
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600 }}>Produto / Variante</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600 }}>Qtd.</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600 }}>Custo unit.</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600 }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map(row => (
                <tr key={row.modelName} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--admin-text-main)' }}>
                    {row.modelName}
                    {row.fromMapping && (
                      <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '10px', color: 'var(--admin-accent)', background: 'rgba(16,185,129,0.12)' }}>
                        base real
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{row.quantity}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-muted)' }}>{row.unitCost != null ? fmtBrl.format(row.unitCost) : '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{row.unitCost != null ? fmtBrl.format(row.subtotal) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.needsReview.length > 0 && (
        <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', marginBottom: '8px' }}>
            ⚠ Vendidos no período, mas o fornecedor está marcado &quot;precisa conferir&quot; no mapeamento ({report.needsReview.length}) — não entram em nenhum fornecedor até você resolver
          </div>
          {report.needsReview.map((u, i) => (
            <div key={i} style={{ fontSize: '12px', color: 'var(--admin-text-sec)', padding: '2px 0' }}>
              {u.quantity}x {u.title}
            </div>
          ))}
        </div>
      )}

      {report.unmatched.length > 0 && (
        <div style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)', borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', marginBottom: '8px' }}>
            ⚠ Vendidos no período sem custo/fornecedor cadastrado ({report.unmatched.length}) — não entram no total acima
          </div>
          {report.unmatched.map((u, i) => (
            <div key={i} style={{ fontSize: '12px', color: 'var(--admin-text-sec)', padding: '2px 0' }}>
              {u.quantity}x {u.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
