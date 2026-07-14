// One-off: os 11 anúncios da campanha "11 TESTE CBO TOP20 JULHO" clonados de
// criativos antigos vieram com instagram_user_id de uma conta de IG que não
// existe/não está mais vinculada à Página Just Runner (só 17841436245391616
// está ativa hoje). Recria o criativo de cada um com o IG correto e troca o
// anúncio pra apontar pro criativo novo (creative é imutável, não dá pra editar).
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  createAdCreative,
  createStaticVideoAdCreative,
  getVideoThumbnail,
  type MetaCreateConfig,
  type CallToAction,
} from '../src/lib/admin/meta-create'

interface BrokenAd {
  id: string
  name: string
  adset_id: string
  creative: {
    id: string
    object_story_spec: {
      page_id: string
      instagram_user_id: string
      video_data?: {
        video_id: string
        message?: string
        title?: string
        call_to_action?: { type: string; value?: { link?: string } }
      }
      link_data?: {
        image_hash: string
        link: string
        message?: string
        name?: string
        call_to_action?: { type: string }
      }
    }
  }
}

const CORRECT_IG_USER_ID = '17841436245391616' // @justrunner.br1, único ativo hoje

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const cfg: MetaCreateConfig = {
  token: env.META_ACCESS_TOKEN,
  accounts: [{ id: env.META_AD_ACCOUNT_ID_2, label: 'CA - JUST RUNNER' }],
  pages: [{ id: env.META_PAGE_ID_1, label: 'Página 1' }],
  pixelId: env.NEXT_PUBLIC_META_PIXEL_ID_2 || env.NEXT_PUBLIC_META_PIXEL_ID,
}
const ACCOUNT_ID = env.META_AD_ACCOUNT_ID_2
const PAGE_ID = env.META_PAGE_ID_1

const brokenAds: BrokenAd[] = JSON.parse(
  fs.readFileSync(path.join(os.tmpdir(), 'jr-broken-ig-ads.json'), 'utf8'),
)

async function metaPostAd(adId: string, body: Record<string, unknown>) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${adId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message ?? `HTTP ${res.status}`)
  return data
}

async function main() {
  console.log(`Corrigindo ${brokenAds.length} anúncios...\n`)

  for (const ad of brokenAds) {
    const spec = ad.creative.object_story_spec
    console.log(`[${ad.name}]`)

    let newCreativeId: string

    if (spec.video_data) {
      const vd = spec.video_data
      const thumbnailUrl = await getVideoThumbnail(cfg, vd.video_id)
      const creative = await createStaticVideoAdCreative(cfg, {
        name: `${ad.name} — Criativo (IG corrigido)`,
        videoId: vd.video_id,
        thumbnailUrl,
        link: vd.call_to_action?.value?.link ?? 'https://justrunner.com.br/',
        message: vd.message ?? '',
        title: vd.title,
        cta: (vd.call_to_action?.type as CallToAction) ?? 'SHOP_NOW',
        pageId: PAGE_ID,
        accountId: ACCOUNT_ID,
        igUserId: CORRECT_IG_USER_ID,
      })
      newCreativeId = String((creative as Record<string, unknown>).id)
    } else if (spec.link_data) {
      const ld = spec.link_data
      const creative = await createAdCreative(cfg, {
        name: `${ad.name} — Criativo (IG corrigido)`,
        imageHash: ld.image_hash,
        link: ld.link,
        message: ld.message ?? '',
        headline: ld.name ?? '',
        description: '',
        cta: (ld.call_to_action?.type as CallToAction) ?? 'SHOP_NOW',
        pageId: PAGE_ID,
        accountId: ACCOUNT_ID,
        igUserId: CORRECT_IG_USER_ID,
      })
      newCreativeId = String((creative as Record<string, unknown>).id)
    } else {
      console.log('  pulado — formato não reconhecido')
      continue
    }

    console.log('  novo creativeId:', newCreativeId)
    await metaPostAd(ad.id, { creative: { creative_id: newCreativeId } })
    console.log('  anúncio atualizado ✅\n')
  }

  console.log('Pronto! Todos os anúncios corrigidos pra usar @justrunner.br1.')
}

main().catch((err) => {
  console.error('Erro:', err)
  process.exit(1)
})
