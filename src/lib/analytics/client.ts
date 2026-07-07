'use client'

const ATTRIBUTION_KEY = 'jhf_attribution'
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000

// All params captured from the entry URL and persisted to localStorage
const CAPTURE_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'fbclid',
  'meta_campaign_id', 'meta_adset_id', 'meta_ad_id',
  'meta_campaign_name', 'meta_adset_name', 'meta_ad_name',
  'meta_placement', 'jhf_channel', 'jhf_funnel',
]

// Extra fields forwarded into properties.attribution (no schema migration needed)
const EXTENDED_KEYS = [
  'utm_content', 'utm_term', 'fbclid',
  'meta_campaign_id', 'meta_adset_id', 'meta_ad_id',
  'meta_campaign_name', 'meta_adset_name', 'meta_ad_name',
  'meta_placement', 'jhf_channel', 'jhf_funnel',
  'landing_page', 'captured_at',
]

function genId(bytes = 12): string {
  if (typeof crypto === 'undefined') return Math.random().toString(36).slice(2)
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function storage(key: string, scope: 'local' | 'session'): string {
  const store = scope === 'local' ? localStorage : sessionStorage
  const existing = store.getItem(key)
  if (existing) return existing
  const id = genId()
  store.setItem(key, id)
  return id
}

export function initSession(): string {
  try {
    return storage('jc_session', 'session')
  } catch {
    return genId()
  }
}

export function getVisitorId(): string {
  try {
    return storage('jc_visitor', 'local')
  } catch {
    return genId()
  }
}

export function getDevice(): string {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/Mobi|Android/i.test(ua)) return 'mobile'
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  return 'desktop'
}

// Reads UTM/Meta/JHF params from the current URL and persists them to localStorage.
// Only writes if the URL contains at least one tracked param.
// Called on every page navigation so any UTM-bearing URL is captured.
export function captureAttribution(): void {
  if (typeof window === 'undefined') return
  try {
    const params = new URLSearchParams(window.location.search)
    if (!CAPTURE_PARAMS.some((k) => params.get(k))) return

    const now = new Date()
    const attr: Record<string, string> = {
      landing_page: window.location.pathname,
      captured_at:  now.toISOString(),
      expires_at:   new Date(now.getTime() + ATTRIBUTION_TTL_MS).toISOString(),
    }
    for (const key of CAPTURE_PARAMS) {
      const val = params.get(key)
      if (val) attr[key] = val
    }
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attr))
  } catch { /* storage blocked or unavailable */ }
}

// Returns the stored attribution if it exists and has not expired.
export function getAttribution(): Record<string, string> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY)
    if (!raw) return null
    const attr = JSON.parse(raw) as Record<string, string>
    if (!attr.expires_at || new Date(attr.expires_at) < new Date()) {
      localStorage.removeItem(ATTRIBUTION_KEY)
      return null
    }
    return attr
  } catch {
    return null
  }
}

// Testes locais (localhost/127.0.0.1) não devem poluir as tabelas de analytics
// de produção — nenhum evento sai daqui quando o host bate com isso.
function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false
  return /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
}

export interface TrackPayload {
  event_type:    string
  page?:         string
  product_slug?: string
  product_id?:   string
  variant_id?:   string
  value?:        number
  properties?:   Record<string, unknown>
}

export function track(payload: TrackPayload): void {
  if (typeof window === 'undefined') return
  if (isLocalHost()) return

  let session_id: string
  let visitor_id: string
  try {
    session_id = initSession()
    visitor_id = getVisitorId()
  } catch {
    session_id = genId()
    visitor_id = genId()
  }

  const params = new URLSearchParams(window.location.search)
  const attr = getAttribution()

  // Top-level UTM columns (existing schema): current URL takes priority, localStorage as fallback
  const utm_source   = params.get('utm_source')   || attr?.['utm_source']   || undefined
  const utm_medium   = params.get('utm_medium')   || attr?.['utm_medium']   || undefined
  const utm_campaign = params.get('utm_campaign') || attr?.['utm_campaign'] || undefined

  // Extended attribution snapshot → properties.attribution (no schema migration needed)
  const attribution: Record<string, string> = {}
  for (const key of EXTENDED_KEYS) {
    const val = params.get(key) || attr?.[key]
    if (val) attribution[key] = val
  }

  const properties: Record<string, unknown> = {
    ...payload.properties,
    ...(Object.keys(attribution).length > 0 ? { attribution } : {}),
  }

  const body = JSON.stringify({
    session_id,
    visitor_id,
    event_type:   payload.event_type,
    page:         payload.page ?? window.location.pathname,
    product_slug: payload.product_slug,
    product_id:   payload.product_id,
    variant_id:   payload.variant_id,
    value:        payload.value,
    properties,
    device:       getDevice(),
    referrer:     document.referrer || undefined,
    utm_source,
    utm_medium,
    utm_campaign,
  })

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
  } else {
    void fetch('/api/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } })
  }
}
