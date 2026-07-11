import type { CartItem } from './types'

// store_token público da loja (visível nos redirects de /r/TOKEN)
const STORE_TOKEN = 'BDMGAOde7Xbg3YDZxV5e7IJb5rkqTGKHZJ2SaUtU'

// O domínio de checkout da Yampi não é "{alias}.yampi.com.br" (não resolve) —
// é um domínio customizado no formato "seguro.{domínio da loja}", confirmado
// batendo direto no domínio (retorna os cookies de carrinho da Yampi e
// redireciona pro /checkout). Deriva de NEXT_PUBLIC_SITE_URL.
function getCheckoutDomain(alias: string): string {
  if (alias.includes('.')) return alias
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl) {
    try {
      return `seguro.${new URL(siteUrl).hostname}`
    } catch {
      // falls through to the yampi.com.br fallback below
    }
  }
  return `${alias}.yampi.com.br`
}

export function buildSingleCheckoutUrl(
  alias: string,
  skuId: string | null
): string | null {
  if (!skuId) return null
  const domain = getCheckoutDomain(alias)
  return (
    `https://${domain}/cart/items` +
    `?product_option_id%5B%5D=${skuId}` +
    `&quantity%5B%5D=1` +
    `&redirectTo=checkout&skipToCheckout=1` +
    `&store_token=${STORE_TOKEN}&clearCart=1`
  )
}

export function buildCartCheckoutUrl(
  alias: string,
  items: CartItem[]
): string | null {
  const validItems = items.filter((i) => i.yampiProductId)
  if (validItems.length === 0) return null

  const domain = getCheckoutDomain(alias)

  const productParams = validItems
    .map((i) => `product_option_id%5B%5D=${i.yampiProductId}&quantity%5B%5D=${i.quantity}`)
    .join('&')

  return (
    `https://${domain}/cart/items` +
    `?${productParams}` +
    `&redirectTo=checkout&skipToCheckout=1` +
    `&store_token=${STORE_TOKEN}&clearCart=1`
  )
}
