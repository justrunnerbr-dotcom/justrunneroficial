const META_API_VER = 'v21.0'

export type CampaignObjective = 'OUTCOME_SALES' | 'OUTCOME_TRAFFIC' | 'OUTCOME_AWARENESS'
export type CallToAction = 'SHOP_NOW' | 'LEARN_MORE' | 'BUY_NOW' | 'GET_OFFER'
export type Gender = 'all' | 'male' | 'female'

export interface MetaAdAccount { id: string; label: string }
export interface MetaPage      { id: string; label: string }

export interface MetaCreateConfig {
  token:      string
  accounts:   MetaAdAccount[]
  pages:      MetaPage[]
  pixelId:    string
}

export function getMetaCreateConfig(): MetaCreateConfig | null {
  const token   = process.env.META_ACCESS_TOKEN
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID

  const accounts: MetaAdAccount[] = [
    process.env.META_AD_ACCOUNT_ID_1 ? { id: process.env.META_AD_ACCOUNT_ID_1, label: 'Conta 1' } : null,
    process.env.META_AD_ACCOUNT_ID_2 ? { id: process.env.META_AD_ACCOUNT_ID_2, label: 'Conta 3' } : null,
    process.env.META_AD_ACCOUNT_ID_3 ? { id: process.env.META_AD_ACCOUNT_ID_3, label: 'Conta 4' } : null,
  ].filter(Boolean) as MetaAdAccount[]

  const pages: MetaPage[] = [
    process.env.META_PAGE_ID_1 ? { id: process.env.META_PAGE_ID_1, label: 'Página 1' } : null,
    process.env.META_PAGE_ID_2 ? { id: process.env.META_PAGE_ID_2, label: 'Página 2' } : null,
  ].filter(Boolean) as MetaPage[]

  if (!token || accounts.length === 0 || pages.length === 0) return null
  return { token, accounts, pages, pixelId: pixelId ?? '' }
}

async function metaPost(path: string, body: Record<string, unknown>, token: string) {
  const res = await fetch(`https://graph.facebook.com/${META_API_VER}/${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const data = await res.json() as Record<string, unknown>
  if (!res.ok || data.error) {
    const err = data.error as { message?: string } | undefined
    throw new Error(err?.message ?? `Meta API HTTP ${res.status}`)
  }
  return data
}

// Verifica se o token tem permissão ads_management
export async function checkAdsManagement(): Promise<{ ok: boolean; permissions: string[] }> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return { ok: false, permissions: [] }
  try {
    const res  = await fetch(`https://graph.facebook.com/${META_API_VER}/me/permissions?access_token=${token}`, { cache: 'no-store' })
    const data = await res.json() as { data?: Array<{ permission: string; status: string }> }
    const perms = (data.data ?? []).filter(p => p.status === 'granted').map(p => p.permission)
    return { ok: perms.includes('ads_management'), permissions: perms }
  } catch {
    return { ok: false, permissions: [] }
  }
}

// 1. Criar campanha
export async function createCampaign(cfg: MetaCreateConfig, params: {
  name: string
  objective: CampaignObjective
  accountId: string
}) {
  return metaPost(`act_${params.accountId}/campaigns`, {
    name: params.name,
    objective: params.objective,
    status: 'PAUSED',
    special_ad_categories: [],
    // Orçamento fica no conjunto de anúncios (não na campanha), então CBO/Advantage
    // budget sharing fica desligado — exigido pela Meta desde que passaram a pedir
    // esse campo explicitamente.
    is_adset_budget_sharing_enabled: false,
  }, cfg.token)
}

// 2. Criar conjunto de anúncios
export async function createAdSet(cfg: MetaCreateConfig, params: {
  name: string
  campaignId: string
  accountId: string
  dailyBudgetBrl: number
  ageMin: number
  ageMax: number
  gender: Gender
  /** Necessário quando o anúncio do conjunto vai usar asset_feed_spec (createVideoAdCreative) */
  isDynamicCreative?: boolean
}) {
  const genders = params.gender === 'all' ? undefined : params.gender === 'male' ? [1] : [2]
  return metaPost(`act_${params.accountId}/adsets`, {
    name: params.name,
    campaign_id: params.campaignId,
    daily_budget: Math.round(params.dailyBudgetBrl * 100),
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'OFFSITE_CONVERSIONS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    ...(params.isDynamicCreative ? { is_dynamic_creative: true } : {}),
    ...(cfg.pixelId ? {
      promoted_object: { pixel_id: cfg.pixelId, custom_event_type: 'PURCHASE' },
    } : {}),
    targeting: {
      geo_locations: { countries: ['BR'] },
      age_min: params.ageMin,
      age_max: params.ageMax,
      ...(genders ? { genders } : {}),
      publisher_platforms: ['facebook', 'instagram'],
      facebook_positions:  ['feed', 'story', 'facebook_reels'],
      instagram_positions: ['stream', 'story', 'reels', 'explore'],
      targeting_automation: { advantage_audience: 0 },
    },
    status: 'PAUSED',
  }, cfg.token)
}

// 3. Upload de imagem (base64) para o Meta
export async function uploadAdImage(cfg: MetaCreateConfig, params: {
  base64: string
  filename: string
  accountId: string
}) {
  const data = await metaPost(`act_${params.accountId}/adimages`, {
    bytes: params.base64,
    name: params.filename,
  }, cfg.token)
  // Retorna { images: { [filename]: { hash, url } } }
  const images = data.images as Record<string, { hash: string; url: string }> | undefined
  const entry  = images ? Object.values(images)[0] : undefined
  if (!entry?.hash) throw new Error('Meta não retornou hash da imagem')
  return entry
}

// 4. Criar criativo
export async function createAdCreative(cfg: MetaCreateConfig, params: {
  name: string
  imageHash: string
  link: string
  message: string
  headline: string
  description: string
  cta: CallToAction
  pageId: string
  accountId: string
}) {
  return metaPost(`act_${params.accountId}/adcreatives`, {
    name: params.name,
    object_story_spec: {
      page_id: params.pageId,
      link_data: {
        image_hash:  params.imageHash,
        link:        params.link,
        message:     params.message,
        name:        params.headline,
        description: params.description,
        call_to_action: {
          type:  params.cta,
          value: { link: params.link },
        },
      },
    },
  }, cfg.token)
}

// 3b. Upload de vídeo (multipart) para o Meta — endpoint `/advideos` é diferente
// do de imagem (`/adimages`), aceita o arquivo direto via multipart/form-data.
export async function uploadAdVideo(cfg: MetaCreateConfig, params: {
  fileBuffer: Buffer
  filename: string
  accountId: string
}) {
  const form = new FormData()
  form.append('source', new Blob([new Uint8Array(params.fileBuffer)]), params.filename)
  form.append('name', params.filename)
  const res = await fetch(`https://graph.facebook.com/${META_API_VER}/act_${params.accountId}/advideos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}` },
    body: form,
  })
  const data = await res.json() as Record<string, unknown>
  if (!res.ok || data.error) {
    const err = data.error as { message?: string } | undefined
    throw new Error(err?.message ?? `Meta API HTTP ${res.status}`)
  }
  const videoId = data.id
  if (!videoId) throw new Error('Meta não retornou id do vídeo')
  return { videoId: String(videoId) }
}

// Espera o Meta terminar de processar o vídeo antes de poder usá-lo num criativo
export async function waitVideoReady(cfg: MetaCreateConfig, videoId: string, timeoutMs = 240_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const res  = await fetch(`https://graph.facebook.com/${META_API_VER}/${videoId}?fields=status&access_token=${cfg.token}`, { cache: 'no-store' })
    const data = await res.json() as { status?: { video_status?: string } }
    const status = data.status?.video_status
    if (status === 'ready') return
    if (status === 'error') throw new Error(`Meta falhou ao processar o vídeo ${videoId}`)
    await new Promise((r) => setTimeout(r, 5000))
  }
  throw new Error(`Timeout esperando o vídeo ${videoId} processar no Meta`)
}

// Pega a thumbnail sugerida pelo Meta pro vídeo (necessária pro criativo de vídeo)
export async function getVideoThumbnail(cfg: MetaCreateConfig, videoId: string): Promise<string> {
  const res  = await fetch(`https://graph.facebook.com/${META_API_VER}/${videoId}/thumbnails?access_token=${cfg.token}`, { cache: 'no-store' })
  const data = await res.json() as { data?: Array<{ uri: string; is_preferred?: boolean }> }
  const thumb = data.data?.find((t) => t.is_preferred) ?? data.data?.[0]
  if (!thumb?.uri) throw new Error(`Meta não retornou thumbnail pro vídeo ${videoId}`)
  return thumb.uri
}

// Monta a string de url_tags padrão (macros da Meta preenchidas em tempo real por
// campanha/conjunto/anúncio/posição) — mesmo padrão usado nos scripts reais da JHF
// (scripts/criar-campanha-permian.mjs), só trocando o prefixo jhf_ por jr_.
export function buildUtmTags(): string {
  return [
    'utm_source={{site_source_name}}',
    'utm_medium=paid_social',
    'utm_campaign={{campaign.name}}',
    'utm_content={{ad.name}}',
    'utm_term={{adset.name}}',
    'meta_campaign_id={{campaign.id}}',
    'meta_adset_id={{adset.id}}',
    'meta_ad_id={{ad.id}}',
    'meta_campaign_name={{campaign.name}}',
    'meta_adset_name={{adset.name}}',
    'meta_ad_name={{ad.name}}',
    'meta_placement={{placement}}',
    'jr_channel=meta_ads',
    'jr_funnel=paid',
  ].join('&')
}

// 4b. Criar criativo de vídeo com asset_feed_spec (permite múltiplas variações de
// texto/título/descrição por anúncio, mesmo com 1 vídeo só) + url_tags de tracking.
// Mesmo formato comprovado nos scripts reais da JHF (criar-campanha-permian.mjs /
// criar-conjuntos-permian-abo-final.mjs) — substitui o antigo video_data simples.
export async function createVideoAdCreative(cfg: MetaCreateConfig, params: {
  name: string
  videoId: string
  thumbnailUrl: string
  link: string
  bodies: string[]
  titles: string[]
  descriptions: string[]
  cta: CallToAction
  pageId: string
  accountId: string
  urlTags?: string
}) {
  return metaPost(`act_${params.accountId}/adcreatives`, {
    name: params.name,
    object_story_spec: { page_id: params.pageId },
    asset_feed_spec: {
      videos:       [{ video_id: params.videoId, thumbnail_url: params.thumbnailUrl }],
      bodies:       params.bodies.map((text) => ({ text })),
      titles:       params.titles.map((text) => ({ text })),
      descriptions: params.descriptions.map((text) => ({ text })),
      link_urls:    [{ website_url: params.link }],
      ad_formats:   ['SINGLE_VIDEO'],
      call_to_action_types: [params.cta],
    },
    ...(params.urlTags ? { url_tags: params.urlTags } : {}),
  }, cfg.token)
}

// 5. Criar anúncio
export async function createAd(cfg: MetaCreateConfig, params: {
  name: string
  adsetId: string
  creativeId: string
  accountId: string
}) {
  return metaPost(`act_${params.accountId}/ads`, {
    name:     params.name,
    adset_id: params.adsetId,
    creative: { creative_id: params.creativeId },
    status:   'PAUSED',
  }, cfg.token)
}
