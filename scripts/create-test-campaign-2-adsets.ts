// One-off: dentro da campanha JR — Teste Vídeo já existente, cria 2 conjuntos de
// anúncios separados (1 por vídeo: V1 e V2), cada um com seu próprio anúncio em
// asset_feed_spec (múltiplas variações de texto/título) + url_tags de tracking —
// mesmo padrão comprovado nos scripts reais da JHF (criar-campanha-permian.mjs).
import fs from 'fs'
import path from 'path'
import {
  createAdSet,
  uploadAdVideo,
  waitVideoReady,
  getVideoThumbnail,
  createVideoAdCreative,
  createAd,
  buildUtmTags,
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
const CAMPAIGN_ID = '120243178869680395' // JR — Teste Vídeo — Leve 2 pelo preço de 1 (já criada)
const URL_TAGS = buildUtmTags()

const CONJUNTOS = [
  {
    filename: 'V1.mov',
    nome: 'JR — Conjunto V1',
    bodies: [
      'Leve 2 óculos pelo preço de 1 na Just Runner. Estilo em dobro, sem pagar a mais.',
      'Óculos novo sem gastar em dobro: compre 1 e leve 2 na Just Runner.',
    ],
    titles: ['Leve 2 pelo preço de 1', 'Compre 1, leve 2'],
    descriptions: ['Oferta por tempo limitado.'],
  },
  {
    filename: 'V2.mov',
    nome: 'JR — Conjunto V2',
    bodies: [
      'Dois óculos, um preço só. Aproveita a promoção da Just Runner antes que acabe.',
      'Muda o visual sem gastar o dobro: 2 óculos pelo preço de 1 na Just Runner.',
    ],
    titles: ['2 óculos, 1 preço', 'Promoção Just Runner'],
    descriptions: ['Aproveite antes que acabe.'],
  },
]

async function main() {
  const results: Array<{ conjunto: string; adsetId: string; adId: string }> = []

  for (const c of CONJUNTOS) {
    console.log(`\n=== ${c.nome} (${c.filename}) ===`)

    console.log('1. Criando conjunto de anúncios...')
    const adset = await createAdSet(cfg, {
      name: c.nome,
      campaignId: CAMPAIGN_ID,
      accountId: ACCOUNT_ID,
      dailyBudgetBrl: 10,
      ageMin: 18,
      ageMax: 55,
      gender: 'all',
      isDynamicCreative: true,
    })
    const adsetId = String((adset as Record<string, unknown>).id)
    console.log('   adsetId:', adsetId)

    console.log('2. Subindo vídeo...')
    const filePath = path.join(VIDEOS_DIR, c.filename)
    const fileBuffer = fs.readFileSync(filePath)
    const { videoId } = await uploadAdVideo(cfg, { fileBuffer, filename: c.filename, accountId: ACCOUNT_ID })
    console.log('   videoId:', videoId)

    console.log('3. Esperando o Meta processar o vídeo...')
    await waitVideoReady(cfg, videoId)

    console.log('4. Buscando thumbnail sugerida...')
    const thumbnailUrl = await getVideoThumbnail(cfg, videoId)

    console.log('5. Criando criativo (asset_feed_spec + url_tags)...')
    const creative = await createVideoAdCreative(cfg, {
      name: `${c.nome} — Criativo`,
      videoId,
      thumbnailUrl,
      link: SITE_URL,
      bodies: c.bodies,
      titles: c.titles,
      descriptions: c.descriptions,
      cta: 'SHOP_NOW',
      pageId: PAGE_ID,
      accountId: ACCOUNT_ID,
      urlTags: URL_TAGS,
    })
    const creativeId = String((creative as Record<string, unknown>).id)
    console.log('   creativeId:', creativeId)

    console.log('6. Criando anúncio...')
    const ad = await createAd(cfg, {
      name: `${c.nome} — Anúncio`,
      adsetId,
      creativeId,
      accountId: ACCOUNT_ID,
    })
    const adId = String((ad as Record<string, unknown>).id)
    console.log('   adId:', adId)

    results.push({ conjunto: c.nome, adsetId, adId })
  }

  console.log('\n✅ Pronto! Campanha com 2 conjuntos separados, tudo PAUSADO pra revisão.')
  console.log('campaignId:', CAMPAIGN_ID)
  for (const r of results) console.log(`  ${r.conjunto} → adset ${r.adsetId} | ad ${r.adId}`)
}

main().catch((err) => {
  console.error('Erro:', err)
  process.exit(1)
})
