'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronUp } from 'lucide-react'
import type { Supplier } from '@/lib/admin/product-costs'

const inputStyle: React.CSSProperties = {
  background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px',
  padding: '8px 10px', fontSize: '13px', color: 'var(--admin-text-main)',
}
const btnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: 'var(--admin-accent)', color: '#fff', border: 'none', borderRadius: '8px',
  padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
}

type Item = { productTitle: string; quantity: string; unitCost: string; supplierId: string }

// Aceita valores digitados com "R$", espaços ou vírgula decimal (ex: "R$ 1.234,56") — o
// placeholder "Valor total R$" induz o usuário a digitar o símbolo junto, e parseFloat direto
// nisso dá NaN (que vira `null` no JSON e passa despercebido pela validação client-side).
function parseMoney(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : NaN
}

export function ManualOrderForm({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [orderNumber, setOrderNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [createdAt, setCreatedAt] = useState(today)
  const [total, setTotal] = useState('')
  const [shippingAmount, setShippingAmount] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'boleto'>('credit_card')
  const [installments, setInstallments] = useState('1')

  const [items, setItems] = useState<Item[]>([])
  const [productTitle, setProductTitle] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitCost, setUnitCost] = useState('')
  const [supplierId, setSupplierId] = useState('')

  function addItem() {
    if (!productTitle.trim() || !unitCost) return
    setItems([...items, { productTitle: productTitle.trim(), quantity, unitCost, supplierId }])
    setProductTitle(''); setQuantity('1'); setUnitCost('')
  }
  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  function resetForm() {
    setOrderNumber(''); setCustomerName(''); setCreatedAt(today); setTotal('')
    setShippingAmount('0'); setPaymentMethod('credit_card'); setInstallments('1'); setItems([]); setSupplierId('')
  }

  async function handleSubmit() {
    const parsedTotal = parseMoney(total)
    if (!orderNumber.trim() || !total || Number.isNaN(parsedTotal) || items.length === 0) {
      setError('Número do pedido, valor total (só números) e pelo menos 1 produto são obrigatórios.')
      return
    }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/manual-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          customerName: customerName.trim() || undefined,
          total: parsedTotal,
          shippingAmount: parseMoney(shippingAmount || '0') || 0,
          paymentMethod,
          installments: parseInt(installments, 10) || 1,
          createdAt: `${createdAt}T12:00:00-03:00`,
          items: items.map(i => ({
            productTitle: i.productTitle,
            quantity: parseInt(i.quantity, 10) || 1,
            unitCost: parseMoney(i.unitCost) || 0,
            supplierId: i.supplierId || undefined,
          })),
        }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error ?? 'Erro ao registrar pedido manual.'); return }
      resetForm()
      setOpen(false)
      router.refresh()
    } finally { setLoading(false) }
  }

  if (!open) {
    return (
      <button style={{ ...btnStyle, marginBottom: '16px', background: 'var(--admin-card)', color: 'var(--admin-text-sec)', border: '1px solid var(--admin-border)' }} onClick={() => setOpen(true)}>
        <Plus size={14} /> Adicionar pedido manual (link AppMax)
      </button>
    )
  }

  return (
    <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
      <button onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-main)', fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>
        <ChevronUp size={14} /> Novo pedido manual (venda por link direto — produto fora do catálogo)
      </button>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <input style={{ ...inputStyle, width: '160px' }} placeholder="Nº pedido (AppMax)" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} />
        <input style={{ ...inputStyle, minWidth: '180px', flex: 1 }} placeholder="Nome do cliente (opcional)" value={customerName} onChange={e => setCustomerName(e.target.value)} />
        <input type="date" style={inputStyle} value={createdAt} onChange={e => setCreatedAt(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <input style={{ ...inputStyle, width: '110px' }} placeholder="Valor total (ex: 500,00)" inputMode="decimal" value={total} onChange={e => setTotal(e.target.value)} />
        <input style={{ ...inputStyle, width: '110px' }} placeholder="Frete (0 se grátis)" inputMode="decimal" value={shippingAmount} onChange={e => setShippingAmount(e.target.value)} />
        <select style={inputStyle} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)}>
          <option value="credit_card">Cartão de crédito</option>
          <option value="pix">Pix</option>
          <option value="boleto">Boleto</option>
        </select>
        {paymentMethod === 'credit_card' && (
          <input style={{ ...inputStyle, width: '90px' }} placeholder="Parcelas" inputMode="numeric" value={installments} onChange={e => setInstallments(e.target.value)} />
        )}
      </div>

      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Produtos</div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <input style={{ ...inputStyle, minWidth: '200px', flex: 1 }} placeholder="Nome do produto" value={productTitle} onChange={e => setProductTitle(e.target.value)} />
        <select style={inputStyle} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
          <option value="">Fornecedor…</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input style={{ ...inputStyle, width: '70px' }} placeholder="Qtd" inputMode="numeric" value={quantity} onChange={e => setQuantity(e.target.value)} />
        <input style={{ ...inputStyle, width: '100px' }} placeholder="Custo unit." inputMode="decimal" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
        <button style={btnStyle} onClick={addItem} type="button"><Plus size={14} /> Item</button>
      </div>

      {items.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          {items.map((it, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--admin-border)' }}>
              <span style={{ color: 'var(--admin-text-main)' }}>
                {it.quantity}× {it.productTitle}
                {it.supplierId && <span style={{ color: 'var(--admin-text-muted)' }}> — {suppliers.find(s => s.id === it.supplierId)?.name}</span>}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>R$ {it.unitCost}</span>
                <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div style={{ color: 'var(--admin-red)', fontSize: '13px', marginBottom: '10px' }}>{error}</div>}

      <button style={btnStyle} disabled={loading} onClick={handleSubmit}>
        <Plus size={14} /> {loading ? 'Salvando...' : 'Registrar pedido manual'}
      </button>
    </div>
  )
}
