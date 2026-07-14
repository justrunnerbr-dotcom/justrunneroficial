// One-off: cria 1 campanha (PAUSED) -> 1 conjunto -> 2 anúncios de vídeo
// (V1.mov + V2.mov de gestor-trafego/criativos/videos), reaproveitando o
// mesmo adsetId para os dois anúncios. Tudo criado pausado pra revisão manual.
import fs from 'fs'
import path from 'path'
import {
  createCampaign,
  createAdSet,
  uploadAdVideo,
  waitVideoReady,
  getVideoThumbnail,
  createVideoAdCreative,
  createAd,
  type MetaCreateConfig,
} from '../src/lib/admin/meta-create'

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
  accounts: [{ id: env.META_AD_ACCOUNT_ID_1, label: 'Conta 1' }],
  pages: [{ id: env.META_PAGE_ID_1, label: 'Página 1' }],
  pixelId: env.NEXT_PUBLIC_META_PIXEL_ID,
}

const ACCOUNT_ID = env.META_AD_ACCOUNT_ID_1
const PAGE_ID = env.META_PAGE_ID_1
const SITE_URL = env.NEXT_PUBLIC_SITE_URL
const VIDEOS_DIR = path.join(process.cwd(), 'gestor-trafego', 'criativos', 'videos')
const VIDEO_FILES = ['V1.mov', 'V2.mov']

async function main() {
  console.log('1. Criando campanha...')
  const camp = await createCampaign(cfg, {
    name: 'JR — Teste Vídeo — Leve 2 pelo preço de 1',
    objective: 'OUTCOME_SALES',
    accountId: ACCOUNT_ID,
  })
  const campaignId = String((camp as Record<string, unknown>).id)
  console.log('   campaignId:', campaignId)

  console.log('2. Criando conjunto de anúncios...')
  const adset = await createAdSet(cfg, {
    name: 'JR — Conjunto Teste — V1 + V2',
    campaignId,
    accountId: ACCOUNT_ID,
    dailyBudgetBrl: 10,
    ageMin: 18,
    ageMax: 55,
    gender: 'all',
  })
  const adsetId = String((adset as Record<string, unknown>).id)
  console.log('   adsetId:', adsetId)

  for (const filename of VIDEO_FILES) {
    console.log(`\n3. [${filename}] Subindo vídeo...`)
    const filePath = path.join(VIDEOS_DIR, filename)
    const fileBuffer = fs.readFileSync(filePath)
    const { videoId } = await uploadAdVideo(cfg, { fileBuffer, filename, accountId: ACCOUNT_ID })
    console.log(`   [${filename}] videoId:`, videoId)

    console.log(`   [${filename}] Esperando o Meta processar o vídeo...`)
    await waitVideoReady(cfg, videoId)
    console.log(`   [${filename}] Vídeo pronto.`)

    console.log(`   [${filename}] Buscando thumbnail sugerida...`)
    const thumbnailUrl = await getVideoThumbnail(cfg, videoId)

    console.log(`   [${filename}] Criando criativo...`)
    const creative = await createVideoAdCreative(cfg, {
      name: `JR — Criativo ${filename}`,
      videoId,
      thumbnailUrl,
      link: SITE_URL,
      bodies: ['Leve 2 óculos pelo preço de 1 na Just Runner. Estilo em dobro, sem pagar a mais.'],
      titles: ['Leve 2 pelo preço de 1'],
      descriptions: ['Oferta por tempo limitado.'],
      cta: 'SHOP_NOW',
      pageId: PAGE_ID,
      accountId: ACCOUNT_ID,
    })
    const creativeId = String((creative as Record<string, unknown>).id)
    console.log(`   [${filename}] creativeId:`, creativeId)

    console.log(`   [${filename}] Criando anúncio...`)
    const ad = await createAd(cfg, {
      name: `JR — Anúncio ${filename}`,
      adsetId,
      creativeId,
      accountId: ACCOUNT_ID,
    })
    console.log(`   [${filename}] adId:`, String((ad as Record<string, unknown>).id))
  }

  console.log('\nPronto! Campanha, conjunto e os 2 anúncios foram criados PAUSADOS pra revisão.')
  console.log('campaignId:', campaignId, '| adsetId:', adsetId)
}

main().catch((err) => {
  console.error('Erro:', err)
  process.exit(1)
})
