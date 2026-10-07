// Quiz do cliente (07/10/2026, mesma lógica da JHF): o óculos de bônus sai como
// BRINDE da Yampi com regra 'promocode' — só entra no pedido pelo cupom único
// que o quiz gera pra cada pessoa. O cupom exige pedido de R$ 594 no valor CHEIO
// (2 óculos [JR] do Compre 1 Leve 2; 1 óculos sozinho dá "Cupom inválido") e
// vale uma vez. Ver scripts/_quiz-cria-brindes.mjs.

/** Fim da promoção: 31/10/2026 23:59:59 em São Paulo. */
export const QUIZ_VALIDADE = '2026-10-31 23:59:59'
export const QUIZ_VALIDADE_LABEL = '31/10'
/** Subtotal cheio mínimo pro cupom liberar o brinde: 2 × R$ 297. */
export const QUIZ_MIN_SUBTOTAL = 594
/** Preço de referência mostrado no card ("de R$ 175 por R$ 0"). */
export const QUIZ_PRECO_REFERENCIA = 175
/** Destino depois de escolher o bônus: a vitrine exclusiva de quem respondeu. */
export const QUIZ_DESTINO = '/oferta-quiz'

export interface QuizBonus {
  /** id estável usado no front e salvo na resposta. */
  id: string
  nome: string
  /** SKU da versão [JR OP] na Yampi — o item que o brinde entrega. */
  yampiSku: number
  /** Brinde (pricing/freebies) que o cupom do quiz aponta. */
  freebieId: number
  /** Variação no Supabase, pra buscar a foto. */
  variantId: string
}

// Escolhidos pelo dono em 07/10/2026 (versão [JR OP] de cada um).
// Brindes criados por scripts/_quiz-cria-brindes.mjs.
export const QUIZ_BONUS: QuizBonus[] = [
  { id: 'hstn-preta',            nome: 'HSTN Preta Lente Preta',          yampiSku: 301470012, freebieId: 8057, variantId: '2c366ebb-683e-4101-9c11-d63c888e1235' },
  { id: 'flak-preta',            nome: 'Flak Preta Lente Preta',          yampiSku: 301469995, freebieId: 8058, variantId: '5a484011-76db-4ee1-baf3-5547f92b4536' },
  { id: 'flak-espelhada',        nome: 'Flak Preta Lente Espelhada',      yampiSku: 301469993, freebieId: 8059, variantId: 'e0b8c1dc-39d7-4953-89d1-4787ebb1ac56' },
  { id: 'minute-preta',          nome: 'Minute Preta Lente Preta',        yampiSku: 303265721, freebieId: 8060, variantId: '2d0b03c5-1d1c-4d2d-b9fc-05eeb6174642' },
  { id: 'minute-cooper',         nome: 'Minute Cooper Lente VR28',        yampiSku: 301470026, freebieId: 8061, variantId: 'ed9e29a4-2d0c-4c4b-a347-4decb9779eb4' },
  { id: 'radar-ev-preta',        nome: 'Radar EV Preta Lente Preta',      yampiSku: 301470068, freebieId: 8062, variantId: '8754d78e-9138-47a4-8df2-065b34ab09e6' },
  { id: 'plantaris-preta',       nome: 'Plantaris Preta',                 yampiSku: 301470047, freebieId: 8063, variantId: '16905776-a09a-4914-bcc6-93fb6d952da4' },
  { id: 'eye-jacket-redux-preta', nome: 'Eye Jacket Redux Preta Lente Preta', yampiSku: 303265724, freebieId: 8064, variantId: '1217ea4e-1ef4-4b7a-b8ae-369c5f151de8' },
]

/** Onde o site guarda o cupom do quiz até o checkout (localStorage). */
export const QUIZ_CUPOM_KEY = 'jr_quiz_cupom'
