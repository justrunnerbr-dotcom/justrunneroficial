import { NextResponse } from 'next/server'
import {
  getMetaCreateConfig, checkAdsManagement, createCampaign, createAdSet, getVideoThumbnail,
  createStaticVideoAdCreative, createAd, buildUtmTags,
} from '@/lib/admin/meta-create'

// Cria uma campanha de vendas ABO (1 conjunto por vídeo) com vídeos que já existem na conta (14/10/2026).
// Tudo nasce PAUSADO (campanha, conjuntos e anúncios): ligar é decisão do usuário no Gerenciador.
// Protegida pelo CRON_SECRET. Com "teste": true só valida (permissão, conta, vídeos e capas) e não cria nada.

export const maxDuration = 300

interface TrocaLink {
  conta: string; link: string; paginaId: string; instagramId?: string; soConferir?: boolean
  anuncios: { adId: string; videoId: string; nome: string; texto: string; titulo: string }[]
}

async function metaPostAd(adId: string, body: Record<string, unknown>, token: string) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${adId}`, { method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await res.json().catch(() => ({})) as { error?: { message?: string } }
  if (!res.ok || j.error) throw new Error(j.error?.message ?? `HTTP ${res.status}`)
}

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

  const corpo = await request.json().catch(() => null) as (Pedido & { trocarLink?: TrocaLink }) | null

  // trocarLink: anúncios já criados (pausados) ganham criativo novo com outro link; o anúncio continua o mesmo.
  // Também devolve status e problemas (issues_info) de cada anúncio, pra conferir.
  if (corpo?.trocarLink) {
    const t = corpo.trocarLink
    if (!/^\d+$/.test(t.conta) || !/^https:\/\//.test(t.link) || !/^\d+$/.test(t.paginaId) || !Array.isArray(t.anuncios) || !t.anuncios.length || t.anuncios.length > 20
      || t.anuncios.some(a => !/^\d+$/.test(a.adId) || !/^\d+$/.test(a.videoId) || !a.texto || !a.titulo || !a.nome)) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    if (!cfg.accounts.some(a => a.id === t.conta)) return NextResponse.json({ ok: false, erro: 'conta fora das configuradas' }, { status: 400 })
    const urlTags = buildUtmTags()
    const res = []
    for (const a of t.anuncios) {
      const r: Record<string, unknown> = { adId: a.adId }
      try {
        if (!t.soConferir) {
          const capa = await getVideoThumbnail(cfg, a.videoId)
          const cr = await createStaticVideoAdCreative(cfg, { name: a.nome, videoId: a.videoId, thumbnailUrl: capa, link: t.link, message: a.texto, title: a.titulo,
            cta: 'SHOP_NOW', pageId: t.paginaId, accountId: t.conta, urlTags, igUserId: t.instagramId })
          r.creativeId = String(cr.id)
          await metaPostAd(a.adId, { creative: { creative_id: r.creativeId } }, cfg.token)
        }
        const g = await fetch(`https://graph.facebook.com/v21.0/${a.adId}?fields=status,effective_status,issues_info,creative{object_story_spec}`,
          { headers: { Authorization: `Bearer ${cfg.token}` }, cache: 'no-store' }).then(x => x.json()) as Record<string, unknown>
        r.status = g.effective_status; r.problemas = g.issues_info ?? null
        r.link = (g.creative as { object_story_spec?: { video_data?: { call_to_action?: { value?: { link?: string } } } } })?.object_story_spec?.video_data?.call_to_action?.value?.link
      } catch (e) { r.erro = e instanceof Error ? e.message : 'erro' }
      res.push(r)
    }
    return NextResponse.json({ ok: res.every(r => !r.erro && r.link === t.link), anuncios: res })
  }

  // mudarStatus: liga/pausa conjuntos e anúncios de UMA campanha. A campanha em si nunca é tocada aqui
  // (cada id precisa ter campaign_id igual ao informado e não pode ser a própria campanha). Devolve o estado lido depois.
  // trocarPixel: troca o pixel (promoted_object) dos conjuntos de UMA campanha. Só aceita pixel que a conta enxerga.
  const tp = (corpo as { trocarPixel?: { conta: string; campanhaId: string; pixelId: string; ids: string[] } } | null)?.trocarPixel
  if (tp) {
    if (!/^\d+$/.test(tp.conta) || !/^\d+$/.test(tp.campanhaId) || !/^\d+$/.test(tp.pixelId) || !Array.isArray(tp.ids) || !tp.ids.length || tp.ids.length > 50
      || tp.ids.some(id => !/^\d+$/.test(id) || id === tp.campanhaId)) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    const ler = (path: string) => fetch(`https://graph.facebook.com/v21.0/${path}`,
      { headers: { Authorization: `Bearer ${cfg.token}` }, cache: 'no-store' }).then(x => x.json()) as Promise<Record<string, unknown>>
    const px = await ler(`act_${tp.conta}/adspixels?fields=id`) as { data?: { id: string }[] }
    if (!px.data?.some(p => p.id === tp.pixelId)) return NextResponse.json({ ok: false, erro: 'a conta não enxerga esse pixel' }, { status: 400 })
    const res = []
    for (const id of tp.ids) {
      const r: Record<string, unknown> = { id }
      try {
        const g = await ler(`${id}?fields=name,campaign_id,promoted_object`)
        if (g.campaign_id !== tp.campanhaId) throw new Error('não pertence à campanha')
        const po = (g.promoted_object ?? {}) as Record<string, unknown>
        await metaPostAd(id, { promoted_object: { ...po, pixel_id: tp.pixelId, custom_event_type: po.custom_event_type ?? 'PURCHASE' } }, cfg.token)
        const d = await ler(`${id}?fields=name,promoted_object,effective_status`)
        r.nome = d.name; r.pixel = (d.promoted_object as { pixel_id?: string })?.pixel_id; r.efetivo = d.effective_status
      } catch (e) { r.erro = e instanceof Error ? e.message : 'erro' }
      res.push(r)
    }
    return NextResponse.json({ ok: res.every(r => !r.erro && r.pixel === tp.pixelId), itens: res })
  }

  const ms = (corpo as { mudarStatus?: { campanhaId: string; ids: string[]; status: 'ACTIVE' | 'PAUSED'; campanha?: 'ACTIVE' | 'PAUSED' } } | null)?.mudarStatus
  if (ms) {
    if (!/^\d+$/.test(ms.campanhaId) || !['ACTIVE', 'PAUSED'].includes(ms.status) || !Array.isArray(ms.ids) || !ms.ids.length || ms.ids.length > 50
      || ms.ids.some(id => !/^\d+$/.test(id) || id === ms.campanhaId)) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    const ler = (id: string, campos: string) => fetch(`https://graph.facebook.com/v21.0/${id}?fields=${campos}`,
      { headers: { Authorization: `Bearer ${cfg.token}` }, cache: 'no-store' }).then(x => x.json()) as Promise<Record<string, unknown>>
    const res = []
    for (const id of ms.ids) {
      const r: Record<string, unknown> = { id }
      try {
        const g = await ler(id, 'name,campaign_id')
        if (g.campaign_id !== ms.campanhaId) throw new Error('não pertence à campanha')
        r.nome = g.name
        await metaPostAd(id, { status: ms.status }, cfg.token)
        const d = await ler(id, 'status,effective_status')
        r.status = d.status; r.efetivo = d.effective_status
      } catch (e) { r.erro = e instanceof Error ? e.message : 'erro' }
      res.push(r)
    }
    // campanha: só quando pedido explicitamente no corpo (ligar a campanha é decisão do usuário)
    let erroCampanha: string | undefined
    if (ms.campanha === 'ACTIVE' || ms.campanha === 'PAUSED') {
      try { await metaPostAd(ms.campanhaId, { status: ms.campanha }, cfg.token) } catch (e) { erroCampanha = e instanceof Error ? e.message : 'erro' }
    }
    const camp = await ler(ms.campanhaId, 'name,status,effective_status')
    return NextResponse.json({ ok: !erroCampanha && res.every(r => !r.erro && r.status === ms.status), erroCampanha, campanha: camp, itens: res })
  }

  const p = corpo as Pedido | null
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
  // O pixel tem que ser um que a conta enxerga (15/10: o NEXT_PUBLIC_META_PIXEL_ID não estava na conta e travou os anúncios).
  const pxConta = await fetch(`https://graph.facebook.com/v21.0/act_${p.conta}/adspixels?fields=id`, { headers: { Authorization: `Bearer ${cfg.token}` }, cache: 'no-store' })
    .then(x => x.json()).then((j: { data?: { id: string }[] }) => (j.data ?? []).map(x => x.id)).catch(() => [] as string[])
  const pixelId = pxConta.includes(cfg.pixelId) ? cfg.pixelId : pxConta[0] ?? ''
  if (!pixelId) problemas.push('a conta não enxerga nenhum pixel')
  for (const c of p.conjuntos) {
    try { capas[c.videoId] = await getVideoThumbnail(cfg, c.videoId) } catch (e) { problemas.push(`${c.nome}: ${e instanceof Error ? e.message : 'sem capa'}`) }
  }
  if (p.teste || problemas.length) {
    return NextResponse.json({ ok: !problemas.length, teste: true, problemas, videosComCapa: Object.keys(capas).length, pixel: pixelId })
  }

  const criados: { conjunto: string; adsetId?: string; creativeId?: string; adId?: string; erro?: string }[] = []
  const camp = await createCampaign(cfg, { name: p.campanha, objective: 'OUTCOME_SALES', accountId: p.conta })
  const campaignId = String(camp.id)
  const urlTags = buildUtmTags()
  for (const c of p.conjuntos) {
    const r: (typeof criados)[number] = { conjunto: c.nome }
    try {
      const adset = await createAdSet({ ...cfg, pixelId }, { name: c.nome, campaignId, accountId: p.conta, dailyBudgetBrl: c.orcamentoDia,
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
