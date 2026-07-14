declare global {
  interface Window {
    fbq: ((action: string, eventName: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => void) & {
      callMethod?: (...args: unknown[]) => void
      queue: unknown[]
      loaded: boolean
      version: string
      push: (...args: unknown[]) => void
    }
    _fbq: unknown
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? ''
// Pixel da conta secundária (CA - JUST RUNNER) — teste de silo separado da conta
// primária, rodando em paralelo no mesmo site (fbq('track', ...) já dispara pra
// todos os pixels inicializados, sem precisar duplicar cada chamada de evento).
export const META_PIXEL_ID_2 = process.env.NEXT_PUBLIC_META_PIXEL_ID_2 ?? ''

const DEBUG = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_META_DEBUG === 'true'

function log(...args: unknown[]) {
  if (DEBUG) console.debug('[Meta Pixel]', ...args)
}

export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function fbq(
  action: 'track' | 'trackCustom' | 'init',
  eventName: string,
  params?: Record<string, unknown>,
  options?: Record<string, unknown>,
) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') {
    log('fbq not ready, queuing skipped:', eventName, params)
    return
  }
  if (options && Object.keys(options).length > 0) {
    window.fbq(action, eventName, params ?? {}, options)
  } else {
    window.fbq(action, eventName, params ?? {})
  }
  log(action, eventName, params, options)
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MetaViewContentParams {
  content_ids: string[]
  content_name: string
  content_category: string
  value: number
  currency: 'BRL'
  content_type: 'product'
}

export interface MetaAddToCartParams {
  content_ids: string[]
  content_name: string
  content_category: string
  value: number
  currency: 'BRL'
  num_items: number
}

export interface MetaInitiateCheckoutParams {
  content_ids: string[]
  value: number
  currency: 'BRL'
  num_items: number
}

export interface MetaSearchParams {
  search_string: string
  content_category: string
}

export interface MetaLeadParams {
  content_name: string
  content_category: string
}

// ── CAPI payload builder (server-side deduplication) ─────────────────────────

export interface CAPIEventPayload {
  event_name: string
  event_time: number
  event_id: string
  event_source_url?: string
  action_source: 'website'
  user_data: {
    client_ip_address?: string
    client_user_agent?: string
    fbc?: string
    fbp?: string
    em?: string  // hashed email
    ph?: string  // hashed phone
  }
  custom_data?: Record<string, unknown>
}

export function buildCAPIPayload(
  eventName: string,
  eventId: string,
  customData?: Record<string, unknown>,
  sourceUrl?: string,
): CAPIEventPayload {
  return {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    event_source_url: sourceUrl,
    action_source: 'website',
    user_data: {},
    custom_data: customData,
  }
}

// ── Espelho server-side (Conversions API) ────────────────────────────────────
// Manda o mesmo evento pro nosso backend, que repassa pro Meta com IP/user-agent/
// fbp/fbc reais — reforço pros casos em que o pixel do navegador é bloqueado
// (ad-blocker, ITP do Safari). Best-effort: nunca bloqueia nem lança erro.

function sendServerCapi(eventName: string, eventId: string, customData?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return
  try {
    fetch('/api/meta/capi-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        custom_data: customData,
      }),
    }).catch(() => {})
  } catch {
    // silencioso — reforço server-side não pode quebrar o fluxo do usuário
  }
}

// ── Event functions ───────────────────────────────────────────────────────────

export function metaPageView(eventId?: string): string {
  const eid = eventId ?? generateEventId()
  fbq('track', 'PageView', {}, { eventID: eid })
  sendServerCapi('PageView', eid)
  return eid
}

export function metaViewContent(params: MetaViewContentParams, eventId?: string): string {
  const eid = eventId ?? generateEventId()
  fbq(
    'track',
    'ViewContent',
    {
      content_ids: params.content_ids,
      content_name: params.content_name,
      content_category: params.content_category,
      value: params.value,
      currency: params.currency,
      content_type: 'product',
    },
    { eventID: eid },
  )
  sendServerCapi('ViewContent', eid, {
    content_ids: params.content_ids,
    content_name: params.content_name,
    content_category: params.content_category,
    value: params.value,
    currency: params.currency,
    content_type: 'product',
  })
  return eid
}

export function metaAddToCart(params: MetaAddToCartParams, eventId?: string): string {
  const eid = eventId ?? generateEventId()
  fbq(
    'track',
    'AddToCart',
    {
      content_ids: params.content_ids,
      content_name: params.content_name,
      content_category: params.content_category,
      value: params.value,
      currency: params.currency,
      content_type: 'product',
      num_items: params.num_items,
    },
    { eventID: eid },
  )
  sendServerCapi('AddToCart', eid, {
    content_ids: params.content_ids,
    content_name: params.content_name,
    content_category: params.content_category,
    value: params.value,
    currency: params.currency,
    content_type: 'product',
    num_items: params.num_items,
  })
  return eid
}

export function metaInitiateCheckout(params: MetaInitiateCheckoutParams, eventId?: string): string {
  const eid = eventId ?? generateEventId()
  fbq(
    'track',
    'InitiateCheckout',
    {
      content_ids: params.content_ids,
      value: params.value,
      currency: params.currency,
      num_items: params.num_items,
    },
    { eventID: eid },
  )
  sendServerCapi('InitiateCheckout', eid, {
    content_ids: params.content_ids,
    value: params.value,
    currency: params.currency,
    num_items: params.num_items,
  })
  return eid
}

export function metaSearch(params: MetaSearchParams, eventId?: string): string {
  const eid = eventId ?? generateEventId()
  fbq(
    'track',
    'Search',
    {
      search_string: params.search_string,
      content_category: params.content_category,
    },
    { eventID: eid },
  )
  sendServerCapi('Search', eid, {
    search_string: params.search_string,
    content_category: params.content_category,
  })
  return eid
}

export interface MetaPurchaseParams {
  saleId: string | number
  value: number
  email?: string
  phone?: string
  contentIds?: string[]
  numItems?: number
}

// Disparado na pagina de obrigado (nosso dominio, depois do redirect da Yampi) — o
// UNICO lugar onde o Purchase tem acesso aos cookies _fbp/_fbc reais do navegador
// (o webhook da Yampi que tambem dispara Purchase e' server-to-server, sem isso).
// Mesmo event_id `yampi_purchase_{saleId}` do webhook -> a Meta funde os dois pra
// match: fbp/fbc daqui + em/ph/ip do webhook, sem contar a venda 2x.
export function metaPurchase(params: MetaPurchaseParams): string {
  const eid = `yampi_purchase_${params.saleId}`
  fbq(
    'track',
    'Purchase',
    {
      value: params.value,
      currency: 'BRL',
      content_ids: params.contentIds,
      content_type: 'product',
      num_items: params.numItems,
    },
    { eventID: eid },
  )
  if (typeof window !== 'undefined' && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
    fetch('/api/meta/capi-purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        sale_id: params.saleId,
        value: params.value,
        email: params.email,
        phone: params.phone,
        content_ids: params.contentIds,
        num_items: params.numItems,
        event_source_url: window.location.href,
      }),
    }).catch(() => {})
  }
  return eid
}

export function metaLead(params: MetaLeadParams, eventId?: string): string {
  const eid = eventId ?? generateEventId()
  fbq(
    'track',
    'Lead',
    {
      content_name: params.content_name,
      content_category: params.content_category,
    },
    { eventID: eid },
  )
  return eid
}
