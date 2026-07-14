// One-off: monta 1 campanha CBO (R$50/dia total) com 10 conjuntos, 2 anúncios
// cada, clonando os 20 criativos de melhor performance (ROAS > 2, sem catálogo,
// deduplicados por asset único) da CA - JUST RUNNER (conta secundária). Pares
// feitos por ordem de ranking: 1+2, 3+4, ..., 19+20. Lê top20 gerado pela análise
// anterior (scratchpad temp), reaproveita image_hash/video_id já hospedados.
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  createCampaign,
  createAdSet,
  createAdCreative,
  createStaticVideoAdCreative,
  createAd,
  getVideoThumbnail,
  buildUtmTags,
  type MetaCreateConfig,
  type CallToAction,
} from '../src/lib/admin/meta-create'

interface Top20Entry {
  rank: number
  roas: number
  ad_name: string
  type: 'video' | 'image'
  videoId?: string
  imageHash?: string
  message: string
  title: string
  cta: CallToAction
  link: string
  igUserId: string
}

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
const URL_TAGS = buildUtmTags()
const CAMPAIGN_NAME = '11 TESTE CBO TOP20 JULHO'
const CBO_DAILY_BUDGET = 50

const top20: Top20Entry[] = JSON.parse(
  fs.readFileSync(path.join(os.tmpdir(), 'jr-ca2-top20.json'), 'utf8'),
)

async function createAdFromEntry(campaignAccountId: string, adsetId: string, entry: Top20Entry) {
  if (entry.type === 'video' && entry.videoId) {
    const thumbnailUrl = await getVideoThumbnail(cfg, entry.videoId)
    const creative = await createStaticVideoAdCreative(cfg, {
      name: `#${entry.rank} — Criativo`,
      videoId: entry.videoId,
      thumbnailUrl,
      link: entry.link,
      message: entry.message,
      title: entry.title || undefined,
      cta: entry.cta,
      pageId: PAGE_ID,
      accountId: campaignAccountId,
      urlTags: URL_TAGS,
      igUserId: entry.igUserId,
    })
    return createAd(cfg, {
      name: `#${entry.rank} — ${entry.ad_name}`.slice(0, 255),
      adsetId,
      creativeId: String((creative as Record<string, unknown>).id),
      accountId: campaignAccountId,
    })
  }
  if (entry.type === 'image' && entry.imageHash) {
    const creative = await createAdCreative(cfg, {
      name: `#${entry.rank} — Criativo`,
      imageHash: entry.imageHash,
      link: entry.link,
      message: entry.message,
      headline: entry.title,
      description: '',
      cta: entry.cta,
      pageId: PAGE_ID,
      accountId: campaignAccountId,
      urlTags: URL_TAGS,
      igUserId: entry.igUserId,
    })
    return createAd(cfg, {
      name: `#${entry.rank} — ${entry.ad_name}`.slice(0, 255),
      adsetId,
      creativeId: String((creative as Record<string, unknown>).id),
      accountId: campaignAccountId,
    })
  }
  throw new Error(`Entrada #${entry.rank} sem videoId/imageHash válido`)
}

async function main() {
  if (top20.length !== 20) throw new Error(`Esperava 20 criativos, achei ${top20.length}`)

  console.log('1. Criando campanha CBO...')
  const camp = await createCampaign(cfg, {
    name: CAMPAIGN_NAME,
    objective: 'OUTCOME_SALES',
    accountId: ACCOUNT_ID,
    cboDailyBudgetBrl: CBO_DAILY_BUDGET,
  })
  const campaignId = String((camp as Record<string, unknown>).id)
  console.log('   campaignId:', campaignId)

  const results: Array<{ adsetId: string; ads: string[] }> = []

  for (let i = 0; i < 10; i++) {
    const a = top20[i * 2]
    const b = top20[i * 2 + 1]
    const adsetName = `Conjunto ${String(i + 1).padStart(2, '0')} [#${a.rank}+#${b.rank}]`
    console.log(`\n${i + 2}. ${adsetName}...`)

    const adset = await createAdSet(cfg, {
      name: adsetName,
      campaignId,
      accountId: ACCOUNT_ID,
      ageMin: 18,
      ageMax: 55,
      gender: 'all',
      isCbo: true,
    })
    const adsetId = String((adset as Record<string, unknown>).id)
    console.log('   adsetId:', adsetId)

    const adA = await createAdFromEntry(ACCOUNT_ID, adsetId, a)
    console.log(`   #${a.rank} [${a.type}] adId:`, String((adA as Record<string, unknown>).id))

    const adB = await createAdFromEntry(ACCOUNT_ID, adsetId, b)
    console.log(`   #${b.rank} [${b.type}] adId:`, String((adB as Record<string, unknown>).id))

    results.push({
      adsetId,
      ads: [String((adA as Record<string, unknown>).id), String((adB as Record<string, unknown>).id)],
    })
  }

  console.log('\n✅ Pronto! CBO com 10 conjuntos (R$50/dia compartilhado), tudo PAUSADO.')
  console.log('campaignId:', campaignId)
  fs.writeFileSync(
    path.join(os.tmpdir(), 'jr-ca2-cbo-top20-resultado.json'),
    JSON.stringify({ campaignId, adsets: results }, null, 2),
  )
}

main().catch((err) => {
  console.error('Erro:', err)
  process.exit(1)
})
