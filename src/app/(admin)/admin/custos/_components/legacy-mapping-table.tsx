'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, Search, X, RotateCcw } from 'lucide-react'
import type { Supplier, ProductCost } from '@/lib/admin/product-costs'
import type { SupplierMappingRow } from '@/lib/admin/supplier-mapping'
import {
  suggestCost,
  type LegacyQueueOrder, type LegacyQueueItem, type CatalogProduct, type CatalogVariant,
} from '@/lib/admin/legacy-mapping'

const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })

type Props = {
  orders: LegacyQueueOrder[]
  catalog: CatalogProduct[]
  suppliers: Supplier[]
  costs: ProductCost[]
  supplierMapping: SupplierMappingRow[]
  rangeLabel: string
}

type Alvo = { order: LegacyQueueOrder; item: LegacyQueueItem }

export function LegacyMappingTable({ orders, catalog, suppliers, costs, supplierMapping, rangeLabel }: Props) {
  const router = useRouter()
  const [alvo, setAlvo] = useState<Alvo | null>(null)
  const [filtro, setFiltro] = useState<'pendentes' | 'mapeados' | 'todos'>('pendentes')

  const resumo = useMemo(() => {
    const itens = orders.flatMap(o => o.items)
    const pendentes = itens.filter(i => !i.mapping)
    const mapeados  = itens.filter(i => i.mapping)
    return {
      pedidos: orders.length,
      pendentes: pendentes.length,
      mapeados: mapeados.length,
      receitaPendente: pendentes.reduce((s, i) => s + i.lineTotal, 0),
      custoMapeado: mapeados.reduce((s, i) => s + (i.mapping ? i.mapping.unit_cost * i.quantity : 0), 0),
    }
  }, [orders])

  const visiveis = useMemo(() => orders
    .map(o => ({
      ...o,
      items: o.items.filter(i =>
        filtro === 'todos' ? true : filtro === 'pendentes' ? !i.mapping : !!i.mapping),
    }))
    .filter(o => o.items.length > 0), [orders, filtro])

  return (
    <div>
      <div
        style={{
          display: 'flex', gap: '10px', alignItems: 'flex-start',
          padding: '12px 14px', marginBottom: '16px', borderRadius: '10px',
          background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)',
        }}
      >
        <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />
        <p style={{ fontSize: '12px', color: 'var(--admin-text-sec)', lineHeight: 1.5 }}>
          Itens do catálogo antigo da Yampi. O nome deles é genérico (&quot;Óculos de Sol Just Runner&quot; + cor),
          sem modelo — por isso o custo automático por semelhança de texto está <strong>desligado</strong> para eles
          e não entra no fechamento até ser mapeado à mão aqui. O nome, SKU e preço originais nunca são apagados.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: '12px', marginBottom: '18px' }}>
        <Kpi label="Pedidos legados no período" value={String(resumo.pedidos)} sub={rangeLabel} />
        <Kpi label="Itens pendentes" value={String(resumo.pendentes)} color="#d97706" />
        <Kpi label="Itens mapeados" value={String(resumo.mapeados)} color="#16a34a" />
        <Kpi label="Custo já mapeado" value={fmtBrl.format(resumo.custoMapeado)} sub={`${fmtBrl.format(resumo.receitaPendente)} de receita ainda sem custo`} />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {(['pendentes', 'mapeados', 'todos'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', textTransform: 'capitalize',
              border: `1px solid ${filtro === f ? 'transparent' : 'var(--admin-border)'}`,
              background: filtro === f ? 'var(--admin-text-main)' : 'transparent',
              color: filtro === f ? 'var(--admin-bg)' : 'var(--admin-text-sec)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', padding: '28px 0', textAlign: 'center' }}>
          Nenhum item legado {filtro === 'pendentes' ? 'pendente' : filtro === 'mapeados' ? 'mapeado' : ''} neste período.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visiveis.map(o => (
            <div key={o.orderId} style={{ border: '1px solid var(--admin-border)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: 'var(--admin-card-hover)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <strong style={{ fontSize: '13px', color: 'var(--admin-text-main)' }}>
                  #{o.yampiNumber ?? o.externalId}
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{fmtDate(o.createdAt)}</span>
                <span style={{ fontSize: '12px', color: 'var(--admin-text-sec)' }}>{o.customerName ?? '—'}</span>
                {o.customerPhone && <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{o.customerPhone}</span>}
                <span style={{ fontSize: '12px', color: 'var(--admin-text-sec)', marginLeft: 'auto' }}>
                  Pedido {fmtBrl.format(o.total)}
                </span>
                {o.importedManually && <Tag texto="Importado manual" cor="#7c3aed" />}
              </div>

              {o.items.map(item => (
                <div
                  key={item.orderItemId}
                  style={{
                    padding: '12px 14px', display: 'flex', flexWrap: 'wrap', gap: '12px',
                    alignItems: 'center', borderTop: '1px solid var(--admin-border)',
                  }}
                >
                  <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: 'var(--admin-text-main)', fontWeight: 500 }}>
                      {item.quantity}× {item.originalTitle}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                      SKU original {item.originalSku ?? '—'} · vendido a {fmtBrl.format(item.unitPrice)}
                    </div>
                    {item.mapping && (
                      <div style={{ fontSize: '11.5px', color: '#16a34a', marginTop: '4px' }}>
                        → {item.mapping.product_name} · {item.mapping.variant_name}
                        {item.mapping.supplier_name ? ` · ${item.mapping.supplier_name}` : ''}
                        {' · '}{fmtBrl.format(item.mapping.unit_cost)}/un
                      </div>
                    )}
                  </div>

                  {item.mapping
                    ? <Tag texto="Mapeado" cor="#16a34a" />
                    : <Tag texto="Pendente de mapeamento" cor="#d97706" />}

                  <button
                    onClick={() => setAlvo({ order: o, item })}
                    style={{
                      padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text-main)',
                    }}
                  >
                    {item.mapping ? 'Editar mapeamento' : 'Mapear produto'}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {alvo && (
        <MappingModal
          alvo={alvo}
          catalog={catalog}
          suppliers={suppliers}
          costs={costs}
          supplierMapping={supplierMapping}
          onClose={() => setAlvo(null)}
          onSaved={() => { setAlvo(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ padding: '12px 14px', border: '1px solid var(--admin-border)', borderRadius: '10px' }}>
      <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: color ?? 'var(--admin-text-main)' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

function Tag({ texto, cor }: { texto: string; cor: string }) {
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, color: cor, background: `${cor}1a`, padding: '4px 9px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
      {texto}
    </span>
  )
}

function MappingModal({ alvo, catalog, suppliers, costs, supplierMapping, onClose, onSaved }: {
  alvo: Alvo
  catalog: CatalogProduct[]
  suppliers: Supplier[]
  costs: ProductCost[]
  supplierMapping: SupplierMappingRow[]
  onClose: () => void
  onSaved: () => void
}) {
  const { order, item } = alvo
  const [busca, setBusca] = useState('')
  const [produto, setProduto] = useState<CatalogProduct | null>(
    item.mapping ? catalog.find(p => p.id === item.mapping!.product_id) ?? null : null,
  )
  const [variacao, setVariacao] = useState<CatalogVariant | null>(
    item.mapping && produto ? produto.variants.find(v => v.id === item.mapping!.variant_id) ?? null : null,
  )
  const [custo, setCusto] = useState(item.mapping ? String(item.mapping.unit_cost) : '')
  const [fornecedorId, setFornecedorId] = useState(item.mapping?.supplier_id ?? '')
  const [nota, setNota] = useState(item.mapping?.note ?? '')
  const [origem, setOrigem] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return catalog.slice(0, 40)
    return catalog.filter(p => p.name.toLowerCase().includes(q)).slice(0, 40)
  }, [busca, catalog])

  function escolherProduto(p: CatalogProduct) {
    setProduto(p)
    setVariacao(null)
    setOrigem(null)
  }

  function escolherVariacao(p: CatalogProduct, v: CatalogVariant) {
    setVariacao(v)
    const s = suggestCost(p.name, v.name, costs, supplierMapping, suppliers)
    if (s.unitCost !== null) setCusto(String(s.unitCost))
    if (s.supplierId) setFornecedorId(s.supplierId)
    setOrigem(s.origin === 'product_costs' ? 'custo cadastrado (product_costs)'
      : s.origin === 'supplier_mapping' ? 'fornecedor principal (supplier_mapping) — custo não cadastrado'
      : 'nenhuma sugestão encontrada — preencha à mão')
  }

  async function salvar() {
    if (!produto || !variacao) { setErro('Selecione produto e variação.'); return }
    const valor = parseFloat(custo.replace(',', '.'))
    if (isNaN(valor) || valor < 0) { setErro('Custo unitário inválido.'); return }
    setSalvando(true); setErro(null)
    try {
      const res = await fetch('/api/admin/legacy-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId, orderItemId: item.orderItemId,
          productId: produto.id, variantId: variacao.id,
          supplierId: fornecedorId || null, unitCost: valor, note: nota || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.error ?? 'Falha ao salvar.'); setSalvando(false); return }
      onSaved()
    } catch {
      setErro('Erro de rede ao salvar.')
      setSalvando(false)
    }
  }

  async function desfazer() {
    setSalvando(true); setErro(null)
    const res = await fetch('/api/admin/legacy-mapping', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      // manda o SKU junto: se o webhook recriou o item, o id mudou mas o SKU
      // (que e a ancora do mapeamento) continua valendo
      body: JSON.stringify({ orderId: order.orderId, orderItemId: item.orderItemId, sku: item.originalSku }),
    })
    if (!res.ok) { setErro('Falha ao desfazer.'); setSalvando(false); return }
    onSaved()
  }

  const qtd = item.quantity
  const valorCusto = parseFloat(custo.replace(',', '.'))

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '12px', width: '100%', maxWidth: '660px', padding: '20px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--admin-text-main)' }}>Mapear item legado</h3>
            <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '3px' }}>
              Pedido #{order.yampiNumber ?? order.externalId} · {order.customerName ?? '—'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', padding: '2px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--admin-card-hover)', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '3px' }}>Original da Yampi (nunca é alterado)</div>
          <div style={{ fontSize: '13px', color: 'var(--admin-text-main)', fontWeight: 500 }}>{qtd}× {item.originalTitle}</div>
          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
            SKU {item.originalSku ?? '—'} · vendido a {fmtBrl.format(item.unitPrice)} · total {fmtBrl.format(item.lineTotal)}
          </div>
        </div>

        <Campo titulo="1. Produto do catálogo atual">
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar produto por nome…"
              style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text-main)', fontSize: '13px' }}
            />
          </div>
          <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
            {filtrados.map(p => (
              <button
                key={p.id}
                onClick={() => escolherProduto(p)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: '12.5px', cursor: 'pointer',
                  border: 'none', borderBottom: '1px solid var(--admin-border)',
                  background: produto?.id === p.id ? 'var(--admin-card-hover)' : 'transparent',
                  color: 'var(--admin-text-main)', display: 'flex', gap: '8px', alignItems: 'center',
                }}
              >
                <span style={{ flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: '10.5px', color: 'var(--admin-text-muted)' }}>{p.variants.length} var.</span>
                {p.status !== 'active' && <Tag texto={p.status ?? '—'} cor="#d97706" />}
                {produto?.id === p.id && <Check size={14} color="#16a34a" />}
              </button>
            ))}
          </div>
        </Campo>

        {produto && (
          <Campo titulo="2. Variação">
            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
              {produto.variants.map(v => (
                <button
                  key={v.id}
                  onClick={() => escolherVariacao(produto, v)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: '12.5px', cursor: 'pointer',
                    border: 'none', borderBottom: '1px solid var(--admin-border)',
                    background: variacao?.id === v.id ? 'var(--admin-card-hover)' : 'transparent',
                    color: 'var(--admin-text-main)', display: 'flex', gap: '8px', alignItems: 'center',
                  }}
                >
                  <span style={{ flex: 1 }}>{v.name}</span>
                  <span style={{ fontSize: '10.5px', color: 'var(--admin-text-muted)' }}>{v.sku ?? '—'}</span>
                  {variacao?.id === v.id && <Check size={14} color="#16a34a" />}
                </button>
              ))}
            </div>
          </Campo>
        )}

        {variacao && (
          <>
            {origem && (
              <p style={{ fontSize: '11.5px', color: 'var(--admin-text-muted)', marginBottom: '10px' }}>
                Origem da sugestão: {origem}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '10px', marginBottom: '12px' }}>
              <Campo titulo="3. Custo unitário (R$)">
                <input
                  value={custo}
                  onChange={e => setCusto(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text-main)', fontSize: '13px' }}
                />
              </Campo>
              <Campo titulo="4. Fornecedor">
                <select
                  value={fornecedorId}
                  onChange={e => setFornecedorId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text-main)', fontSize: '13px' }}
                >
                  <option value="">Sem fornecedor</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Campo>
            </div>

            <Campo titulo="Observação (opcional)">
              <input
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="ex: identificado pelo pedido ao fornecedor da semana"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text-main)', fontSize: '13px' }}
              />
            </Campo>

            {!isNaN(valorCusto) && valorCusto >= 0 && (
              <p style={{ fontSize: '12px', color: 'var(--admin-text-sec)', marginBottom: '12px' }}>
                Custo total do item: <strong>{fmtBrl.format(valorCusto * qtd)}</strong> ({qtd}× {fmtBrl.format(valorCusto)})
                {' · '}margem sobre o vendido: <strong>{fmtBrl.format(item.lineTotal - valorCusto * qtd)}</strong>
              </p>
            )}
          </>
        )}

        {erro && <p style={{ fontSize: '12px', color: '#dc2626', marginBottom: '10px' }}>{erro}</p>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {item.mapping && (
            <button
              onClick={desfazer}
              disabled={salvando}
              style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--admin-border)', background: 'transparent', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px', marginRight: 'auto' }}
            >
              <RotateCcw size={13} /> Desfazer mapeamento
            </button>
          )}
          <button
            onClick={onClose}
            style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text-sec)' }}
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando || !produto || !variacao}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700,
              cursor: salvando || !produto || !variacao ? 'not-allowed' : 'pointer', border: 'none',
              background: !produto || !variacao ? 'var(--admin-border)' : 'var(--admin-text-main)',
              color: 'var(--admin-bg)', opacity: salvando ? 0.6 : 1,
            }}
          >
            {salvando ? 'Salvando…' : 'Salvar mapeamento'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Campo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--admin-text-sec)', marginBottom: '5px' }}>{titulo}</div>
      {children}
    </div>
  )
}
