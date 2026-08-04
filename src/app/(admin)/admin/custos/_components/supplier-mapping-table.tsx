import type { Supplier } from '@/lib/admin/product-costs'
import type { SupplierMappingRow } from '@/lib/admin/supplier-mapping'

const CONF_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: 'ALTA',  color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  medium: { label: 'MÉDIA', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  low:    { label: 'BAIXA', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
}

function SupplierChip({ supplierId, suppliers }: { supplierId: string | null; suppliers: Supplier[] }) {
  if (!supplierId) {
    return (
      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', color: 'var(--admin-text-muted)', background: 'var(--admin-card-hover)' }}>
        — nenhum —
      </span>
    )
  }
  const name = suppliers.find(s => s.id === supplierId)?.name ?? '?'
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', color: 'var(--admin-accent)', background: 'var(--admin-accent-bg, rgba(16,185,129,0.12))' }}>
      {name}
    </span>
  )
}

export function SupplierMappingTable({ rows, suppliers }: { rows: SupplierMappingRow[]; suppliers: Supplier[] }) {
  const supplierName = (id: string) => suppliers.find(s => s.id === id)?.name ?? id.slice(0, 6)

  const resolved = rows.filter(r => !r.needs_review)
  const review   = rows.filter(r => r.needs_review)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {review.length > 0 && (
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginBottom: '10px' }}>
            ⚠ Precisa conferir ({review.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {review.map(r => (
              <div key={r.id} style={{
                background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderLeft: '3px solid #dc2626',
                borderRadius: '10px', padding: '13px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13.5px' }}>
                    {r.product_name}{r.variant_name ? ` — ${r.variant_name}` : ''}
                  </span>
                  <SupplierChip supplierId={r.supplier_primary_id} suppliers={suppliers} />
                </div>
                {Object.keys(r.period_volume_by_supplier).length > 0 && (
                  <div style={{ fontSize: '11.5px', color: 'var(--admin-text-muted)', fontFamily: 'monospace', marginBottom: '4px' }}>
                    {Object.entries(r.period_volume_by_supplier).map(([sid, qty]) => `${supplierName(sid)}: ${qty}`).join(' · ')}
                  </div>
                )}
                {r.notes && <div style={{ fontSize: '12.5px', color: 'var(--admin-text-sec)', lineHeight: 1.5 }}>{r.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '10px' }}>
          Mapeados ({resolved.length})
        </h3>
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '720px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600 }}>Produto / Variante</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600 }}>Principal</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600 }}>Vol.</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600 }}>Alternativas</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600 }}>Confiança</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600 }}>Observação</th>
              </tr>
            </thead>
            <tbody>
              {resolved.map(r => {
                const conf = CONF_LABEL[r.confidence_level]
                const primaryQty = r.supplier_primary_id ? r.period_volume_by_supplier[r.supplier_primary_id] : null
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{r.product_name}</div>
                      {r.variant_name && <div style={{ fontSize: '12px', color: 'var(--admin-text-sec)' }}>{r.variant_name}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}><SupplierChip supplierId={r.supplier_primary_id} suppliers={suppliers} /></td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{primaryQty ?? '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '11.5px', color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>
                      {r.supplier_alternatives.length > 0
                        ? r.supplier_alternatives.map(a => `${supplierName(a.supplier_id)}: ${a.quantity}`).join(' · ')
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '5px', color: conf.color, background: conf.bg }}>
                        {conf.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '11.5px', color: 'var(--admin-text-muted)', maxWidth: '260px' }}>{r.notes ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
