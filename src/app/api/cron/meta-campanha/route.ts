import { NextResponse } from 'next/server'
import {
  getMetaCreateConfig, checkAdsManagement, createCampaign, createAdSet, getVideoThumbnail,
  createStaticVideoAdCreative, createAd, buildUtmTags, uploadAdImage, createPlacementImageCreative,
} from '@/lib/admin/meta-create'

// Cria uma campanha de vendas ABO (1 conjunto por vídeo, ou por arte estática no modo "estaticos") com vídeos que já existem na conta (14/10/2026).
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

interface Estaticos {
  teste?: boolean
  conta: string
  campanha: string
  link: string
  paginaId: string
  instagramId?: string
  idadeMin?: number
  idadeMax?: number
  conjuntos: { nome: string; feedDriveId: string; storiesDriveId: string; orcamentoDia: number; texto: string; titulo: string; descricao: string }[]
}

/** Baixa uma arte de pasta pública do Drive. Só aceita PNG (o cabeçalho dá a proporção pra conferir feed × stories). */
async function baixarArte(driveId: string): Promise<Buffer> {
  const res = await fetch(`https://drive.google.com/uc?export=download&id=${driveId}`, { cache: 'no-store', signal: AbortSignal.timeout(60000) })
  if (!res.ok) throw new Error(`Drive HTTP ${res.status}`)
  const b = Buffer.from(await res.arrayBuffer())
  if (b.length < 1000 || b.readUInt32BE(0) !== 0x89504e47) throw new Error('não é PNG (pasta sem acesso público?)')
  if (b.length > 8 * 1024 * 1024) throw new Error('arte acima de 8 MB')
  return b
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

  // trocarLinkFeed (16/10/2026): igual ao trocarLink, mas pra anúncios de asset_feed_spec (estáticos por posicionamento):
  // copia o criativo atual (artes, textos, regras, url_tags) trocando só o link, e põe no mesmo anúncio. Lê de volta.
  const tlf = (corpo as { trocarLinkFeed?: { conta: string; campanhaId: string; link: string; adIds: string[] } } | null)?.trocarLinkFeed
  if (tlf) {
    if (!/^\d+$/.test(tlf.conta) || !/^\d+$/.test(tlf.campanhaId) || !/^https:\/\/justrunner\.com\.br\//.test(tlf.link)
      || !Array.isArray(tlf.adIds) || !tlf.adIds.length || tlf.adIds.length > 20 || tlf.adIds.some(id => !/^\d+$/.test(id))) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    if (!cfg.accounts.some(a => a.id === tlf.conta)) return NextResponse.json({ ok: false, erro: 'conta fora das configuradas' }, { status: 400 })
    const ler = (id: string) => fetch(`https://graph.facebook.com/v21.0/${id}?fields=name,campaign_id,effective_status,creative{name,object_story_spec,asset_feed_spec,url_tags}`,
      { headers: { Authorization: `Bearer ${cfg.token}` }, cache: 'no-store' }).then(x => x.json()) as Promise<Record<string, unknown>>
    type Cr = { name?: string; object_story_spec?: Record<string, unknown>; asset_feed_spec?: Record<string, unknown> & { link_urls?: { website_url?: string }[] }; url_tags?: string }
    const res = []
    for (const adId of tlf.adIds) {
      const r: Record<string, unknown> = { adId }
      try {
        const g = await ler(adId)
        if (g.campaign_id !== tlf.campanhaId) throw new Error('não pertence à campanha')
        const cr = g.creative as Cr
        if (!cr?.asset_feed_spec || !cr.object_story_spec) throw new Error('anúncio sem asset_feed_spec')
        const novo = await fetch(`https://graph.facebook.com/v21.0/act_${tlf.conta}/adcreatives`, { method: 'POST', cache: 'no-store',
          headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cr.name ?? String(g.name), object_story_spec: cr.object_story_spec,
            asset_feed_spec: { ...cr.asset_feed_spec, link_urls: [{ website_url: tlf.link }] }, ...(cr.url_tags ? { url_tags: cr.url_tags } : {}) }),
        }).then(x => x.json()) as { id?: string; error?: { message?: string } }
        if (!novo.id) throw new Error(novo.error?.message ?? 'criativo não criado')
        await metaPostAd(adId, { creative: { creative_id: novo.id } }, cfg.token)
        const d = await ler(adId)
        r.nome = d.name; r.status = d.effective_status
        r.link = (d.creative as Cr)?.asset_feed_spec?.link_urls?.[0]?.website_url
      } catch (e) { r.erro = e instanceof Error ? e.message : 'erro' }
      res.push(r)
    }
    return NextResponse.json({ ok: res.every(r => !r.erro && r.link === tlf.link), anuncios: res })
  }

  // soInstagram (16/10/2026): conjuntos de UMA campanha passam a veicular só no Instagram (feed, stories, reels,
  // explorar). Mantém o resto do público como está. Lê de volta o targeting gravado.
  const si = (corpo as { soInstagram?: { campanhaId: string; ids: string[] } } | null)?.soInstagram
  if (si) {
    if (!/^\d+$/.test(si.campanhaId) || !Array.isArray(si.ids) || !si.ids.length || si.ids.length > 50 || si.ids.some(id => !/^\d+$/.test(id))) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    const ler = (id: string) => fetch(`https://graph.facebook.com/v21.0/${id}?fields=name,campaign_id,targeting`,
      { headers: { Authorization: `Bearer ${cfg.token}` }, cache: 'no-store' }).then(x => x.json()) as Promise<{ name?: string; campaign_id?: string; targeting?: Record<string, unknown> }>
    const res = []
    for (const id of si.ids) {
      const r: Record<string, unknown> = { id }
      try {
        const g = await ler(id)
        if (g.campaign_id !== si.campanhaId || !g.targeting) throw new Error('não pertence à campanha')
        const t = { ...g.targeting }
        delete t.facebook_positions; delete t.messenger_positions; delete t.audience_network_positions
        t.publisher_platforms = ['instagram']
        t.instagram_positions = ['stream', 'story', 'reels', 'explore']
        await metaPostAd(id, { targeting: t }, cfg.token)
        const d = await ler(id)
        r.nome = d.name; r.plataformas = d.targeting?.publisher_platforms; r.posicoes = d.targeting?.instagram_positions
      } catch (e) { r.erro = e instanceof Error ? e.message : 'erro' }
      res.push(r)
    }
    return NextResponse.json({ ok: res.every(r => !r.erro && JSON.stringify(r.plataformas) === '["instagram"]'), itens: res })
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

  // estaticos (16/10/2026): campanha ABO de imagem, 1 conjunto por arte, cada anúncio com a arte de feed (4:5)
  // no feed e a de stories (9:16) em stories/reels. As artes vêm de pastas públicas do Drive, pelo id do arquivo.
  // Tudo nasce PAUSADO. Com "teste": true só baixa e confere as artes, a permissão e o pixel.
  const est = (corpo as { estaticos?: Estaticos } | null)?.estaticos
  if (est) {
    const id = /^[A-Za-z0-9_-]{20,60}$/
    if (!/^\d+$/.test(est.conta) || !est.campanha || !/^https:\/\/justrunner\.com\.br\//.test(est.link) || !/^\d+$/.test(est.paginaId)
      || !Array.isArray(est.conjuntos) || !est.conjuntos.length || est.conjuntos.length > 20
      || est.conjuntos.some(c => !c.nome || !id.test(c.feedDriveId) || !id.test(c.storiesDriveId) || !(c.orcamentoDia >= 6 && c.orcamentoDia <= 500)
        || !c.texto || !c.titulo || !c.descricao)) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    if (!cfg.accounts.some(a => a.id === est.conta)) return NextResponse.json({ ok: false, erro: 'conta fora das configuradas' }, { status: 400 })
    const problemas: string[] = []
    if (!(await checkAdsManagement()).ok) problemas.push('token sem ads_management')
    const pxConta = await fetch(`https://graph.facebook.com/v21.0/act_${est.conta}/adspixels?fields=id`, { headers: { Authorization: `Bearer ${cfg.token}` }, cache: 'no-store' })
      .then(x => x.json()).then((j: { data?: { id: string }[] }) => (j.data ?? []).map(x => x.id)).catch(() => [] as string[])
    const pixelId = pxConta.includes(cfg.pixelId) ? cfg.pixelId : pxConta[0] ?? ''
    if (!pixelId) problemas.push('a conta não enxerga nenhum pixel')
    const artes: Record<string, Buffer> = {}
    for (const c of est.conjuntos) {
      for (const [driveId, alvo, nome] of [[c.feedDriveId, 0.8, 'feed'], [c.storiesDriveId, 0.5625, 'stories']] as const) {
        try {
          const b = await baixarArte(driveId)
          const proporcao = b.readUInt32BE(16) / b.readUInt32BE(20)   // largura/altura do cabeçalho PNG
          if (Math.abs(proporcao - alvo) > 0.02) throw new Error(`proporção ${proporcao.toFixed(3)}, esperado ${alvo}`)
          artes[driveId] = b
        } catch (e) { problemas.push(`${c.nome} (${nome}): ${e instanceof Error ? e.message : 'erro'}`) }
      }
    }
    if (est.teste || problemas.length) {
      return NextResponse.json({ ok: !problemas.length, teste: true, problemas, artes: Object.keys(artes).length, pixel: pixelId })
    }

    const criados: { conjunto: string; adsetId?: string; creativeId?: string; adId?: string; erro?: string }[] = []
    const camp = await createCampaign(cfg, { name: est.campanha, objective: 'OUTCOME_SALES', accountId: est.conta })
    const campaignId = String(camp.id)
    const urlTags = buildUtmTags()
    for (const c of est.conjuntos) {
      const r: (typeof criados)[number] = { conjunto: c.nome }
      try {
        const [feed, story] = await Promise.all([
          uploadAdImage(cfg, { base64: artes[c.feedDriveId].toString('base64'), filename: `${c.nome} - feed.png`, accountId: est.conta }),
          uploadAdImage(cfg, { base64: artes[c.storiesDriveId].toString('base64'), filename: `${c.nome} - stories.png`, accountId: est.conta }),
        ])
        const adset = await createAdSet({ ...cfg, pixelId }, { name: c.nome, campaignId, accountId: est.conta, dailyBudgetBrl: c.orcamentoDia,
          ageMin: est.idadeMin ?? 18, ageMax: est.idadeMax ?? 65, gender: 'all' })
        r.adsetId = String(adset.id)
        const cr = await createPlacementImageCreative(cfg, { name: c.nome, feedHash: feed.hash, storyHash: story.hash, link: est.link,
          message: c.texto, headline: c.titulo, description: c.descricao, cta: 'SHOP_NOW', pageId: est.paginaId, accountId: est.conta,
          urlTags, igUserId: est.instagramId })
        r.creativeId = String(cr.id)
        const ad = await createAd(cfg, { name: c.nome, adsetId: r.adsetId, creativeId: r.creativeId, accountId: est.conta })
        r.adId = String(ad.id)
      } catch (e) { r.erro = e instanceof Error ? e.message : 'erro' }
      criados.push(r)
    }
    return NextResponse.json({ ok: criados.every(c => !c.erro), campaignId, criados })
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
