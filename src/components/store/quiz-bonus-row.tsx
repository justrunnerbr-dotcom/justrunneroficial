'use client'

import { Gift, Check } from 'lucide-react'
import { useQuizCupom, quizCupomLiberado } from '@/lib/quiz/client'
import { QUIZ_MIN_SUBTOTAL, QUIZ_PRECO_REFERENCIA } from '@/lib/quiz/bonus'
import { formatPrice } from '@/lib/utils'

// Linha fixa do bônus do quiz no carrinho. O brinde em si é entregue pela Yampi
// no checkout (cupom → brinde), então aqui ele não é item do carrinho: é um
// aviso visual de que ele está garantido e do que falta pra liberar.
export function QuizBonusRow({ subtotalCheio }: { subtotalCheio: number }) {
  const cupom = useQuizCupom()
  if (!cupom) return null
  const liberado = quizCupomLiberado(subtotalCheio)
  const falta = Math.max(0, QUIZ_MIN_SUBTOTAL - subtotalCheio)

  return (
    <div
      className="cart-row"
      style={{
        display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: '9px', alignItems: 'start',
        padding: '9px 8px', margin: '4px 0', borderRadius: '8px',
        background: liberado ? '#f0fdf4' : '#fafafa',
        border: `1px dashed ${liberado ? '#16a34a' : '#d4d4d8'}`,
      }}
    >
      <div style={{ width: 48, height: 48, borderRadius: '6px', overflow: 'hidden', background: '#f4f4f5', position: 'relative' }}>
        {cupom.imagem
          ? <img src={cupom.imagem} alt={cupom.nome ?? 'Óculos bônus'} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          : <Gift size={22} style={{ margin: '13px' }} />}
      </div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#18181b', lineHeight: 1.3, fontFamily: 'var(--font-poppins), sans-serif' }}>
          🎁 Bônus do quiz
        </div>
        <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '4px' }}>{cupom.nome ?? 'Seu óculos bônus'}</div>
        {liberado ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#15803d' }}>
            <Check size={12} /> Liberado — entra no checkout
          </div>
        ) : (
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#b45309' }}>
            {subtotalCheio === 0
              ? 'Escolha 2 óculos do Compre 1 Leve 2 pra liberar'
              : `Falta ${formatPrice(falta)} em óculos do Compre 1 Leve 2 pra liberar`}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
        <span style={{ fontSize: '11px', color: '#4b5563', textDecoration: 'line-through', fontWeight: 600 }}>{formatPrice(QUIZ_PRECO_REFERENCIA)}</span>
        <span style={{ fontSize: '14px', fontWeight: 800, color: '#18181b', fontFamily: 'var(--font-poppins), sans-serif' }}>Grátis</span>
      </div>
    </div>
  )
}
