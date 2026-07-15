import type { SupabaseClient } from '@supabase/supabase-js'
import { parseYampiDate, PAID_STATUSES, JHF_STORE_ID } from './sync'

interface YampiOrderRow {
  status?: { data?: { alias?: string } }
  value_total?: string | number
  created_at?: { date?: string } | string
  customer?: {
    data?: {
      name?: string
      email?: string
      phone?: { full_number?: string; formated_number?: string; whatsapp_link?: string }
    }
  }
}

interface CustomerAgg {
  name:              string | null
  email:             string
  phoneWhatsappLink: string | null
  phoneFormatted:    string | null
  totalSpent:        number
  ordersCount:       number
  lastOrderAt:       string | null
}

/**
 * Pagina TODOS os pedidos pagos da Yampi (histórico completo, ~3700+ pedidos) e agrega
 * por cliente (email). Não filtra por catálogo "site oficial" — qualquer cliente que já
 * comprou da marca vale reconquistar. Demora dezenas de segundos (só via botão manual).
 */
export async function syncCustomerPurchaseStats(db: SupabaseClient): Promise<{ synced: number; errors: number; ordersScanned: number }> {
  const alias     = process.env.NEXT_PUBLIC_YAMPI_ALIAS
  const token     = process.env.YAMPI_API_TOKEN
  const secretKey = process.env.YAMPI_SECRET_KEY
  if (!alias || !token || !secretKey) return { synced: 0, errors: 0, ordersScanned: 0 }

  const headers = { 'User-Token': token, 'User-Secret-Key': secretKey, Accept: 'application/json' }
  const byEmail = new Map<string, CustomerAgg>()
  let ordersScanned = 0

  for (let page = 1; page <= 100; page++) {
    const res = await fetch(
      `https://api.dooki.com.br/v2/${alias}/orders?${new URLSearchParams({
        include: 'customer',
        limit:   '100',
        page:    String(page),
      })}`,
      { headers, cache: 'no-store' },
    )
    if (!res.ok) break

    const json = await res.json() as { data?: YampiOrderRow[]; meta?: { pagination?: { total_pages?: number } } }
    const rows = json.data ?? []
    if (rows.length === 0) break

    for (const row of rows) {
      ordersScanned++
      const statusAlias = row.status?.data?.alias ?? ''
      if (!PAID_STATUSES.has(statusAlias)) continue

      const customer = row.customer?.data
      const email = customer?.email?.toLowerCase()
      if (!email) continue

      const total     = parseFloat(String(row.value_total ?? 0)) || 0
      const orderDate = parseYampiDate(row.created_at) ?? null

      const existing = byEmail.get(email) ?? {
        name:              customer?.name ?? null,
        email,
        phoneWhatsappLink: customer?.phone?.whatsapp_link ?? null,
        phoneFormatted:    customer?.phone?.formated_number ?? null,
        totalSpent:        0,
        ordersCount:       0,
        lastOrderAt:       null,
      }

      existing.totalSpent += total
      existing.ordersCount += 1
      if (orderDate && (!existing.lastOrderAt || orderDate > existing.lastOrderAt)) {
        existing.lastOrderAt = orderDate
      }

      byEmail.set(email, existing)
    }

    const totalPages = json.meta?.pagination?.total_pages ?? 1
    if (page >= totalPages) break
  }

  const rows = Array.from(byEmail.values()).map(c => ({
    store_id:            JHF_STORE_ID,
    email:               c.email,
    name:                c.name,
    phone_whatsapp_link: c.phoneWhatsappLink,
    phone_formatted:     c.phoneFormatted,
    total_spent:         c.totalSpent,
    orders_count:        c.ordersCount,
    last_order_at:       c.lastOrderAt,
    synced_at:           new Date().toISOString(),
  }))

  let synced = 0
  let errors = 0
  const BATCH = 200
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await db.from('customer_purchase_stats').upsert(batch, { onConflict: 'store_id,email' })
    if (error) errors += batch.length
    else synced += batch.length
  }

  return { synced, errors, ordersScanned }
}

export function buildWinbackWhatsappUrl(customer: { name: string | null; phoneWhatsappLink: string | null; daysSinceOrder: number }): string | null {
  if (!customer.phoneWhatsappLink) return null
  const firstName = customer.name?.split(' ')[0] ?? ''
  const message =
    `Oi ${firstName}! Faz ${customer.daysSinceOrder} dias que você não aparece por aqui na Just Runner 👀\n\n` +
    'Sentimos sua falta! Dá uma olhada nas novidades:\nhttps://justrunner.com.br\n\n' +
    'Qualquer coisa, é só chamar por aqui.'
  return `${customer.phoneWhatsappLink}&text=${encodeURIComponent(message)}`
}
