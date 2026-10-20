import { parseYampiDate, PAID_STATUSES } from './sync'

export interface AbandonedCartItem {
  title:          string
  sku:            string | null
  yampiProductId: string | null
  quantity:       number
}

export interface AbandonedCart {
  id:                 string
  customerName:       string | null
  customerEmail:      string | null
  phoneFormatted:      string | null
  whatsappLink:       string | null
  items:              AbandonedCartItem[]
  totalValue:         number
  createdAt:          string
  abandonedStep:      string | null
  checkoutUrl:        string | null
  recoveryEmailsSent: string | null
}

interface YampiCartRow {
  id: number
  totalizers?: { total?: number }
  simulate_url?: string
  created_at: { date: string; timezone: string } | string
  customer?: {
    data?: {
      name?: string
      email?: string
      phone?: { full_number?: string; formated_number?: string; whatsapp_link?: string }
    }
  }
  items?: {
    data?: Array<{
      quantity: number
      sku_id?:  number
      sku?: { data?: { title?: string; sku?: string } }
    }>
  }
  spreadsheet?: {
    data?: { abandoned_step?: string; count_recover_mail_sent?: string }
  }
}

function mapCart(row: YampiCartRow, createdAtISO: string): AbandonedCart {
  const customer = row.customer?.data
  const items = (row.items?.data ?? []).map(i => ({
    title:          i.sku?.data?.title ?? 'Produto',
    sku:            i.sku?.data?.sku ?? null,
    yampiProductId: i.sku_id != null ? String(i.sku_id) : null,
    quantity:       i.quantity ?? 1,
  }))

  return {
    id:                 String(row.id),
    customerName:       customer?.name ?? null,
    customerEmail:      customer?.email ?? null,
    phoneFormatted:      customer?.phone?.formated_number ?? null,
    whatsappLink:       customer?.phone?.whatsapp_link ?? null,
    items,
    totalValue:         row.totalizers?.total ?? 0,
    createdAt:          createdAtISO,
    abandonedStep:      row.spreadsheet?.data?.abandoned_step ?? null,
    checkoutUrl:        row.simulate_url ?? null,
    recoveryEmailsSent: row.spreadsheet?.data?.count_recover_mail_sent ?? null,
  }
}

/**
 * Busca carrinhos abandonados direto da Yampi (checkout/carts) — não é persistido no
 * nosso banco, sempre ao vivo (mesmo padrão de getMetaLiveCampaigns). Pagina só o
 * necessário: para de buscar assim que encontra um carrinho mais antigo que `since`.
 */
export async function getAbandonedCarts(since: string, until: string): Promise<AbandonedCart[]> {
  const alias     = process.env.NEXT_PUBLIC_YAMPI_ALIAS
  const token     = process.env.YAMPI_API_TOKEN
  const secretKey = process.env.YAMPI_SECRET_KEY
  if (!alias || !token || !secretKey) return []

  const headers = { 'User-Token': token, 'User-Secret-Key': secretKey, Accept: 'application/json' }
  const sinceMs = new Date(`${since}T00:00:00-03:00`).getTime()
  const untilMs = new Date(`${until}T23:59:59-03:00`).getTime()

  const results: AbandonedCart[] = []

  try {
    for (let page = 1; page <= 6; page++) {
      const res = await fetch(
        `https://api.dooki.com.br/v2/${alias}/checkout/carts?${new URLSearchParams({
          include: 'customer,items',
          limit:   '100',
          sort:    '-created_at',
          page:    String(page),
        })}`,
        { headers, cache: 'no-store' },
      )
      if (!res.ok) break

      const json = await res.json() as { data?: YampiCartRow[]; meta?: { pagination?: { total_pages?: number } } }
      const rows = json.data ?? []
      if (rows.length === 0) break

      let hitOlderThanRange = false
      for (const row of rows) {
        const createdAtISO = parseYampiDate(row.created_at)
        if (!createdAtISO) continue
        const createdMs = new Date(createdAtISO).getTime()
        if (createdMs < sinceMs) { hitOlderThanRange = true; break }
        if (createdMs > untilMs) continue
        results.push(mapCart(row, createdAtISO))
      }
      if (hitOlderThanRange) break

      const totalPages = json.meta?.pagination?.total_pages ?? 1
      if (page >= totalPages) break
    }
  } catch {
    return results
  }

  return results
}

/**
 * Busca direto da Yampi (sem filtro de catálogo "site oficial", diferente da nossa
 * tabela `orders`) os emails de clientes com pedido pago desde `since` — usado pra
 * detectar carrinho recuperado sem a lacuna do filtro SO (cliente que recuperou
 * comprando um produto legado nunca apareceria na nossa tabela local).
 */
export async function getRecentPaidCustomerEmails(since: string): Promise<Set<string>> {
  const alias     = process.env.NEXT_PUBLIC_YAMPI_ALIAS
  const token     = process.env.YAMPI_API_TOKEN
  const secretKey = process.env.YAMPI_SECRET_KEY
  const emails    = new Set<string>()
  if (!alias || !token || !secretKey) return emails

  const headers = { 'User-Token': token, 'User-Secret-Key': secretKey, Accept: 'application/json' }
  const sinceMs = new Date(`${since}T00:00:00-03:00`).getTime()

  try {
    for (let page = 1; page <= 20; page++) {
      const res = await fetch(
        `https://api.dooki.com.br/v2/${alias}/orders?${new URLSearchParams({
          include: 'customer',
          limit:   '100',
          sort:    '-created_at',
          page:    String(page),
        })}`,
        { headers, cache: 'no-store' },
      )
      if (!res.ok) break

      const json = await res.json() as {
        data?: Array<{ status?: { data?: { alias?: string } }; created_at?: { date?: string } | string; customer?: { data?: { email?: string } } }>
        meta?: { pagination?: { total_pages?: number } }
      }
      const rows = json.data ?? []
      if (rows.length === 0) break

      let hitOlderThanRange = false
      for (const row of rows) {
        const createdAtISO = parseYampiDate(row.created_at)
        if (!createdAtISO) continue
        if (new Date(createdAtISO).getTime() < sinceMs) { hitOlderThanRange = true; break }

        const statusAlias = row.status?.data?.alias ?? ''
        const email = row.customer?.data?.email
        if (email && PAID_STATUSES.has(statusAlias)) emails.add(email.toLowerCase())
      }
      if (hitOlderThanRange) break

      const totalPages = json.meta?.pagination?.total_pages ?? 1
      if (page >= totalPages) break
    }
  } catch {
    return emails
  }

  return emails
}

export interface RecoveredOrder {
  orderId:    string
  email:      string
  name:       string | null
  totalValue: number
  status:     string
  createdAt:  string
}

/**
 * Busca pedidos aprovados na Yampi com a tag de recuperação de carrinho abandonado
 * (utm_campaign contendo "carrinho_abandonado") — esse é o sinal correto de recuperação,
 * bem mais confiável que tentar cruzar por e-mail/telefone/CPF contra a lista atual de
 * carrinhos abandonados. Motivo: quando um carrinho é recuperado, ele SAI da lista de
 * abandonados (vira pedido), então cruzar contra a lista atual perde a maioria dos casos.
 */
export async function getRecoveredOrders(since: string, until: string): Promise<RecoveredOrder[]> {
  const alias     = process.env.NEXT_PUBLIC_YAMPI_ALIAS
  const token     = process.env.YAMPI_API_TOKEN
  const secretKey = process.env.YAMPI_SECRET_KEY
  const results: RecoveredOrder[] = []
  if (!alias || !token || !secretKey) return results

  const headers = { 'User-Token': token, 'User-Secret-Key': secretKey, Accept: 'application/json' }
  const sinceMs = new Date(`${since}T00:00:00-03:00`).getTime()
  const untilMs = new Date(`${until}T23:59:59-03:00`).getTime()

  try {
    for (let page = 1; page <= 20; page++) {
      const res = await fetch(
        `https://api.dooki.com.br/v2/${alias}/orders?${new URLSearchParams({
          include: 'customer',
          limit:   '100',
          sort:    '-created_at',
          page:    String(page),
        })}`,
        { headers, cache: 'no-store' },
      )
      if (!res.ok) break

      const json = await res.json() as {
        data?: Array<{
          id: number
          status?: { data?: { alias?: string } }
          created_at?: { date?: string } | string
          value_total?: string | number
          utm_campaign?: string | null
          customer?: { data?: { email?: string; name?: string } }
        }>
        meta?: { pagination?: { total_pages?: number } }
      }
      const rows = json.data ?? []
      if (rows.length === 0) break

      let hitOlderThanRange = false
      for (const row of rows) {
        const createdAtISO = parseYampiDate(row.created_at)
        if (!createdAtISO) continue
        const createdMs = new Date(createdAtISO).getTime()
        if (createdMs < sinceMs) { hitOlderThanRange = true; break }
        if (createdMs > untilMs) continue

        const statusAlias = row.status?.data?.alias ?? ''
        const email = row.customer?.data?.email
        const isRecoveryTag = (row.utm_campaign ?? '').toLowerCase().includes('carrinho_abandonado')
        if (email && isRecoveryTag && PAID_STATUSES.has(statusAlias)) {
          results.push({
            orderId:    String(row.id),
            email:      email.toLowerCase(),
            name:       row.customer?.data?.name ?? null,
            totalValue: parseFloat(String(row.value_total ?? 0)) || 0,
            status:     statusAlias,
            createdAt:  createdAtISO,
          })
        }
      }
      if (hitOlderThanRange) break

      const totalPages = json.meta?.pagination?.total_pages ?? 1
      if (page >= totalPages) break
    }
  } catch {
    return results
  }

  return results
}

// 19/10/2026: mensagem por etapa em que a pessoa parou + oferta atual (1 por R$ 175, 2 por R$ 297 com frete
// grátis). Sem urgência inventada. Carrinho antigo com 1 óculos de R$ 297 (SKU JR-) leva pra loja, não pro
// carrinho salvo: o carrinho salvo cobraria R$ 297 por 1, e o site hoje vende por R$ 175.
export function buildWhatsappMessage(cart: AbandonedCart): string {
  const limpa = (t: string) => t.replace(/^\[JR(?: OP| COMBO)?\]\s*/, '').replace(/\s{2,}/g, ' · ').trim()
  const first = cart.items[0]
  const extra = cart.items.length - 1
  const productText = extra > 0
    ? `${limpa(first?.title ?? 'um produto')} e mais ${extra} ${extra === 1 ? 'item' : 'itens'}`
    : limpa(first?.title ?? 'um produto')
  const firstName = cart.customerName?.split(' ')[0] ?? ''
  const oculos = cart.items.filter(i => !/COMBO|CASE/i.test(`${i.sku ?? ''} ${i.title}`)).reduce((a, i) => a + i.quantity, 0)
  const soCombo = oculos === 0
  const umAntigo = oculos === 1 && cart.items.length === 1 && /^JR-/.test(cart.items[0]?.sku ?? '')
  const link = umAntigo ? 'https://justrunner.com.br/colecao/compre-1-leve-2' : (cart.checkoutUrl ?? 'https://justrunner.com.br')

  let msg = `Oi ${firstName}! Aqui é da Just Runner 🕶️ Vi que você separou ${productText} e não finalizou.\n\n`
  if (cart.abandonedStep === 'shippment') msg += 'Ficou alguma dúvida na parte da entrega, prazo ou frete? Me conta que eu te ajudo.\n\n'
  else if (cart.abandonedStep === 'payment') msg += 'Travou alguma coisa no pagamento? Dá pra pagar no Pix ou em até 12x no cartão.\n\n'
  else msg += 'Ficou com alguma dúvida? Me conta que eu te ajudo.\n\n'
  if (!soCombo) msg += oculos >= 2 ? 'Seus 2 óculos saem por R$ 297, com frete grátis.\n\n' : 'Hoje é 1 óculos por R$ 175, ou 2 por R$ 297 com frete grátis.\n\n'
  msg += `${umAntigo ? 'É só escolher por aqui' : 'Seu carrinho está salvo, é só finalizar por aqui'}:\n${link}`
  return msg
}

export function buildWhatsappUrl(cart: AbandonedCart): string | null {
  if (!cart.whatsappLink) return null
  const message = buildWhatsappMessage(cart)
  return `${cart.whatsappLink}&text=${encodeURIComponent(message)}`
}
