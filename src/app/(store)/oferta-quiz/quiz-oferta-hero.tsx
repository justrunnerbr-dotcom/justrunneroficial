'use client'

import Link from 'next/link'
import { Gift, Check } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useQuizCupom, quizCupomLiberado, quizSubtotalPromo } from '@/lib/quiz/client'
import { QUIZ_MIN_SUBTOTAL, QUIZ_PRECO_REFERENCIA } from '@/lib/quiz/bonus'
import { formatPrice } from '@/lib/utils'

const RIBBON = '#f3f4f8'

// Topo da /oferta-quiz: o bônus que a pessoa escolheu no quiz e o progresso do
// carrinho até liberar (subtotal cheio de R$ 594 = 2 óculos [JR] do Compre 1 Leve 2).
export function QuizOfertaHero({ validade }: { validade: string }) {
  const cupom = useQuizCupom()
  const items = useCartStore(s => s.items)
  const openCart = useCartStore(s => s.openCart)

  if (!cupom) {
    return (
      <div style={{ borderRadius: '16px', padding: '28px 20px', background: '#0a0a0a', color: '#f3f4f8', textAlign: 'center' }}>
        <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-poppins), sans-serif' }}>Esta oferta é de quem respondeu o quiz</div>
        <p style={{ color: '#a6a6a6', margin: '8px 0 18px', fontSize: '14px' }}>Responda em 2 minutos e ganhe um óculos de bônus na sua compra.</p>
        <Link href="/quiz" style={{ display: 'inline-block', background: '#f3f4f8', color: '#000', borderRadius: '999px', padding: '12px 26px', fontWeight: 700, textDecoration: 'none' }}>
          Responder o quiz
        </Link>
      </div>
    )
  }

  const subtotal = quizSubtotalPromo(items)
  const liberado = quizCupomLiberado(subtotal)
  const progresso = Math.min(1, subtotal / QUIZ_MIN_SUBTOTAL)
  const oculos = Math.min(2, Math.floor(subtotal / (QUIZ_MIN_SUBTOTAL / 2)))

  return (
    <div style={{ borderRadius: '18px', overflow: 'hidden', background: '#0a0a0a', color: '#f3f4f8' }}>
      <div style={{ height: '4px', background: RIBBON }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '22px', padding: 'clamp(18px, 3vw, 28px)' }}>
        {/* Bônus escolhido */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: 112, height: 112, flexShrink: 0, borderRadius: '14px', background: '#f4f4f5', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {cupom.imagem
              ? <img src={cupom.imagem} alt={cupom.nome ?? 'Óculos bônus'} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <Gift size={36} color="#18181b" />}
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: '#a6a6a6' }}>OFERTA EXCLUSIVA DO QUIZ</div>
            <div style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, lineHeight: 1.15, margin: '4px 0 6px', fontFamily: 'var(--font-poppins), sans-serif' }}>
              Seu óculos bônus está garantido
            </div>
            <div style={{ fontSize: '14px', color: '#d4d4d8' }}>{cupom.nome ?? 'Óculos bônus'}</div>
            <div style={{ fontSize: '14px', marginTop: '2px' }}>
              <s style={{ color: '#71717a' }}>{formatPrice(QUIZ_PRECO_REFERENCIA)}</s>{' '}
              <strong style={{ color: '#4ade80' }}>Grátis</strong>
            </div>
          </div>
        </div>

        {/* Progresso + resumo */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
            <span>{liberado ? 'Bônus liberado!' : `Escolha 2 óculos do Compre 1 Leve 2 (${oculos}/2)`}</span>
            <span style={{ color: '#a6a6a6', fontWeight: 600 }}>até {validade}</span>
          </div>
          <div style={{ height: '8px', borderRadius: '99px', background: '#27272a', overflow: 'hidden' }}>
            <div style={{ width: `${progresso * 100}%`, height: '100%', background: liberado ? '#4ade80' : RIBBON, transition: 'width .3s' }} />
          </div>
          <div style={{ marginTop: '14px', fontSize: '13px', display: 'grid', gap: '4px' }}>
            {[
              ['Óculos 1 da promoção', 'R$ 297'],
              ['Óculos 2 da promoção', 'incluso'],
              [`Bônus: ${cupom.nome ?? 'óculos'}`, 'R$ 0'],
            ].map(([a, b]) => (
              <div key={a} style={{ display: 'flex', justifyContent: 'space-between', color: '#d4d4d8' }}><span>{a}</span><span>{b}</span></div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid #27272a', paddingTop: '6px', marginTop: '2px' }}>
              <span>Total</span><span>R$ 297 · frete grátis</span>
            </div>
          </div>
          {liberado ? (
            <button type="button" onClick={openCart} style={{
              marginTop: '14px', width: '100%', border: 'none', borderRadius: '999px', padding: '13px', cursor: 'pointer',
              background: '#4ade80', color: '#052e16', fontWeight: 800, fontSize: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
              <Check size={16} /> Ver carrinho e finalizar
            </button>
          ) : (
            <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#a6a6a6' }}>
              Seu bônus entra sozinho no checkout. Não é cumulativo com outros cupons.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
