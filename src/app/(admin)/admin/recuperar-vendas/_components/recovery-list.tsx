'use client'

import { useState } from 'react'
import { MessageCircle, CheckCircle2, ImageOff, Undo2, Flame } from 'lucide-react'
import type { AbandonedCart } from '@/lib/yampi/carts'
import type { ContactPriority } from '../page'

interface EnrichedCart extends AbandonedCart {
  whatsappUrl:    string | null
  recovered:      boolean
  autoRecovered:  boolean
  operatorStatus: string | null
  imageUrl:       string | null
  priority:       ContactPriority
}

function timeSince(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins   = Math.floor(diffMs / 60000)
  if (mins < 60)   return `há ${mins}min`
  const hours  = Math.floor(mins / 60)
  if (hours < 24)  return `há ${hours}h`
  const days   = Math.floor(hours / 24)
  return `há ${days}d`
}

function itemsSummary(items: AbandonedCart['items']): string {
  if (items.length === 0) return 'Produto'
  const first = items[0].title
  const extra = items.length - 1
  return extra > 0 ? `${first} +${extra}` : first
}

const PRIORITY_LABELS: Record<ContactPriority, [string, string, string] | null> = {
  ideal:       ['Ideal contatar agora', '#f97316', 'rgba(249,115,22,0.1)'],
  ainda_vale:  ['Ainda vale tentar',       'var(--admin-text-sec)', 'var(--admin-bg)'],
  esfriando:   ['Esfriando',               'var(--admin-text-muted)', 'var(--admin-bg)'],
  aguardando:  null, // muito recente, cliente pode ainda estar comprando — não mostra badge
}

function PriorityBadge({ priority }: { priority: ContactPriority }) {
  const entry = PRIORITY_LABELS[priority]
  if (!entry) return null
  const [label, color, bg] = entry
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color, background: bg, padding: '3px 9px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
      {priority === 'ideal' ? <Flame size={10} /> : null} {label}
    </span>
  )
}

function StatusBadge({ recovered, operatorStatus }: { recovered: boolean; operatorStatus: string | null }) {
  if (recovered) {
    return <span style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', background: 'rgba(22,163,74,0.1)', padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>Recuperado</span>
  }
  if (operatorStatus === 'contacted') {
    return <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-accent)', background: 'rgba(var(--admin-accent-rgb),0.1)', padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>Contatado</span>
  }
  if (operatorStatus === 'ignored') {
    return <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-muted)', background: 'var(--admin-bg)', padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>Ignorado</span>
  }
  return <span style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', background: 'rgba(217,119,6,0.1)', padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>Abandonado</span>
}

export function RecoveryList({ carts }: { carts: EnrichedCart[] }) {
  const [statuses, setStatuses] = useState<Record<string, string>>({})
  const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  async function registerAction(cartId: string, status: string) {
    setStatuses(prev => ({ ...prev, [cartId]: status }))
    try {
      await fetch('/api/admin/recovery/actions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ yampiCartId: cartId, status }),
      })
    } catch { /* best-effort, não bloqueia a UI */ }
  }

  async function undoAction(cartId: string) {
    setStatuses(prev => ({ ...prev, [cartId]: '' }))
    try {
      await fetch('/api/admin/recovery/actions', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ yampiCartId: cartId }),
      })
    } catch { /* best-effort, não bloqueia a UI */ }
  }

  function handleWhatsapp(cart: EnrichedCart) {
    if (!cart.whatsappUrl) return
    window.open(cart.whatsappUrl, '_blank')
    registerAction(cart.id, 'contacted')
  }

  if (carts.length === 0) {
    return (
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '15px', color: 'var(--admin-text-muted)' }}>Nenhum carrinho abandonado no período 🎉</div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', overflow: 'hidden' }}>
      {carts.map((cart, idx) => {
        const operatorStatus  = statuses[cart.id] !== undefined ? statuses[cart.id] : cart.operatorStatus
        const displayRecovered = cart.autoRecovered || operatorStatus === 'recovered_manual'
        return (
          <div
            key={cart.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px',
              borderBottom: idx < carts.length - 1 ? '1px solid var(--admin-border)' : 'none',
            }}
          >
            {/* Thumbnail */}
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {cart.imageUrl
                ? // eslint-disable-next-line @next/next/no-img-element
                  <img src={cart.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <ImageOff size={16} color="var(--admin-text-muted)" />}
            </div>

            {/* Name + product */}
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)' }}>{cart.customerName ?? 'Cliente'}</div>
              {cart.customerEmail && (
                <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cart.customerEmail}</div>
              )}
              <div style={{ fontSize: '12px', color: 'var(--admin-text-sec)', marginTop: '1px' }}>{itemsSummary(cart.items)}</div>
            </div>

            {/* Value + time */}
            <div style={{ textAlign: 'right', minWidth: '110px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{fmtBrl.format(cart.totalValue)}</div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '1px' }}>{timeSince(cart.createdAt)}</div>
            </div>

            {!displayRecovered && <PriorityBadge priority={cart.priority} />}
            <StatusBadge recovered={displayRecovered} operatorStatus={operatorStatus} />

            {!displayRecovered && (
              <button
                onClick={() => registerAction(cart.id, 'recovered_manual')}
                title="Marcar como recuperado manualmente"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid var(--admin-border)', borderRadius: '8px', padding: '7px 10px', fontSize: '11px', color: 'var(--admin-text-muted)', cursor: 'pointer', flexShrink: 0 }}
              >
                <CheckCircle2 size={13} />
              </button>
            )}

            {displayRecovered && !cart.autoRecovered && operatorStatus === 'recovered_manual' && (
              <button
                onClick={() => undoAction(cart.id)}
                title="Desfazer — cliente desistiu ou pediu estorno"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid var(--admin-border)', borderRadius: '8px', padding: '7px 10px', fontSize: '11px', color: 'var(--admin-text-muted)', cursor: 'pointer', flexShrink: 0 }}
              >
                <Undo2 size={13} /> Desfazer
              </button>
            )}

            <button
              onClick={() => handleWhatsapp(cart)}
              disabled={!cart.whatsappUrl}
              title={cart.whatsappUrl ? 'Abrir WhatsApp com mensagem pronta' : 'Cliente sem telefone'}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                background: cart.whatsappUrl ? '#16a34a' : 'var(--admin-bg)',
                color: cart.whatsappUrl ? '#fff' : 'var(--admin-text-muted)',
                border: 'none', borderRadius: '20px', padding: '8px 16px',
                fontSize: '12px', fontWeight: 600,
                cursor: cart.whatsappUrl ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
              }}
            >
              <MessageCircle size={14} /> Chamar no WhatsApp
            </button>
          </div>
        )
      })}
    </div>
  )
}
