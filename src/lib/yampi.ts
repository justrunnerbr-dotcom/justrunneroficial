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

// A Yampi guarda utm_source/utm_medium/utm_campaign do pedido a partir dos parâmetros
// que chegam na URL do checkout dela — e devolve esses três no payload do webhook
// (ver YampiOrderResource em lib/yampi/sync.ts). Sem repassar nada aqui, todo pedido
// nasce sem atribuição: era o caso até 02/08/2026, quando só 5 de 20 pedidos tinham
// utm_source e nenhum tinha utm_content/utm_term.
//
// Lê o mesmo localStorage que lib/analytics/client.ts escreve (chave `jr_attribution`),
// sem importar aquele módulo — este arquivo também é alcançado por código de servidor.
// A Yampi só tem campo pros três UTMs clássicos; utm_content/utm_term (nome do anúncio
// e do conjunto) chegam no pedido pela página /obrigado, não por aqui.
function attributionParams(): string {
  if (typeof window === 'undefined') return ''
  try {
    const url = new URLSearchParams(window.location.search)
    let stored: Record<string, string> = {}
    const raw = localStorage.getItem('jr_attribution')
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>
      if (!parsed.expires_at || new Date(parsed.expires_at) >= new Date()) stored = parsed
    }
    const parts: string[] = []
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
      const val = url.get(key) || stored[key]
      if (val) parts.push(`${key}=${encodeURIComponent(val)}`)
    }
    return parts.length ? `&${parts.join('&')}` : ''
  } catch {
    return ''
  }
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
    `&store_token=${STORE_TOKEN}&clearCart=1` +
    attributionParams()
  )
}

/**
 * `promocode` é o nome do parâmetro que a Yampi aceita para já entrar no
 * checkout com o cupom aplicado — confirmado batendo no checkout real em
 * 2026-08-08 contra `coupon`, `cupom`, `discount_code` e `coupon_code`, que
 * são silenciosamente ignorados (a página abre normal, só sem o desconto).
 */
export function buildCartCheckoutUrl(
  alias: string,
  items: CartItem[],
  promocode?: string | null
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
    `&store_token=${STORE_TOKEN}&clearCart=1` +
    (promocode ? `&promocode=${encodeURIComponent(promocode)}` : '') +
    attributionParams()
  )
}
