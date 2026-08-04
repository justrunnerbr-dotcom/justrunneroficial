/**
 * Fim da promoção "Compre 1 Leve 2".
 *
 * Data fixa e única para todo mundo — todo visitante vê exatamente a mesma
 * contagem, e ela não reinicia a cada sessão (diferente do `UrgencyTimer` da
 * PDP, que é um timer de 20min por sessão).
 *
 * Para prorrogar ou encerrar a promo, muda só esta constante.
 */
export const PROMO_END_ISO = '2026-08-05T23:59:59-03:00'

export const PROMO_END_MS = new Date(PROMO_END_ISO).getTime()

/** Altura da barra em px — precisa bater com o spacer em `(store)/layout.tsx`. */
export const PROMO_BAR_HEIGHT = 48

export function isPromoActive(now: number = Date.now()): boolean {
  return now < PROMO_END_MS
}
