import type { CartItem } from '@/lib/types'

// Promoção nova e independente da "JHF SITE OFICIAL - COMPRE 1 LEVE 2" (regra
// nativa da Yampi, em produção). Não substitui, não desativa e não interfere
// nela — ver PROMPT CLAUDE 55. Enquanto PROGRESSIVE_OFFER_STATUS for 'draft',
// isso não deve ser exibido nem aplicado no site público.
export const PROGRESSIVE_OFFER_ID = 'jhf-progressive-offer'
export const PROGRESSIVE_OFFER_NAME = 'JHF Oferta Progressiva'
export const PROGRESSIVE_OFFER_STATUS: 'draft' | 'active' = 'draft'

const ELIGIBLE_MIN_PRICE = 90
const MAX_TIER_COUNT = 4
const OVER_CAP_MESSAGE =
  'Oferta válida até 4 óculos. Para mais unidades, fale com atendimento.'

export interface ProgressiveOfferGift {
  variantId: string
  productName: string
  variantName: string
  sku: string
  yampiProductId: string
}

// Brindes definidos no PROMPT CLAUDE 55 (2026-07-06) — nome/SKU sem ambiguidade,
// mesmo preço R$297 do resto do catálogo.
export const FLAK_GIFT: ProgressiveOfferGift = {
  variantId: 'acda8bba-3762-4880-a91f-f3f69c20a8a7',
  productName: 'Flak 2.0',
  variantName: 'Preta Lente Preta',
  sku: 'JHF-FLAK_20_PRETA_LENTE_PRETA',
  yampiProductId: '300729089',
}

export const MINUTE_GIFT: ProgressiveOfferGift = {
  variantId: 'dcc5ba3d-c1eb-44c5-842a-60d3189bffa1',
  productName: 'Minute',
  variantName: 'Cooper Lente Dark Ruby',
  sku: 'JHF-MINUTE_COOPER_LENTE_DARK_RUBY',
  yampiProductId: '300729153',
}

// Se um brinde já estiver como linha do carrinho (ex: integração futura), ele
// nunca deve contar como item elegível pra recalcular o próprio tier.
const GIFT_VARIANT_IDS = new Set([FLAK_GIFT.variantId, MINUTE_GIFT.variantId])

export interface ProgressiveOfferTier {
  count: number
  total: number
  gifts: ProgressiveOfferGift[]
}

export const PROGRESSIVE_OFFER_TIERS: ProgressiveOfferTier[] = [
  { count: 1, total: 175, gifts: [] },
  { count: 2, total: 297, gifts: [] },
  { count: 3, total: 419, gifts: [FLAK_GIFT] },
  { count: 4, total: 549, gifts: [FLAK_GIFT, MINUTE_GIFT] },
]

export interface ProgressiveOfferResult {
  promotionId: string
  promotionName: string
  eligibleCount: number
  tier: ProgressiveOfferTier | null
  subtotal: number
  discount: number
  total: number
  giftsToAdd: ProgressiveOfferGift[]
  nextTierMessage: string | null
  overCapMessage: string | null
  yampiCheckoutItems: CartItem[]
}

function isEligible(item: CartItem): boolean {
  return item.price >= ELIGIBLE_MIN_PRICE && !GIFT_VARIANT_IDS.has(item.variantId)
}

function tierForCount(count: number): ProgressiveOfferTier | null {
  if (count <= 0) return null
  const capped = Math.min(count, MAX_TIER_COUNT)
  return PROGRESSIVE_OFFER_TIERS.find((t) => t.count === capped) ?? null
}

function buildNextTierMessage(eligibleCount: number): string | null {
  const next = PROGRESSIVE_OFFER_TIERS.find((t) => t.count > eligibleCount)
  if (!next) return null
  const missing = next.count - eligibleCount
  if (next.gifts.length > 0) {
    const giftNames = next.gifts.map((g) => g.productName).join(' + ')
    return `Adicione mais ${missing} óculos e ganhe ${giftNames}`
  }
  return `Adicione mais ${missing} óculos por R$${next.total}`
}

// 5+ itens: teto visual no tier 4 (mesmo preço/brindes de 4), com aviso
// explícito de limite via overCapMessage — MVP recomendado no PROMPT CLAUDE 55,
// pendente de decisão final do usuário sobre uma faixa própria pra 5+.
export function calculateProgressiveOffer(items: CartItem[]): ProgressiveOfferResult {
  const eligibleItems = items.filter(isEligible)
  const eligibleCount = eligibleItems.reduce((sum, i) => sum + i.quantity, 0)
  const eligibleSubtotal = eligibleItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const nonEligibleSubtotal = items
    .filter((i) => !isEligible(i))
    .reduce((sum, i) => sum + i.price * i.quantity, 0)

  const subtotal = eligibleSubtotal + nonEligibleSubtotal
  const tier = tierForCount(eligibleCount)
  const discount = tier ? Math.max(0, eligibleSubtotal - tier.total) : 0
  const total = subtotal - discount

  return {
    promotionId: PROGRESSIVE_OFFER_ID,
    promotionName: PROGRESSIVE_OFFER_NAME,
    eligibleCount,
    tier,
    subtotal,
    discount,
    total,
    giftsToAdd: tier?.gifts ?? [],
    nextTierMessage: buildNextTierMessage(eligibleCount),
    overCapMessage: eligibleCount > MAX_TIER_COUNT ? OVER_CAP_MESSAGE : null,
    yampiCheckoutItems: items,
  }
}
