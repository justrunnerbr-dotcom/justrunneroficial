import { SupabaseClient } from '@supabase/supabase-js'
import { isSiteOficialOrder } from './so-products'
import { sendCapiPurchase, sendCapiEvent, hashEmail, hashPhone, hashExternalId } from '@/lib/meta/capi'

export const JHF_STORE_ID = 'b0000000-0000-0000-0000-000000000001'

export const PAID_STATUSES = new Set([
  'paid',
  'payment_confirmed',
  'invoiced',        // nota fiscal emitida = pago
  'on_carriage',     // em transporte = pago e enviado
  'preparing_shipping',
  'in_separation',
  'partially_separated',
  'in_transit',
  'delivered',
])

// Yampi retorna created_at/updated_at como { date: "YYYY-MM-DD HH:mm:ss.uuuuuu", timezone: "America/Sao_Paulo" },
// sem offset explícito na string — new Date(date) seria interpretado como UTC no runtime (Vercel), errando 3h.
// Brasil é permanentemente UTC-3 (sem horário de verão desde 2019).
export function parseYampiDate(input?: { date?: string } | string): string | undefined {
  if (typeof input === 'string') return input
  if (!input?.date) return undefined
  const isoLocal = input.date.replace(' ', 'T').slice(0, 19)
  return new Date(`${isoLocal}-03:00`).toISOString()
}

export function mapYampiStatus(alias: string): string {
  if (PAID_STATUSES.has(alias)) return 'paid'
  if (alias === 'waiting_payment') return 'pending'
  if (alias === 'canceled') return 'cancelled'
  if (alias === 'refunded') return 'refunded'
  return alias
}

export interface YampiOrderResource {
  data: {
    id: number
    number?: string
    token?: string
    status?: { data?: { alias: string } }
    payments?: unknown
    value_total?: string | number
    value_products?: string | number
    value_discount?: string | number
    value_shipment?: string | number
    created_at?: { date?: string } | string
    customer?: {
      data?: {
        id?: number
        first_name?: string
        last_name?: string
        email?: string
        cpf?: string
        phone?: string | { full_number?: string; formated_number?: string }
      }
    }
    items?: {
      data?: Array<{
        product_id?: number | null
        item_sku?: string
        sku?: { data?: { title?: string } }
        price?: string | number
        quantity?: number
        shipment_cost?: string | number
      }>
    }
    utm_source?:   string
    utm_medium?:   string
    utm_campaign?: string
    ip?:           string
  }
}

type YampiPhone = string | { full_number?: string; formated_number?: string } | undefined

// A Yampi devolve full_number/formated_number SEM o codigo do pais (ex: "62992137933",
// so DDD+numero) — a Meta exige o numero completo com codigo do pais pro hash do
// Conversions API bater com o que ela normaliza do lado dela. Sem isso, o campo `ph`
// e enviado mas NUNCA da match (silenciosamente inutil). Numero BR sem 55: 10-11
// digitos (DDD+numero) — prefixa 55. Ja com 55: 12-13 digitos — deixa como esta.
export function normalizePhone(phone: YampiPhone): string | null {
  if (!phone) return null
  const raw = typeof phone === 'string' ? phone : (phone.full_number ?? phone.formated_number ?? null)
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 11) return `55${digits}`
  return digits
}

export async function upsertYampiOrder(
  db: SupabaseClient,
  resource: YampiOrderResource,
  options?: { fireCapiEvents?: boolean },
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const d = resource.data

  if (!isSiteOficialOrder(d.items?.data ?? [])) {
    return { ok: true, skipped: true }
  }

  const externalId = String(d.id)
  const statusAlias = d.status?.data?.alias ?? 'unknown'
  const status = mapYampiStatus(statusAlias)
  const total    = parseFloat(String(d.value_total    ?? 0))
  const subtotal = parseFloat(String(d.value_products ?? 0))
  const discount = parseFloat(String(d.value_discount ?? 0))
  const shipping = parseFloat(String(d.value_shipment ?? 0))
  const createdAt = parseYampiDate(d.created_at)

  const customerData  = d.customer?.data
  const customerEmail = customerData?.email
  const customerPhone = normalizePhone(customerData?.phone)

  // Pra saber se essa é a PRIMEIRA vez que o pedido vira pago (dispara Purchase no CAPI
  // só nessa transição) — sem isso, uma sincronização manual/backfill de pedidos antigos
  // dispararia Purchase retroativo pra centenas de pedidos já contados há muito tempo.
  let previousStatus: string | null = null
  if (options?.fireCapiEvents) {
    const { data: existingOrder } = await db
      .from('orders')
      .select('status')
      .eq('store_id', JHF_STORE_ID)
      .eq('external_id', externalId)
      .maybeSingle()
    previousStatus = existingOrder?.status ?? null
  }

  let customerId: string | null = null
  if (customerEmail) {
    const customerName = [customerData?.first_name, customerData?.last_name]
      .filter(Boolean).join(' ') || null

    const { data: existing } = await db
      .from('customers')
      .select('id')
      .eq('store_id', JHF_STORE_ID)
      .eq('email', customerEmail)
      .single()

    if (existing) {
      customerId = existing.id
    } else {
      const { data: newCustomer } = await db.from('customers').insert({
        store_id:    JHF_STORE_ID,
        external_id: String(customerData?.id ?? ''),
        email:       customerEmail,
        name:        customerName,
        phone:       customerPhone,
        document:    customerData?.cpf ?? null,
        source:      'yampi',
      }).select('id').single()
      if (newCustomer) customerId = newCustomer.id
    }
  }

  const { data: order, error: orderError } = await db.from('orders').upsert(
    {
      store_id:         JHF_STORE_ID,
      external_id:      externalId,
      customer_id:      customerId,
      customer_snapshot: customerData ?? {},
      status,
      payment_status:   status,
      subtotal,
      discount_amount:  discount,
      shipping_amount:  shipping,
      total,
      payment_method:   null,
      utm_source:       d.utm_source ?? null,
      utm_medium:       d.utm_medium ?? null,
      utm_campaign:     d.utm_campaign ?? null,
      updated_at:       new Date().toISOString(),
      ...(createdAt ? { created_at: createdAt } : {}),
    },
    { onConflict: 'store_id,external_id' },
  ).select('id').single()

  if (orderError) return { ok: false, error: orderError.message }
  if (!order) return { ok: false, error: 'no order returned' }

  const items = d.items?.data ?? []
  if (items.length > 0) {
    await db.from('order_items').delete().eq('order_id', order.id)
    await db.from('order_items').insert(
      items.map((item) => {
        const price    = parseFloat(String(item.price ?? 0))
        const quantity = item.quantity ?? 1
        return {
          store_id:      JHF_STORE_ID,
          order_id:      order.id,
          product_title: item.sku?.data?.title ?? item.item_sku ?? 'Produto',
          variant_title: item.sku?.data?.title ?? null,
          sku:           item.item_sku ?? null,
          price,
          quantity,
          total:         price * quantity,
        }
      }),
    )
  }

  if (customerId && PAID_STATUSES.has(statusAlias)) {
    await db.rpc('increment_customer_stats', {
      p_customer_id: customerId,
      p_total:       total,
    }).maybeSingle()
  }

  // Eventos pro Conversions API — só via webhook em tempo real (options?.fireCapiEvents),
  // nunca em sync manual/backfill, pra não disparar retroativo pra pedidos antigos que já
  // foram contados na época.
  if (options?.fireCapiEvents) {
    const skuIds = items.map(i => i.item_sku).filter((s): s is string => !!s)
    // client_ip_address: a Yampi captura o IP real do cliente no pedido (campo `ip`),
    // mesmo o Purchase disparando via webhook server-to-server sem acesso ao browser —
    // isso melhora bastante o Event Match Quality no Meta, que antes so tinha em/ph.
    const userData = {
      ...(customerEmail ? { em: hashEmail(customerEmail) } : {}),
      ...(customerPhone ? { ph: hashPhone(customerPhone) } : {}),
      ...(customerEmail ? { external_id: hashExternalId(customerEmail) } : {}),
      ...(d.ip ? { client_ip_address: d.ip } : {}),
    }
    const customData = {
      value:        total,
      currency:     'BRL',
      content_ids:  skuIds,
      content_type: 'product',
      num_items:    items.length,
      order_id:     externalId,
    }
    const eventTime = Math.floor(Date.now() / 1000)

    // AddPaymentInfo — na primeira vez que vemos esse pedido (o cliente já submeteu os
    // dados de pagamento pra Yampi criar o pedido, mesmo que o status atual não seja
    // "waiting_payment" no momento em que consultamos depois — o webhook chega no instante certo).
    if (previousStatus === null) {
      await sendCapiEvent({
        eventName:  'AddPaymentInfo',
        eventId:    `yampi_addpaymentinfo_${externalId}`,
        eventTime,
        userData,
        customData,
      })
    }

    // Purchase — só na transição pra pago.
    if (status === 'paid' && previousStatus !== 'paid') {
      await sendCapiPurchase({
        eventId:   `yampi_purchase_${externalId}`,
        eventTime,
        userData,
        customData,
      })
    }
  }

  return { ok: true }
}
