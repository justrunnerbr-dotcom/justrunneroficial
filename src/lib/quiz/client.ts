'use client'

import { useSyncExternalStore } from 'react'
import { QUIZ_CUPOM_KEY, QUIZ_MIN_SUBTOTAL } from './bonus'

// Cupom do bônus do quiz guardado no navegador até o checkout. Lido pelos
// montadores de link da Yampi (src/lib/yampi.ts), que o mandam como
// &promocode= — a Yampi aplica sozinho (testado em 07/10/2026) — e pela linha
// do bônus no carrinho e pela página /oferta-quiz.

export interface QuizCupomSalvo {
  code: string
  bonus: string
  nome?: string
  imagem?: string | null
  savedAt: string
}

const FORMATO = /^QUIZ[A-Z0-9]{6}$/
const EVENTO = 'jr-quiz-cupom'

export function saveQuizCupom(code: string, bonus: { id: string; nome: string; imagem: string | null }) {
  try {
    const v: QuizCupomSalvo = { code, bonus: bonus.id, nome: bonus.nome, imagem: bonus.imagem, savedAt: new Date().toISOString() }
    localStorage.setItem(QUIZ_CUPOM_KEY, JSON.stringify(v))
    window.dispatchEvent(new Event(EVENTO))
  } catch { /* storage bloqueado */ }
}

function readRaw(): string | null {
  try { return localStorage.getItem(QUIZ_CUPOM_KEY) } catch { return null }
}

function parse(raw: string | null): QuizCupomSalvo | null {
  try {
    const v = JSON.parse(raw ?? 'null') as QuizCupomSalvo | null
    return v && FORMATO.test(v.code) ? v : null
  } catch { return null }
}

export function getQuizCupom(): QuizCupomSalvo | null {
  if (typeof window === 'undefined') return null
  return parse(readRaw())
}

/** O cupom só libera o brinde em pedido de R$ 297 pra cima. */
export function quizCupomLiberado(subtotalCheio: number): boolean {
  return subtotalCheio >= QUIZ_MIN_SUBTOTAL
}

/** Subtotal do carrinho inteiro: desde 27/10 a regra é pedido de R$ 297 pra cima,
 *  qualquer óculos (a Yampi confere o mínimo no subtotal). */
export function quizSubtotalPromo(items: { price: number; quantity: number }[]): number {
  return items.reduce((s, i) => s + i.price * i.quantity, 0)
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENTO, cb)
  window.addEventListener('storage', cb)
  return () => { window.removeEventListener(EVENTO, cb); window.removeEventListener('storage', cb) }
}

/** Cupom salvo, reativo (muda na hora em que o quiz salva). null no servidor. */
export function useQuizCupom(): QuizCupomSalvo | null {
  // A string bruta é o snapshot (estável entre leituras); o parse é feito fora.
  const raw = useSyncExternalStore(subscribe, readRaw, () => null)
  return parse(raw)
}
