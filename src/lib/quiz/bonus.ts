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

// Cores mais vendidas da loja (pedidos pagos desde 13/07/2026) entre os modelos
// de custo baixo — mesmo critério da JHF. freebieId sai do script de brindes.
export const QUIZ_BONUS: QuizBonus[] = [
  { id: 'flak-preta-preta',      nome: 'Flak Preta Lente Preta',         yampiSku: 301469995, freebieId: 0, variantId: '5a484011-76db-4ee1-baf3-5547f92b4536' },
  { id: 'plantaris-preta',       nome: 'Plantaris Preta',                yampiSku: 301470047, freebieId: 0, variantId: '16905776-a09a-4914-bcc6-93fb6d952da4' },
  { id: 'flak-preta-espelhada',  nome: 'Flak Preta Lente Espelhada',     yampiSku: 301469993, freebieId: 0, variantId: 'e0b8c1dc-39d7-4953-89d1-4787ebb1ac56' },
  { id: 'minute-cristal',        nome: 'Minute Cristal',                 yampiSku: 301470029, freebieId: 0, variantId: 'c89a7be6-7a0c-41c9-b1a3-5e84c34e4940' },
  { id: 'radar-ev-preta-azul',   nome: 'Radar EV Preta Lente Azul',      yampiSku: 301470062, freebieId: 0, variantId: 'e21adbf2-8908-4cdb-b7ac-fe722398fc1a' },
  { id: 'radar-ev-preta-preta',  nome: 'Radar EV Preta Lente Preta',     yampiSku: 301470068, freebieId: 0, variantId: '8754d78e-9138-47a4-8df2-065b34ab09e6' },
  { id: 'minute-cooper-vr28',    nome: 'Minute Cooper Lente VR28',       yampiSku: 301470026, freebieId: 0, variantId: 'ed9e29a4-2d0c-4c4b-a347-4decb9779eb4' },
  { id: 'hstn-preta-preta',      nome: 'HSTN Preta Lente Preta',         yampiSku: 301470012, freebieId: 0, variantId: '2c366ebb-683e-4101-9c11-d63c888e1235' },
]

/** Onde o site guarda o cupom do quiz até o checkout (localStorage). */
export const QUIZ_CUPOM_KEY = 'jr_quiz_cupom'
