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
}) {
  const genders = params.gender === 'all' ? undefined : params.gender === 'male' ? [1] : [2]
  return metaPost(`act_${params.accountId}/adsets`, {
    name: params.name,
    campaign_id: params.campaignId,
    daily_budget: Math.round(params.dailyBudgetBrl * 100),
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'OFFSITE_CONVERSIONS',
    ...(cfg.pixelId ? {
      promoted_object: { pixel_id: cfg.pixelId, custom_event_type: 'PURCHASE' },
    } : {}),
    targeting: {
      geo_locations: { countries: ['BR'] },
      age_min: params.ageMin,
      age_max: params.ageMax,
      ...(genders ? { genders } : {}),
      publisher_platforms: ['facebook', 'instagram'],
      facebook_positions:  ['feed', 'story', 'reels'],
      instagram_positions: ['stream', 'story', 'reels', 'explore'],
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
