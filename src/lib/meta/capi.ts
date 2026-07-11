import { createHash } from 'crypto'

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? ''

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function hashEmail(email: string): string {
  return sha256(email.trim().toLowerCase())
}

// Meta exige só dígitos, com código do país, sem +/espaços/símbolos.
export function hashPhone(phone: string): string {
  return sha256(phone.replace(/\D/g, ''))
}

export function hashExternalId(id: string): string {
  return sha256(id.trim().toLowerCase())
}

interface CapiUserData {
  em?:                 string
  ph?:                 string
  external_id?:        string
  client_ip_address?:  string
  client_user_agent?:  string
  fbp?:                string
  fbc?:                string
}

interface CapiCustomData {
  value?:            number
  currency?:         string
  content_ids?:      string[]
  content_type?:     string
  content_name?:     string
  content_category?: string
  num_items?:        number
  order_id?:         string
  search_string?:    string
}

/**
 * Envia um evento pro Conversions API (server-side) — não bloqueia nem lança erro pro
 * chamador (best-effort: se falhar, só loga). Isso substitui o pixel de Purchase que a
 * própria Yampi rodava no checkout dela (fragmentado em vários nomes de evento e
 * desligado agora, por decisão do usuário, pra evitar contagem duplicada).
 */
export async function sendCapiEvent(params: {
  eventName:       string
  eventId:         string
  eventTime:       number
  eventSourceUrl?: string
  userData:        CapiUserData
  customData?:     CapiCustomData
}): Promise<void> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${PIXEL_ID}/events`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name:       params.eventName,
          event_time:       params.eventTime,
          event_id:         params.eventId,
          action_source:    'website',
          event_source_url: params.eventSourceUrl,
          user_data:        params.userData,
          custom_data:      params.customData,
        }],
        access_token: token,
      }),
    })
    if (!res.ok) {
      console.error(`[meta-capi] falha ao enviar ${params.eventName}:`, await res.text())
    }
  } catch (err) {
    console.error(`[meta-capi] erro ao enviar ${params.eventName}:`, err instanceof Error ? err.message : err)
  }
}

export async function sendCapiPurchase(params: {
  eventId:         string
  eventTime:       number
  eventSourceUrl?: string
  userData:        CapiUserData
  customData:      CapiCustomData
}): Promise<void> {
  return sendCapiEvent({ ...params, eventName: 'Purchase' })
}
