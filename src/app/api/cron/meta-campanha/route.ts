import { NextResponse } from 'next/server'
import {
  getMetaCreateConfig, checkAdsManagement, createCampaign, createAdSet, getVideoThumbnail,
  createStaticVideoAdCreative, createAd, buildUtmTags,
} from '@/lib/admin/meta-create'

// Cria uma campanha de vendas ABO (1 conjunto por vídeo) com vídeos que já existem na conta (14/10/2026).
// Tudo nasce PAUSADO (campanha, conjuntos e anúncios): ligar é decisão do usuário no Gerenciador.
// Protegida pelo CRON_SECRET. Com "teste": true só valida (permissão, conta, vídeos e capas) e não cria nada.

export const maxDuration = 300

interface Pedido {
  teste?: boolean
  conta: string
  campanha: string
  link: string
  paginaId: string
  instagramId?: string
  idadeMin?: number
  idadeMax?: number
  conjuntos: { nome: string; videoId: string; orcamentoDia: number; texto: string; titulo: string }[]
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const cfg = getMetaCreateConfig()
  if (!cfg) return NextResponse.json({ ok: false, erro: 'Meta não configurada (token, contas ou páginas)' }, { status: 500 })

  const p = await request.json().catch(() => null) as Pedido | null
  if (!p || !/^\d+$/.test(p.conta) || !p.campanha || !/^https:\/\//.test(p.link) || !/^\d+$/.test(p.paginaId)
    || !Array.isArray(p.conjuntos) || !p.conjuntos.length || p.conjuntos.length > 20
    || p.conjuntos.some(c => !c.nome || !/^\d+$/.test(c.videoId) || !(c.orcamentoDia >= 6 && c.orcamentoDia <= 500) || !c.texto || !c.titulo)) {
    return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
  }
  if (!cfg.accounts.some(a => a.id === p.conta)) return NextResponse.json({ ok: false, erro: 'conta fora das configuradas' }, { status: 400 })

  // Validação: permissão, pixel e capa de cada vídeo (a capa é obrigatória no criativo de vídeo).
  const perm = await checkAdsManagement()
  const capas: Record<string, string> = {}
  const problemas: string[] = []
  if (!perm.ok) problemas.push('token sem ads_management')
  if (!cfg.pixelId) problemas.push('pixel não configurado')
  for (const c of p.conjuntos) {
    try { capas[c.videoId] = await getVideoThumbnail(cfg, c.videoId) } catch (e) { problemas.push(`${c.nome}: ${e instanceof Error ? e.message : 'sem capa'}`) }
  }
  if (p.teste || problemas.length) {
    return NextResponse.json({ ok: !problemas.length, teste: true, problemas, videosComCapa: Object.keys(capas).length, pixel: !!cfg.pixelId })
  }

  const criados: { conjunto: string; adsetId?: string; creativeId?: string; adId?: string; erro?: string }[] = []
  const camp = await createCampaign(cfg, { name: p.campanha, objective: 'OUTCOME_SALES', accountId: p.conta })
  const campaignId = String(camp.id)
  const urlTags = buildUtmTags()
  for (const c of p.conjuntos) {
    const r: (typeof criados)[number] = { conjunto: c.nome }
    try {
      const adset = await createAdSet(cfg, { name: c.nome, campaignId, accountId: p.conta, dailyBudgetBrl: c.orcamentoDia,
        ageMin: p.idadeMin ?? 18, ageMax: p.idadeMax ?? 65, gender: 'all' })
      r.adsetId = String(adset.id)
      const cr = await createStaticVideoAdCreative(cfg, { name: c.nome, videoId: c.videoId, thumbnailUrl: capas[c.videoId], link: p.link,
        message: c.texto, title: c.titulo, cta: 'SHOP_NOW', pageId: p.paginaId, accountId: p.conta, urlTags, igUserId: p.instagramId })
      r.creativeId = String(cr.id)
      const ad = await createAd(cfg, { name: c.nome, adsetId: r.adsetId, creativeId: r.creativeId, accountId: p.conta })
      r.adId = String(ad.id)
    } catch (e) { r.erro = e instanceof Error ? e.message : 'erro' }
    criados.push(r)
  }
  return NextResponse.json({ ok: criados.every(c => !c.erro), campaignId, criados })
}
