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
  const j = await res.json().catch(() => ({})) as { error?: { message?: string; error_user_title?: string; error_user_msg?: string } }
  if (!res.ok || j.error) throw new Error([j.error?.message ?? `HTTP ${res.status}`, j.error?.error_user_title, j.error?.error_user_msg].filter(Boolean).join(' | '))
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

  // lerFeed (26/10/2026): pede à Meta uma leitura do feed agora (o agendamento é 1×/dia) e devolve o resultado.
  const lf = (corpo as { lerFeed?: { feed: string; url: string } } | null)?.lerFeed
  if (lf) {
    if (!/^\d+$/.test(lf.feed) || !/^https:\/\/justrunner\.com\.br\//.test(lf.url)) return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    const res = await fetch(`https://graph.facebook.com/v21.0/${lf.feed}/uploads?${new URLSearchParams({ url: lf.url })}`, { method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${cfg.token}` } })
    return NextResponse.json({ ok: res.ok, resposta: await res.json().catch(() => ({})) })
  }

  // catalogoPixel (26/10/2026): conecta pixel(s) a um catálogo e desconecta de outro. O "Produtos"
  // dos anúncios e o Advantage+ de catálogo usam o catálogo ligado ao pixel; o PIXEL 01 estava só
  // no catálogo da Shopify antiga. Lê de volta as fontes de evento dos dois catálogos.
  const cp = (corpo as { catalogoPixel?: { ligar?: { catalogo: string; pixels: string[] }; desligar?: { catalogo: string; pixels: string[] } } } | null)?.catalogoPixel
  if (cp) {
    const ok = (x?: { catalogo: string; pixels: string[] }) => !x || (/^\d+$/.test(x.catalogo) && Array.isArray(x.pixels) && x.pixels.length > 0 && x.pixels.every(p => /^\d+$/.test(p)))
    if (!ok(cp.ligar) || !ok(cp.desligar) || (!cp.ligar && !cp.desligar)) return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    const chamar = async (metodo: 'POST' | 'DELETE', x: { catalogo: string; pixels: string[] }) => {
      const qs = new URLSearchParams({ external_event_sources: JSON.stringify(x.pixels) })
      const res = await fetch(`https://graph.facebook.com/v21.0/${x.catalogo}/external_event_sources?${qs}`, { method: metodo, cache: 'no-store', headers: { Authorization: `Bearer ${cfg.token}` } })
      const j = await res.json().catch(() => ({})) as { error?: { message?: string; error_user_msg?: string } }
      return res.ok ? { ok: true, resposta: j } : { ok: false, erro: j.error?.error_user_msg ?? j.error?.message ?? `HTTP ${res.status}` }
    }
    const fontes = async (catalogo: string) => (await (await fetch(`https://graph.facebook.com/v21.0/${catalogo}/external_event_sources?fields=id,name`, { headers: { Authorization: `Bearer ${cfg.token}` }, cache: 'no-store' })).json())
    const r: Record<string, unknown> = {}
    if (cp.ligar) r.ligar = await chamar('POST', cp.ligar)
    if (cp.desligar && (!cp.ligar || (r.ligar as { ok: boolean }).ok)) r.desligar = await chamar('DELETE', cp.desligar)
    for (const c of [cp.ligar?.catalogo, cp.desligar?.catalogo].filter(Boolean) as string[]) r[`fontes_${c}`] = await fontes(c)
    return NextResponse.json({ ok: true, ...r })
  }

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

  // subirVideos (16/10/2026): manda a Meta buscar vídeos de pastas públicas do Drive (file_url) pra biblioteca da conta.
  // Devolve o id de cada vídeo; a criação da campanha (modo padrão, com "teste": true antes) confere se já processaram.
  const sv = (corpo as { subirVideos?: { conta: string; videos: { nome: string; driveId: string }[] } } | null)?.subirVideos
  if (sv) {
    if (!/^\d+$/.test(sv.conta) || !Array.isArray(sv.videos) || !sv.videos.length || sv.videos.length > 20
      || sv.videos.some(v => !v.nome || !/^[A-Za-z0-9_-]{20,60}$/.test(v.driveId))) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    if (!cfg.accounts.some(a => a.id === sv.conta)) return NextResponse.json({ ok: false, erro: 'conta fora das configuradas' }, { status: 400 })
    const res = []
    for (const v of sv.videos) {
      const r: Record<string, unknown> = { nome: v.nome }
      try {
        const j = await fetch(`https://graph.facebook.com/v21.0/act_${sv.conta}/advideos`, { method: 'POST', cache: 'no-store',
          headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: v.nome, file_url: `https://drive.usercontent.google.com/download?id=${v.driveId}&export=download&confirm=t` }),
        }).then(x => x.json()) as { id?: string; error?: { message?: string } }
        if (!j.id) throw new Error(j.error?.message ?? 'vídeo não criado')
        r.videoId = j.id
      } catch (e) { r.erro = e instanceof Error ? e.message : 'erro' }
      res.push(r)
    }
    return NextResponse.json({ ok: res.every(r => !r.erro), videos: res })
  }

  // agendarInicio (16/10/2026): data/hora de início (start_time) dos conjuntos de UMA campanha. Lê de volta.
  const ai = (corpo as { agendarInicio?: { campanhaId: string; ids: string[]; inicio: string } } | null)?.agendarInicio
  if (ai) {
    if (!/^\d+$/.test(ai.campanhaId) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/.test(ai.inicio) || !Array.isArray(ai.ids) || !ai.ids.length
      || ai.ids.length > 50 || ai.ids.some(id => !/^\d+$/.test(id))) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    const ler = (id: string) => fetch(`https://graph.facebook.com/v21.0/${id}?fields=name,campaign_id,start_time`,
      { headers: { Authorization: `Bearer ${cfg.token}` }, cache: 'no-store' }).then(x => x.json()) as Promise<{ name?: string; campaign_id?: string; start_time?: string }>
    const alvo = new Date(ai.inicio).getTime()
    const res = []
    for (const id of ai.ids) {
      const r: Record<string, unknown> = { id }
      try {
        const g = await ler(id)
        if (g.campaign_id !== ai.campanhaId) throw new Error('não pertence à campanha')
        await metaPostAd(id, { start_time: Math.round(alvo / 1000) }, cfg.token)   // unix: a Meta recusou o ISO com -03:00 ("Invalid parameter")
        const d = await ler(id)
        r.nome = d.name; r.inicio = d.start_time; r.confere = !!d.start_time && new Date(d.start_time).getTime() === alvo
      } catch (e) { r.erro = e instanceof Error ? e.message : 'erro' }
      res.push(r)
    }
    return NextResponse.json({ ok: res.every(r => !r.erro && r.confere), itens: res })
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

  // 19/10/2026 — reestruturação da conta (verba R$ 250/dia). Todos leem de volta o que gravaram.
  const g = (path: string) => fetch(`https://graph.facebook.com/v21.0/${path}`, { headers: { Authorization: `Bearer ${cfg.token}` }, cache: 'no-store' })
    .then(x => x.json()) as Promise<Record<string, unknown> & { error?: { message?: string } }>
  const contaOk = (acc: unknown) => cfg.accounts.some(a => a.id === String(acc ?? '').replace(/^act_/, ''))

  // estado: só leitura. Status e orçamento (R$) de campanhas e dos conjuntos delas.
  const est0 = (corpo as { estado?: { campanhas: string[] } } | null)?.estado
  if (est0) {
    if (!Array.isArray(est0.campanhas) || !est0.campanhas.length || est0.campanhas.length > 30 || est0.campanhas.some(id => !/^\d+$/.test(id))) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    const reais = (v: unknown) => v == null ? null : Number(v) / 100
    const res = []
    for (const id of est0.campanhas) {
      const c = await g(`${id}?fields=name,objective,status,effective_status,daily_budget,account_id,adsets.limit(60){name,status,effective_status,daily_budget}`)
      if (c.error) { res.push({ id, erro: c.error.message }); continue }
      res.push({ id, nome: c.name, objetivo: c.objective, status: c.status, efetivo: c.effective_status, orcamentoDia: reais(c.daily_budget),
        conjuntos: ((c.adsets as { data?: Record<string, unknown>[] })?.data ?? []).map(a => ({ id: a.id, nome: a.name, status: a.status, efetivo: a.effective_status, orcamentoDia: reais(a.daily_budget) })) })
    }
    return NextResponse.json({ ok: true, campanhas: res })
  }

  // orcamento: troca o orçamento diário (R$) de campanha CBO ou de conjunto ABO. Só da conta configurada.
  const orc = (corpo as { orcamento?: { itens: { id: string; reais: number }[] } } | null)?.orcamento
  if (orc) {
    if (!Array.isArray(orc.itens) || !orc.itens.length || orc.itens.length > 30 || orc.itens.some(i => !/^\d+$/.test(i.id) || !(i.reais >= 6 && i.reais <= 1000))) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    const res = []
    for (const it of orc.itens) {
      const r: Record<string, unknown> = { id: it.id, pedido: it.reais }
      try {
        const a = await g(`${it.id}?fields=name,account_id,daily_budget`)
        if (a.error) throw new Error(a.error.message)
        if (!contaOk(a.account_id)) throw new Error('fora da conta configurada')
        if (a.daily_budget == null) throw new Error('sem orçamento diário nesse nível (CBO fica na campanha, ABO no conjunto)')
        r.nome = a.name; r.antes = Number(a.daily_budget) / 100
        await metaPostAd(it.id, { daily_budget: Math.round(it.reais * 100) }, cfg.token)
        const d = await g(`${it.id}?fields=daily_budget`); r.depois = Number(d.daily_budget) / 100
      } catch (e) { r.erro = e instanceof Error ? e.message : 'erro' }
      res.push(r)
    }
    return NextResponse.json({ ok: res.every(r => !r.erro && r.depois === r.pedido), itens: res })
  }

  // statusCampanha: liga/pausa campanhas inteiras (só da conta configurada).
  const sc = (corpo as { statusCampanha?: { ids: string[]; status: 'ACTIVE' | 'PAUSED' } } | null)?.statusCampanha
  if (sc) {
    if (!['ACTIVE', 'PAUSED'].includes(sc.status) || !Array.isArray(sc.ids) || !sc.ids.length || sc.ids.length > 30 || sc.ids.some(id => !/^\d+$/.test(id))) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    const res = []
    for (const id of sc.ids) {
      const r: Record<string, unknown> = { id }
      try {
        const c = await g(`${id}?fields=name,account_id,objective`)
        if (c.error) throw new Error(c.error.message)
        if (!contaOk(c.account_id) || !c.objective) throw new Error('não é campanha da conta configurada')
        r.nome = c.name
        await metaPostAd(id, { status: sc.status }, cfg.token)
        const d = await g(`${id}?fields=status,effective_status`); r.status = d.status; r.efetivo = d.effective_status
      } catch (e) { r.erro = e instanceof Error ? e.message : 'erro' }
      res.push(r)
    }
    return NextResponse.json({ ok: res.every(r => !r.erro && r.status === sc.status), itens: res })
  }

  // mensagens: campanha de engajamento com anúncios que abrem conversa no Direct do Instagram (1 conjunto ABO,
  // só Instagram, 1 anúncio por vídeo). Tudo nasce PAUSADO. Com "teste": true só confere permissão e capas.
  const msg = (corpo as { mensagens?: {
    teste?: boolean; conta: string; campanha: string; conjunto: string; orcamentoDia: number; paginaId: string; instagramId: string
    idadeMin?: number; idadeMax?: number; texto: string; videos: { nome: string; videoId: string }[]
  } } | null)?.mensagens
  if (msg) {
    if (!/^\d+$/.test(msg.conta) || !msg.campanha || !msg.conjunto || !/^\d+$/.test(msg.paginaId) || !/^\d+$/.test(msg.instagramId)
      || !(msg.orcamentoDia >= 6 && msg.orcamentoDia <= 500) || !msg.texto
      || !Array.isArray(msg.videos) || !msg.videos.length || msg.videos.length > 10 || msg.videos.some(v => !v.nome || !/^\d+$/.test(v.videoId))) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    if (!cfg.accounts.some(a => a.id === msg.conta)) return NextResponse.json({ ok: false, erro: 'conta fora das configuradas' }, { status: 400 })
    const problemas: string[] = []
    if (!(await checkAdsManagement()).ok) problemas.push('token sem ads_management')
    const capas: Record<string, string> = {}
    for (const v of msg.videos) {
      try { capas[v.videoId] = await getVideoThumbnail(cfg, v.videoId) } catch (e) { problemas.push(`${v.nome}: ${e instanceof Error ? e.message : 'sem capa'}`) }
    }
    if (msg.teste || problemas.length) return NextResponse.json({ ok: !problemas.length, teste: true, problemas, videosComCapa: Object.keys(capas).length })

    const post = async (path: string, body: Record<string, unknown>) => {
      const res = await fetch(`https://graph.facebook.com/v21.0/${path}`, { method: 'POST', cache: 'no-store',
        headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({})) as { id?: string; error?: { message?: string; error_user_title?: string; error_user_msg?: string } }
      if (!res.ok || j.error || !j.id) throw new Error([j.error?.message ?? `HTTP ${res.status}`, j.error?.error_user_title, j.error?.error_user_msg].filter(Boolean).join(' | '))
      return j.id
    }
    const out: Record<string, unknown> = {}
    try {
      out.campaignId = await post(`act_${msg.conta}/campaigns`, { name: msg.campanha, objective: 'OUTCOME_ENGAGEMENT', status: 'PAUSED',
        special_ad_categories: [], is_adset_budget_sharing_enabled: false })
      out.adsetId = await post(`act_${msg.conta}/adsets`, { name: msg.conjunto, campaign_id: out.campaignId, status: 'PAUSED',
        daily_budget: Math.round(msg.orcamentoDia * 100), billing_event: 'IMPRESSIONS', optimization_goal: 'CONVERSATIONS',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP', destination_type: 'INSTAGRAM_DIRECT', promoted_object: { page_id: msg.paginaId },
        targeting: { geo_locations: { countries: ['BR'] }, age_min: msg.idadeMin ?? 18, age_max: msg.idadeMax ?? 65,
          publisher_platforms: ['instagram'], instagram_positions: ['stream', 'story', 'reels'], targeting_automation: { advantage_audience: 0 } } })
      const anuncios = []
      for (const v of msg.videos) {
        const a: Record<string, unknown> = { nome: v.nome }
        try {
          a.creativeId = await post(`act_${msg.conta}/adcreatives`, { name: v.nome, object_story_spec: { page_id: msg.paginaId, instagram_user_id: msg.instagramId,
            video_data: { video_id: v.videoId, image_url: capas[v.videoId], message: msg.texto,
              call_to_action: { type: 'INSTAGRAM_MESSAGE', value: { app_destination: 'INSTAGRAM_DIRECT' } } } } })
          a.adId = await post(`act_${msg.conta}/ads`, { name: v.nome, adset_id: out.adsetId, creative: { creative_id: a.creativeId }, status: 'PAUSED' })
        } catch (e) { a.erro = e instanceof Error ? e.message : 'erro' }
        anuncios.push(a)
      }
      out.anuncios = anuncios
    } catch (e) { out.erro = e instanceof Error ? e.message : 'erro' }
    if (out.campaignId) out.lido = await g(`${out.campaignId}?fields=name,objective,status,adsets{name,status,daily_budget,optimization_goal,destination_type,ads{name,status,effective_status}}`)
    return NextResponse.json({ ok: !out.erro && (out.anuncios as { erro?: string }[] | undefined)?.every(a => !a.erro), ...out })
  }

  // buscarInteresses (16/10/2026): só leitura. Procura interesses de público na Meta (id, nome, tamanho, caminho).
  const bi = (corpo as { buscarInteresses?: { termos: string[] } } | null)?.buscarInteresses
  if (bi) {
    if (!Array.isArray(bi.termos) || !bi.termos.length || bi.termos.length > 30 || bi.termos.some(t => typeof t !== 'string' || !t.trim())) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    const res: Record<string, unknown> = {}
    for (const t of bi.termos) {
      const j = await fetch(`https://graph.facebook.com/v21.0/search?type=adinterest&limit=8&locale=pt_BR&q=${encodeURIComponent(t)}`,
        { headers: { Authorization: `Bearer ${cfg.token}` }, cache: 'no-store' }).then(x => x.json()) as { data?: Record<string, unknown>[]; error?: { message?: string } }
      res[t] = j.error ? { erro: j.error.message } : (j.data ?? []).map(d => ({ id: d.id, nome: d.name,
        tamanho: [d.audience_size_lower_bound, d.audience_size_upper_bound], caminho: d.path }))
    }
    return NextResponse.json({ ok: true, interesses: res })
  }

  // cbo (16/10/2026): campanha de vendas CBO (orçamento na campanha), 1 conjunto por público de interesses e,
  // em cada conjunto, 1 anúncio por vídeo (um criativo por anúncio, mesma copy em todos). Tudo nasce PAUSADO.
  // Com "teste": true só confere permissão, pixel, capas dos vídeos e ids de interesse.
  const cbo = (corpo as { cbo?: {
    teste?: boolean; conta: string; campanha: string; orcamentoDia: number; link: string; paginaId: string; instagramId?: string
    idadeMin?: number; idadeMax?: number; soInstagram?: boolean
    videos: { nome: string; videoId: string }[]; texto: string; titulo: string
    conjuntos: { nome: string; interesses: { id: string; name: string }[] }[]
  } } | null)?.cbo
  if (cbo) {
    if (!/^\d+$/.test(cbo.conta) || !cbo.campanha || !/^https:\/\/justrunner\.com\.br\//.test(cbo.link) || !/^\d+$/.test(cbo.paginaId)
      || !(cbo.orcamentoDia >= 6 && cbo.orcamentoDia <= 1000) || !cbo.texto || !cbo.titulo
      || !Array.isArray(cbo.videos) || !cbo.videos.length || cbo.videos.length > 10 || cbo.videos.some(v => !v.nome || !/^\d+$/.test(v.videoId))
      || !Array.isArray(cbo.conjuntos) || !cbo.conjuntos.length || cbo.conjuntos.length > 20
      || cbo.conjuntos.some(c => !c.nome || !Array.isArray(c.interesses) || !c.interesses.length || c.interesses.some(i => !/^\d+$/.test(i.id) || !i.name))) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    if (!cfg.accounts.some(a => a.id === cbo.conta)) return NextResponse.json({ ok: false, erro: 'conta fora das configuradas' }, { status: 400 })
    const problemas: string[] = []
    if (!(await checkAdsManagement()).ok) problemas.push('token sem ads_management')
    const pxConta = await fetch(`https://graph.facebook.com/v21.0/act_${cbo.conta}/adspixels?fields=id`, { headers: { Authorization: `Bearer ${cfg.token}` }, cache: 'no-store' })
      .then(x => x.json()).then((j: { data?: { id: string }[] }) => (j.data ?? []).map(x => x.id)).catch(() => [] as string[])
    const pixelId = pxConta.includes(cfg.pixelId) ? cfg.pixelId : pxConta[0] ?? ''
    if (!pixelId) problemas.push('a conta não enxerga nenhum pixel')
    const capas: Record<string, string> = {}
    for (const v of cbo.videos) {
      try { capas[v.videoId] = await getVideoThumbnail(cfg, v.videoId) } catch (e) { problemas.push(`${v.nome}: ${e instanceof Error ? e.message : 'sem capa'}`) }
    }
    if (cbo.teste || problemas.length) {
      return NextResponse.json({ ok: !problemas.length, teste: true, problemas, videosComCapa: Object.keys(capas).length, pixel: pixelId })
    }

    const camp = await createCampaign(cfg, { name: cbo.campanha, objective: 'OUTCOME_SALES', accountId: cbo.conta, cboDailyBudgetBrl: cbo.orcamentoDia })
    const campaignId = String(camp.id)
    const urlTags = buildUtmTags()
    // um criativo por vídeo, reaproveitado nos conjuntos (o anúncio é que é por conjunto)
    const criativos: Record<string, string> = {}
    const criados: { conjunto: string; adsetId?: string; anuncios: { nome: string; adId?: string; erro?: string }[]; erro?: string }[] = []
    for (const c of cbo.conjuntos) {
      const r: (typeof criados)[number] = { conjunto: c.nome, anuncios: [] }
      try {
        const adset = await createAdSet({ ...cfg, pixelId }, { name: c.nome, campaignId, accountId: cbo.conta, isCbo: true,
          ageMin: cbo.idadeMin ?? 18, ageMax: cbo.idadeMax ?? 65, gender: 'all', interests: c.interesses, soInstagram: cbo.soInstagram })
        r.adsetId = String(adset.id)
        for (const v of cbo.videos) {
          const a: (typeof r.anuncios)[number] = { nome: v.nome }
          try {
            if (!criativos[v.videoId]) {
              const cr = await createStaticVideoAdCreative(cfg, { name: v.nome, videoId: v.videoId, thumbnailUrl: capas[v.videoId], link: cbo.link,
                message: cbo.texto, title: cbo.titulo, cta: 'SHOP_NOW', pageId: cbo.paginaId, accountId: cbo.conta, urlTags, igUserId: cbo.instagramId })
              criativos[v.videoId] = String(cr.id)
            }
            const ad = await createAd(cfg, { name: v.nome, adsetId: r.adsetId, creativeId: criativos[v.videoId], accountId: cbo.conta })
            a.adId = String(ad.id)
          } catch (e) { a.erro = e instanceof Error ? e.message : 'erro' }
          r.anuncios.push(a)
        }
      } catch (e) { r.erro = e instanceof Error ? e.message : 'erro' }
      criados.push(r)
    }
    // lê de volta campanha e conjuntos
    const ler = (path: string) => fetch(`https://graph.facebook.com/v21.0/${path}`, { headers: { Authorization: `Bearer ${cfg.token}` }, cache: 'no-store' }).then(x => x.json())
    const lido = await ler(`${campaignId}?fields=name,status,daily_budget,bid_strategy,adsets{name,status,targeting{flexible_spec,publisher_platforms},ads{name,status}}`)
    return NextResponse.json({ ok: criados.every(c => !c.erro && c.anuncios.every(a => !a.erro)), campaignId, criados, lido })
  }

  // adicionarAnuncios (16/10/2026): põe mais vídeos (1 anúncio por vídeo, PAUSADO) em conjuntos que já existem numa campanha.
  // Cada conjunto precisa ser da campanha informada. Com "teste": true só confere conjuntos e capas. Lê de volta.
  const aa = (corpo as { adicionarAnuncios?: {
    teste?: boolean; conta: string; campanhaId: string; adsetIds: string[]; link: string; paginaId: string; instagramId?: string
    videos: { nome: string; videoId: string }[]; texto: string; titulo: string
  } } | null)?.adicionarAnuncios
  if (aa) {
    if (!/^\d+$/.test(aa.conta) || !/^\d+$/.test(aa.campanhaId) || !/^https:\/\/justrunner\.com\.br\//.test(aa.link) || !/^\d+$/.test(aa.paginaId)
      || !aa.texto || !aa.titulo || !Array.isArray(aa.adsetIds) || !aa.adsetIds.length || aa.adsetIds.length > 20 || aa.adsetIds.some(id => !/^\d+$/.test(id))
      || !Array.isArray(aa.videos) || !aa.videos.length || aa.videos.length > 10 || aa.videos.some(v => !v.nome || !/^\d+$/.test(v.videoId))) {
      return NextResponse.json({ ok: false, erro: 'pedido inválido' }, { status: 400 })
    }
    if (!cfg.accounts.some(a => a.id === aa.conta)) return NextResponse.json({ ok: false, erro: 'conta fora das configuradas' }, { status: 400 })
    const ler = (path: string) => fetch(`https://graph.facebook.com/v21.0/${path}`, { headers: { Authorization: `Bearer ${cfg.token}` }, cache: 'no-store' }).then(x => x.json())
    const problemas: string[] = []
    for (const id of aa.adsetIds) {
      const g = await ler(`${id}?fields=campaign_id`) as { campaign_id?: string }
      if (g.campaign_id !== aa.campanhaId) problemas.push(`${id}: não pertence à campanha`)
    }
    const capas: Record<string, string> = {}
    for (const v of aa.videos) {
      try { capas[v.videoId] = await getVideoThumbnail(cfg, v.videoId) } catch (e) { problemas.push(`${v.nome}: ${e instanceof Error ? e.message : 'sem capa'}`) }
    }
    if (aa.teste || problemas.length) return NextResponse.json({ ok: !problemas.length, teste: true, problemas, videosComCapa: Object.keys(capas).length })

    const urlTags = buildUtmTags()
    const criativos: Record<string, string> = {}
    const criados: { adsetId: string; nome: string; adId?: string; erro?: string }[] = []
    for (const adsetId of aa.adsetIds) {
      for (const v of aa.videos) {
        const r: (typeof criados)[number] = { adsetId, nome: v.nome }
        try {
          if (!criativos[v.videoId]) {
            const cr = await createStaticVideoAdCreative(cfg, { name: v.nome, videoId: v.videoId, thumbnailUrl: capas[v.videoId], link: aa.link,
              message: aa.texto, title: aa.titulo, cta: 'SHOP_NOW', pageId: aa.paginaId, accountId: aa.conta, urlTags, igUserId: aa.instagramId })
            criativos[v.videoId] = String(cr.id)
          }
          r.adId = String((await createAd(cfg, { name: v.nome, adsetId, creativeId: criativos[v.videoId], accountId: aa.conta })).id)
        } catch (e) { r.erro = e instanceof Error ? e.message : 'erro' }
        criados.push(r)
      }
    }
    const lido = await ler(`${aa.campanhaId}?fields=name,status,daily_budget,adsets{name,status,ads{name,status,effective_status}}`)
    return NextResponse.json({ ok: criados.every(c => !c.erro), criados, lido })
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
