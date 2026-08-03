import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildSingleCheckoutUrl, buildCartCheckoutUrl } from '@/lib/yampi'
import type { CartItem } from '@/lib/types'

// Os testes deste arquivo estavam vermelhos desde 11/07/2026: ainda esperavam o
// formato antigo herdado da JHF (`{alias}.yampi.com.br/checkout/{sku}/t` e
// `sku[]=id:qtd`), que deixou de existir quando o domínio de checkout foi corrigido
// para `seguro.{dominio}/cart/items`. Atualizados aqui para o formato real.

const item = (over: Partial<CartItem>): CartItem => ({
  variantId: 'v1',
  productId: 'p1',
  productName: 'Flak',
  variantName: 'Preto',
  price: 297,
  imageUrl: null,
  quantity: 1,
  yampiProductId: 'yampi-111',
  ...over,
})

describe('yampi URL builder', () => {
  const alias = 'justrunnerbr'

  it('builds single product checkout URL', () => {
    const url = buildSingleCheckoutUrl(alias, 'yampi-456')
    expect(url).toContain('/cart/items')
    expect(url).toContain('product_option_id%5B%5D=yampi-456')
    expect(url).toContain('quantity%5B%5D=1')
    expect(url).toContain('skipToCheckout=1')
  })

  it('returns null when yampiProductId is missing', () => {
    expect(buildSingleCheckoutUrl(alias, null)).toBeNull()
  })

  it('builds cart checkout URL with multiple items', () => {
    const items = [
      item({ quantity: 2, yampiProductId: 'yampi-111' }),
      item({ variantId: 'v2', productId: 'p2', quantity: 1, yampiProductId: 'yampi-222' }),
    ]
    const url = buildCartCheckoutUrl(alias, items)
    expect(url).toContain('product_option_id%5B%5D=yampi-111&quantity%5B%5D=2')
    expect(url).toContain('product_option_id%5B%5D=yampi-222&quantity%5B%5D=1')
  })

  it('skips items without yampiProductId in cart checkout', () => {
    expect(buildCartCheckoutUrl(alias, [item({ yampiProductId: null })])).toBeNull()
  })
})

// A Yampi só grava utm_source/utm_medium/utm_campaign do que chega na URL do
// checkout dela. Sem repassar, o pedido nasce sem atribuição — era o caso de 15 dos
// 20 pedidos até 02/08/2026.
describe('atribuição repassada ao checkout', () => {
  afterEach(() => {
    localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('não anexa nada quando não há atribuição', () => {
    const url = buildCartCheckoutUrl('justrunnerbr', [item({})])
    expect(url).not.toContain('utm_')
  })

  it('anexa os UTMs vindos do localStorage', () => {
    localStorage.setItem('jr_attribution', JSON.stringify({
      utm_source: 'ig',
      utm_medium: 'paid_social',
      utm_campaign: '14 - [ABO] TESTE',
      utm_content: 'V18 - Corredor (OP)',
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    }))
    const url = buildCartCheckoutUrl('justrunnerbr', [item({})])
    expect(url).toContain('utm_source=ig')
    expect(url).toContain('utm_medium=paid_social')
    expect(url).toContain(`utm_campaign=${encodeURIComponent('14 - [ABO] TESTE')}`)
    // utm_content não vai por aqui: a Yampi não tem campo pra ele. Chega no pedido
    // pela página /obrigado.
    expect(url).not.toContain('utm_content')
  })

  it('ignora atribuição expirada', () => {
    localStorage.setItem('jr_attribution', JSON.stringify({
      utm_source: 'antigo',
      expires_at: new Date(Date.now() - 1000).toISOString(),
    }))
    expect(buildCartCheckoutUrl('justrunnerbr', [item({})])).not.toContain('utm_source')
  })

  it('a URL atual tem prioridade sobre o localStorage', () => {
    localStorage.setItem('jr_attribution', JSON.stringify({
      utm_source: 'velho',
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    }))
    window.history.replaceState({}, '', '/?utm_source=novo')
    expect(buildCartCheckoutUrl('justrunnerbr', [item({})])).toContain('utm_source=novo')
  })

  it('sobrevive a localStorage com JSON inválido', () => {
    localStorage.setItem('jr_attribution', '{quebrado')
    expect(buildCartCheckoutUrl('justrunnerbr', [item({})])).toContain('/cart/items')
  })
})
