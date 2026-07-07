import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
import {
  getMetaCreateConfig,
  createCampaign,
  createAdSet,
  uploadAdImage,
  createAdCreative,
  createAd,
  type CampaignObjective,
  type CallToAction,
  type Gender,
} from '@/lib/admin/meta-create'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  if (!secret || token !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = getMetaCreateConfig()
  if (!cfg) return NextResponse.json({ error: 'Meta não configurado. Verifique as variáveis de ambiente.' }, { status: 400 })

  try {
    const body = await req.json() as {
      accountId: string
      campanha:  { name: string; objective: CampaignObjective }
      conjunto:  { name: string; dailyBudgetBrl: number; ageMin: number; ageMax: number; gender: Gender }
      criativo:  { filename: string; tipo: 'imagem' | 'video' }
      anuncio:   { name: string; link: string; message: string; headline: string; description: string; cta: CallToAction; pageId: string }
    }

    const { accountId } = body

    // valida que a conta pertence à configuração
    if (!cfg.accounts.find(a => a.id === accountId)) {
      return NextResponse.json({ error: `Conta ${accountId} não encontrada na configuração.` }, { status: 400 })
    }

    // 1. Campanha
    const camp = await createCampaign(cfg, { ...body.campanha, accountId })
    const campaignId = String((camp as Record<string, unknown>).id)

    // 2. Conjunto
    const adset = await createAdSet(cfg, { ...body.conjunto, campaignId, accountId })
    const adsetId = String((adset as Record<string, unknown>).id)

    // 3. Upload imagem
    const filePath = path.join(process.cwd(), 'gestor-trafego', 'criativos', body.criativo.tipo === 'imagem' ? 'imagens' : 'videos', body.criativo.filename)
    if (!fs.existsSync(filePath)) throw new Error(`Arquivo não encontrado: ${body.criativo.filename}`)
    const fileBuffer = fs.readFileSync(filePath)
    const base64 = fileBuffer.toString('base64')
    const imgData = await uploadAdImage(cfg, { base64, filename: body.criativo.filename, accountId })

    // 4. Criativo
    const creative = await createAdCreative(cfg, {
      name:        `${body.anuncio.name} — Criativo`,
      imageHash:   imgData.hash,
      link:        body.anuncio.link,
      message:     body.anuncio.message,
      headline:    body.anuncio.headline,
      description: body.anuncio.description,
      cta:         body.anuncio.cta,
      pageId:      body.anuncio.pageId,
      accountId,
    })
    const creativeId = String((creative as Record<string, unknown>).id)

    // 5. Anúncio
    const ad = await createAd(cfg, {
      name:      body.anuncio.name,
      adsetId,
      creativeId,
      accountId,
    })

    return NextResponse.json({
      ok: true,
      campaignId,
      adsetId,
      creativeId,
      adId: String((ad as Record<string, unknown>).id),
      previewUrl: imgData.url,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
