// One-off: clona os 3 conjuntos vencedores (ROAS > 5, ESTÁTICOS/imagem + vídeo,
// SEM catálogo) da CA - JUST RUNNER (conta secundária, act_749863227954303) pra
// dentro de 1 campanha nova CBO (orçamento R$50/dia compartilhado entre os 3
// conjuntos). Reaproveita os mesmos assets (image_hash / video_id) já hospedados
// no Meta, mesma copy, só troca o url_tags pro padrão completo de tracking.
import fs from 'fs'
import {
  createCampaign,
  createAdSet,
  createAdCreative,
  createStaticVideoAdCreative,
  createAd,
  getVideoThumbnail,
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
  accounts: [{ id: env.META_AD_ACCOUNT_ID_2, label: 'CA - JUST RUNNER' }],
  pages: [{ id: env.META_PAGE_ID_1, label: 'Página 1' }],
  pixelId: env.NEXT_PUBLIC_META_PIXEL_ID_2 || env.NEXT_PUBLIC_META_PIXEL_ID,
}

const ACCOUNT_ID = env.META_AD_ACCOUNT_ID_2 // conta secundária
const PAGE_ID = env.META_PAGE_ID_1
const IG_USER_ID = '17841436245391616' // igual aos anúncios originais clonados
const SITE_URL = env.NEXT_PUBLIC_SITE_URL
const URL_TAGS = buildUtmTags()
const CAMPAIGN_NAME = '10 TESTE CBO VALIDADOS JULHO'
const CBO_DAILY_BUDGET = 50

const COPY_ESPORTIVOS =
  'Óculos Esportivos - Just Runner\n\n🖖️ Design de impacto\n🔒 Proteção total UV\n📦 Envio ágil, sem enrolação\n\nEstoque limitado para os primeiros!\nClique agora e aproveite!'

async function main() {
  console.log('1. Criando campanha CBO...')
  const camp = await createCampaign(cfg, {
    name: CAMPAIGN_NAME,
    objective: 'OUTCOME_SALES',
    accountId: ACCOUNT_ID,
    cboDailyBudgetBrl: CBO_DAILY_BUDGET,
  })
  const campaignId = String((camp as Record<string, unknown>).id)
  console.log('   campaignId:', campaignId)

  // ── Conjunto 1 — imagem estática (clone do "16 [ESTÁTICOS]", ROAS 5.37x) ──
  console.log('\n2. Conjunto 1 — imagem "16 [ESTÁTICOS]"...')
  const adset1 = await createAdSet(cfg, {
    name: '16 [VENDAS][BRASIL][18-50][ABERTO][ESTÁTICOS]',
    campaignId, accountId: ACCOUNT_ID,
    ageMin: 18, ageMax: 50, gender: 'all',
    isCbo: true,
  })
  const adset1Id = String((adset1 as Record<string, unknown>).id)
  const creative1 = await createAdCreative(cfg, {
    name: '16 [ESTÁTICOS] — Criativo',
    imageHash: 'b009a0f10c2a8384dbfc7c501af33bac',
    link: SITE_URL,
    message: COPY_ESPORTIVOS,
    headline: '',
    description: '',
    cta: 'SHOP_NOW',
    pageId: PAGE_ID,
    accountId: ACCOUNT_ID,
    urlTags: URL_TAGS,
    igUserId: IG_USER_ID,
  })
  const ad1 = await createAd(cfg, {
    name: '16 [ESTÁTICOS] — Anúncio',
    adsetId: adset1Id,
    creativeId: String((creative1 as Record<string, unknown>).id),
    accountId: ACCOUNT_ID,
  })
  console.log('   adsetId:', adset1Id, '| adId:', String((ad1 as Record<string, unknown>).id))

  // ── Conjunto 2 — imagem estática (clone do "03 [ESTÁTICOS]", ROAS 5.12x) ──
  console.log('\n3. Conjunto 2 — imagem "03 [ESTÁTICOS]"...')
  const adset2 = await createAdSet(cfg, {
    name: '03 [VENDAS][BRASIL][18-50][ABERTO][ESTÁTICOS]',
    campaignId, accountId: ACCOUNT_ID,
    ageMin: 18, ageMax: 50, gender: 'all',
    isCbo: true,
  })
  const adset2Id = String((adset2 as Record<string, unknown>).id)
  const creative2 = await createAdCreative(cfg, {
    name: '03 [ESTÁTICOS] — Criativo',
    imageHash: 'f379f3a7e39f7961e6e6a511b4aa4334',
    link: SITE_URL,
    message: COPY_ESPORTIVOS,
    headline: '',
    description: '',
    cta: 'SHOP_NOW',
    pageId: PAGE_ID,
    accountId: ACCOUNT_ID,
    urlTags: URL_TAGS,
    igUserId: IG_USER_ID,
  })
  const ad2 = await createAd(cfg, {
    name: '03 [ESTÁTICOS] — Anúncio',
    adsetId: adset2Id,
    creativeId: String((creative2 as Record<string, unknown>).id),
    accountId: ACCOUNT_ID,
  })
  console.log('   adsetId:', adset2Id, '| adId:', String((ad2 as Record<string, unknown>).id))

  // ── Conjunto 3 — vídeo, 2 anúncios (clone do "07.06 3", ROAS 5.72x) ──
  console.log('\n4. Conjunto 3 — vídeo "07.06 3" (2 anúncios)...')
  const adset3 = await createAdSet(cfg, {
    name: '07.06 3 [VENDAS][BRASIL][18-55][ABERTO]',
    campaignId, accountId: ACCOUNT_ID,
    ageMin: 18, ageMax: 55, gender: 'all',
    isCbo: true,
  })
  const adset3Id = String((adset3 as Record<string, unknown>).id)
  const videoId = '3083747518494419'
  const thumbnailUrl = await getVideoThumbnail(cfg, videoId)

  const creative3a = await createStaticVideoAdCreative(cfg, {
    name: 'DECRIA1 — Criativo',
    videoId, thumbnailUrl,
    link: SITE_URL,
    message: COPY_ESPORTIVOS,
    cta: 'SHOP_NOW',
    pageId: PAGE_ID,
    accountId: ACCOUNT_ID,
    urlTags: URL_TAGS,
    igUserId: IG_USER_ID,
  })
  const ad3a = await createAd(cfg, {
    name: 'DECRIA1',
    adsetId: adset3Id,
    creativeId: String((creative3a as Record<string, unknown>).id),
    accountId: ACCOUNT_ID,
  })
  console.log('   DECRIA1 adId:', String((ad3a as Record<string, unknown>).id))

  const creative3b = await createStaticVideoAdCreative(cfg, {
    name: 'DECRIA2 — Criativo',
    videoId, thumbnailUrl,
    link: SITE_URL,
    message: COPY_ESPORTIVOS,
    title: 'COMPRE 1 LEVE 2',
    cta: 'SHOP_NOW',
    pageId: PAGE_ID,
    accountId: ACCOUNT_ID,
    urlTags: URL_TAGS,
    igUserId: IG_USER_ID,
  })
  const ad3b = await createAd(cfg, {
    name: 'DECRIA2',
    adsetId: adset3Id,
    creativeId: String((creative3b as Record<string, unknown>).id),
    accountId: ACCOUNT_ID,
  })
  console.log('   DECRIA2 adId:', String((ad3b as Record<string, unknown>).id))
  console.log('   adsetId:', adset3Id)

  console.log('\n✅ Pronto! CBO criado com 3 conjuntos (R$50/dia compartilhado), tudo PAUSADO.')
  console.log('campaignId:', campaignId)
  console.log('IG_USER_ID usado nos criativos originais (referência, não setado explicitamente aqui):', IG_USER_ID)
}

main().catch((err) => {
  console.error('Erro:', err)
  process.exit(1)
})
