import { getAdminSupabase } from '@/lib/admin-client'
import type { SendMessagePayload, IgCard, IgButton } from '@/lib/ig/instagram'
import { searchCatalog, productVariants, bestSellers, productMedia, norm, type SearchHit } from '@/lib/ig/catalog-search'
import { getBotState, enqueueBot, setBotState, recentBotTexts, type BotMeta } from '@/lib/ig/bot-state'
import { getMenuConfig } from '@/lib/ig/menu'
import { BOT, FAQ, LINKS, detectIntent, isAgradecimento, isAceite, equipeOnline, type FaqKey } from '@/lib/ig/bot-content'

// Assistente da DM do Instagram.
//
// Entradas: texto livre, toque em resposta rápida (quick reply) ou em botão
// (postback). Saídas: mensagens na ig_queue, enviadas pelo /api/ig/drain.
// Desenhado a partir de 1.229 conversas reais (10/10/2026): metade chega com
// foto ou story, 25% pergunta preço, 21% um modelo, 15% é pós-venda, e 44% da
// pré-venda ficava sem resposta ou esperava mais de 1h.
//
// Para não atrapalhar o atendimento humano:
// - a equipe respondeu pelo app (eco que não é texto do bot) → o assistente
//   cala por PAUSA_EQUIPE_H naquele contato;
// - toque em "Falar com a equipe", troca, parceria, data apertada, reclamação
//   → cala por PAUSA_HUMANO_H (mas botão tocado depois sempre responde);
// - no meio da conversa só responde o que reconhece (modelo, dúvida
//   frequente, resposta à pergunta que acabou de fazer) e nunca repete a mesma
//   resposta em seguida — aí deixa para a equipe.

const PAUSA_EQUIPE_H = 6
const PAUSA_HUMANO_H = 12
const ESPERA_RESPOSTA_MIN = 30
const NAO_REPETIR_MIN = 20
const LEMBRETE_MIN = 120
const MENU_COMPLETO_H = 12 // menu inteiro no máximo 1x a cada 12h; antes disso, versão curta

type Db = ReturnType<typeof getAdminSupabase>
type Reply = { messages: SendMessagePayload[]; meta: BotMeta }

export interface Incoming {
  igScopedId: string
  text?: string
  payload?: string          // quick reply ou postback
  isStoryReply?: boolean
  /** last_user_response_at do contato ANTES desta mensagem. */
  previousMessageAt: string | null
}

// ── Montagem de mensagens ───────────────────────────────────────────────────

type Opt = [string, string]
export const qr = (text: string, options: Opt[]): SendMessagePayload => ({
  text,
  quick_replies: options.slice(0, 13).map(([title, payload]) => ({ content_type: 'text' as const, title: title.slice(0, 20), payload })),
})
const buttons = (text: string, list: IgButton[]): SendMessagePayload =>
  ({ attachment: { type: 'template', payload: { template_type: 'button', text, buttons: list.slice(0, 3) } } })

export const O = {
  menu: ['☰ Menu', 'BOT:MENU'] as Opt,
  buscar: ['🔎 Achar meu óculos', 'BOT:BUSCAR'] as Opt,
  buscarOutro: ['🔎 Buscar outro', 'BOT:BUSCAR'] as Opt,
  vendidos: ['🔥 Mais vendidos', 'BOT:MAIS_VENDIDOS'] as Opt,
  promo: ['💰 Preço e promo', 'BOT:PROMO'] as Opt,
  cor: ['🎨 Escolher por cor', 'BOT:ESTILO'] as Opt,
  prazo: ['🚚 Prazo e frete', 'BOT:FAQ:prazo'] as Opt,
  pedido: ['📦 Meu pedido', 'BOT:PEDIDO'] as Opt,
  troca: ['🔄 Troca ou defeito', 'BOT:TROCA'] as Opt,
  duvidas: ['❓ Outras dúvidas', 'BOT:DUVIDAS'] as Opt,
  parceria: ['🤝 Parceria', 'BOT:PARCERIA'] as Opt,
  equipe: ['💬 Falar c/ equipe', 'BOT:HUMANO'] as Opt,
  data: ['📅 Tenho uma data', 'BOT:DATA'] as Opt,
}

// Cor da lente: o jeito que o cliente mais procura (análise de 10/10/2026).
const CORES_QR: Opt[] = [
  ['⚫ Preta', 'BOT:COR:lente preto'], ['🪞 Espelhada', 'BOT:COR:lente espelhado'], ['🟤 Marrom/VR28', 'BOT:COR:lente marrom'],
  ['🔴 Vermelha/Ruby', 'BOT:COR:lente vermelho'], ['🔵 Azul', 'BOT:COR:lente azul'], ['🟣 Roxa', 'BOT:COR:lente roxo'],
  ['🟡 Dourada', 'BOT:COR:lente dourado'], ['⚪ Transparente', 'BOT:COR:transparente'], ['🩶 Armação prata', 'BOT:COR:armacao prata'],
]

const menu = (text: string) => qr(text, [O.buscar, O.cor, O.promo, O.vendidos, O.prazo, O.pedido, O.troca, O.duvidas, O.parceria, O.equipe])


function cards(hits: SearchHit[], comOutrasCores: boolean): SendMessagePayload {
  const elements: IgCard[] = hits.slice(0, 10).map(h => ({
    title: `${h.productName} · ${h.variantName}`.slice(0, 80),
    subtitle: BOT.promoCurta.slice(0, 80),
    ...(h.imageUrl ? { image_url: h.imageUrl } : {}),
    default_action: { type: 'web_url' as const, url: h.url },
    buttons: [
      { type: 'web_url' as const, url: h.url, title: 'Ver e comprar' },
      { type: 'postback' as const, payload: `BOT:VIDEOS:${h.productId}:${h.variantId}`, title: '🎥 Vídeos e fotos' },
      ...(h.oneUrl ? [{ type: 'web_url' as const, url: h.oneUrl, title: 'Só 1 por R$175' }] : []),
      ...(comOutrasCores ? [{ type: 'postback' as const, payload: `BOT:CORES:${h.productId}`, title: 'Outras cores' }] : []),
    ].slice(0, 3),
  }))
  return { attachment: { type: 'template', payload: { template_type: 'generic', elements } } }
}

const depoisDosCards = () => qr(BOT.depoisDosCards, [O.buscarOutro, O.promo, O.prazo, O.data, O.equipe])
const pausa = () => new Date(Date.now() + PAUSA_HUMANO_H * 3_600_000).toISOString()

// ── Ações ───────────────────────────────────────────────────────────────────

async function acaoBusca(texto: string): Promise<Reply> {
  const r = await searchCatalog(texto, 10)
  if (r.hits.length === 0) {
    return { messages: [qr(BOT.buscaVazia, [O.vendidos, O.cor, O.equipe])], meta: { step: 'busca', action: 'busca:vazia' } }
  }
  if (!r.model) return { messages: [{ text: BOT.buscaAchouCor }, cards(r.hits, true), depoisDosCards()], meta: { action: 'busca:cor' } }
  const top = r.hits[0]
  return {
    messages: [{ text: BOT.buscaAchouModelo(top.productName) }, cards(r.hits, true), ofereceVideos(top)],
    meta: { action: 'busca:modelo', productId: top.productId, variantId: top.variantId },
  }
}

/** Depois do carrossel de um modelo: pergunta se quer ver vídeos e foto no rosto. */
const ofereceVideos = (h: SearchHit) => qr(BOT.ofereceVideos(h.productName), [
  ['🎥 Vídeos e fotos', `BOT:VIDEOS:${h.productId}:${h.variantId}`],
  ['🎨 Outras cores', `BOT:CORES:${h.productId}`],
  O.promo, O.buscarOutro, O.equipe,
])

async function acaoVideos(productId: string, variantId?: string): Promise<Reply | null> {
  const m = await productMedia(productId, variantId)
  if (!m) return null
  const messages: SendMessagePayload[] = []
  if (m.videos.length) {
    messages.push({ text: BOT.videosIntro(m.name, m.videos.length) })
    for (const url of m.videos) messages.push({ attachment: { type: 'video', payload: { url } } })
  } else {
    messages.push({ text: BOT.semVideosIntro(m.name) })
    for (const url of m.photos) messages.push({ attachment: { type: 'image', payload: { url } } })
  }
  if (m.ugc) {
    messages.push({ text: BOT.ugcIntro(m.name) })
    messages.push({ attachment: { type: 'image', payload: { url: m.ugc } } })
  }
  messages.push(buttons(BOT.depoisDosVideos(m.name), [
    { type: 'web_url', url: m.url, title: 'Ver e comprar' },
    ...(m.oneUrl ? [{ type: 'web_url' as const, url: m.oneUrl, title: 'Só 1 por R$175' }] : []),
    { type: 'postback', payload: `BOT:CORES:${m.productId}`, title: 'Outras cores' },
  ]))
  return { messages, meta: { action: m.videos.length ? 'videos' : 'videos:fotos', productId: m.productId, variantId } }
}

async function acao(payload: string): Promise<Reply | null> {
  const [, nome, arg] = payload.split(':')
  switch (nome) {
    case 'VIDEOS':
      return arg ? acaoVideos(arg, payload.split(':')[3]) : { messages: [{ text: BOT.perguntaVideoModelo }], meta: { step: 'busca', action: 'videos:qual' } }
    case 'COMPREI':
      return { messages: [{ text: BOT.comprou }], meta: { action: 'checkin:comprou' } }
    case 'TRAVOU':
      return { messages: [{ text: BOT.travouPagamento }], meta: { pauseUntil: pausa(), action: 'checkin:travou' } }
    case 'MENU':
      return { messages: [menu(BOT.menuDeNovo)], meta: { action: 'menu' } }
    case 'BUSCAR':
      return { messages: [qr(BOT.perguntaModelo, CORES_QR)], meta: { step: 'busca', action: 'buscar' } }
    case 'CATALOGO':
      return {
        messages: [{ text: BOT.catalogo }, cards(await bestSellers(10), true), buttons(BOT.catalogoDepois, [
          { type: 'web_url', url: LINKS.catalogo, title: 'Ver catálogo completo' },
          { type: 'postback', payload: 'BOT:BUSCAR', title: 'Achar meu óculos' },
          { type: 'postback', payload: 'BOT:ESTILO', title: 'Escolher por cor' },
        ])],
        meta: { action: 'catalogo' },
      }
    case 'MAIS_VENDIDOS':
      return { messages: [{ text: BOT.maisVendidos }, cards(await bestSellers(10), true), depoisDosCards()], meta: { action: 'mais_vendidos' } }
    case 'PROMO':
      return {
        messages: [buttons(BOT.promo, [
          { type: 'web_url', url: LINKS.promo, title: 'Ver a promoção' },
          { type: 'postback', payload: 'BOT:BUSCAR', title: 'Achar meu óculos' },
          { type: 'postback', payload: 'BOT:UM', title: 'Quero só 1' },
        ])],
        meta: { action: 'promo' },
      }
    case 'UM':
      return {
        messages: [buttons(BOT.soUm, [
          { type: 'postback', payload: 'BOT:BUSCAR', title: 'Achar meu óculos' },
          { type: 'postback', payload: 'BOT:MAIS_VENDIDOS', title: 'Mais vendidos' },
          { type: 'web_url', url: LINKS.umaUnidade, title: 'Ver modelos a R$175' },
        ])],
        meta: { step: 'busca', action: 'um' },
      }
    case 'ESTILO':
      return { messages: [qr(BOT.perguntaCor, CORES_QR)], meta: { action: 'estilo' } }
    case 'COR':
      return acaoBusca(arg ?? '')
    case 'CORES': {
      const hits = await productVariants(arg ?? '', 10)
      if (hits.length === 0) return { messages: [menu(BOT.menuDeNovo)], meta: { action: 'menu' } }
      return { messages: [{ text: BOT.outrasCores(hits[0].productName) }, cards(hits, false), ofereceVideos(hits[0])], meta: { action: 'outras_cores', productId: hits[0].productId, variantId: hits[0].variantId } }
    }
    case 'PEDIDO':
      return { messages: [{ text: BOT.pedidoPergunta }], meta: { step: 'email', action: 'pedido' } }
    case 'TROCA':
      if (arg) {
        return { messages: [{ text: BOT.trocaResposta(arg) }], meta: { pauseUntil: pausa(), action: `troca:${arg}` } }
      }
      return {
        messages: [qr(BOT.trocaPergunta, [
          ['📦 Veio errado', 'BOT:TROCA:errado'], ['💥 Defeito/quebrado', 'BOT:TROCA:defeito'],
          ['🔄 Quero trocar', 'BOT:TROCA:trocar'], ['↩️ Quero devolver', 'BOT:TROCA:devolver'], O.equipe,
        ])],
        meta: { action: 'troca' },
      }
    case 'DUVIDAS':
      return { messages: [qr('Qual é a sua dúvida? 👇', [...(Object.keys(FAQ) as FaqKey[]).map(k => [FAQ[k].botao, `BOT:FAQ:${k}`] as Opt), O.equipe])], meta: { action: 'duvidas' } }
    case 'FAQ': {
      const f = FAQ[arg as FaqKey]
      if (!f) return null
      const extra = arg === 'prazo' ? [O.data, O.buscar, O.equipe] : [O.buscar, O.duvidas, O.equipe]
      return { messages: [qr(f.resposta, extra)], meta: { action: `faq:${arg}` } }
    }
    case 'DATA':
      return { messages: [{ text: BOT.dataApertada }], meta: { pauseUntil: pausa(), action: 'data' } }
    case 'PARCERIA':
      return { messages: [{ text: BOT.parceria }], meta: { pauseUntil: pausa(), action: 'parceria' } }
    case 'HUMANO': {
      const texto = arg === 'urgente' ? BOT.humanoUrgente + (equipeOnline() ? '' : `\n\n${BOT.humanoForaHorario}`)
        : equipeOnline() ? BOT.humanoHorario : BOT.humanoForaHorario
      return { messages: [{ text: texto }], meta: { pauseUntil: pausa(), action: arg === 'urgente' ? 'humano:urgente' : 'humano' } }
    }
  }
  return null
}

async function acaoPedido(db: Db, texto: string): Promise<Reply> {
  const email = texto.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0]?.toLowerCase()
  const numero = !email ? texto.match(/\b\d{6,12}\b/)?.[0] : undefined
  if (!email && !numero) {
    return { messages: [qr(BOT.pedidoNaoEntendi, [O.equipe, O.menu])], meta: { step: 'email', action: 'pedido:sem_dado' } }
  }
  let q = db.from('orders').select('external_id, status, created_at').order('created_at', { ascending: false }).limit(5)
  q = email ? q.ilike('customer_snapshot->>email', email) : q.eq('external_id', numero!)
  const { data } = await q
  const pedido = (data ?? []).find(o => o.status !== 'cancelled') ?? data?.[0]
  if (!pedido) return { messages: [qr(BOT.pedidoNaoAchei, [O.equipe, O.menu])], meta: { action: 'pedido:nao_achou' } }
  const dias = Math.floor((Date.now() - new Date(pedido.created_at).getTime()) / 86_400_000)
  const passou = pedido.status === 'cancelled' || dias >= 5
  return {
    messages: [qr(BOT.pedidoStatus(pedido.external_id, pedido.status, pedido.created_at, dias), passou ? [O.menu] : [O.equipe, O.menu])],
    // pedido atrasado ou cancelado: a equipe assume a conversa
    meta: { action: `pedido:${passou ? 'equipe' : 'ok'}`, ...(passou ? { pauseUntil: pausa() } : {}) },
  }
}

// ── Entrada principal ───────────────────────────────────────────────────────

export async function handleIncoming(msg: Incoming): Promise<string> {
  const cfg = await getMenuConfig()
  if (!cfg.active) return 'inativo'
  const db = getAdminSupabase()

  const { data: contact } = await db.from('ig_contacts')
    .upsert({ ig_scoped_id: msg.igScopedId, updated_at: new Date().toISOString() }, { onConflict: 'ig_scoped_id' })
    .select('id').single()
  if (!contact) return 'sem_contato'
  const state = await getBotState(db, contact.id)
  const recente = (at: string | null, min: number) => !!at && Date.now() - new Date(at).getTime() < min * 60_000

  const send = async (r: Reply | null, tag: string): Promise<string> => {
    if (!r) return 'ignorado'
    await enqueueBot(db, { contactId: contact.id, igScopedId: msg.igScopedId, ...r })
    const mostrouOculos = /^(busca:(modelo|cor)|mais_vendidos|catalogo|outras_cores|videos(:fotos)?)$/.test(r.meta.action ?? '')
    if (mostrouOculos) {
      await enqueueBot(db, {
        contactId: contact.id, igScopedId: msg.igScopedId, delayMinutes: LEMBRETE_MIN,
        messages: [qr(BOT.lembrete, [O.promo, O.prazo, O.buscarOutro, O.equipe])],
        meta: { followup: true, action: 'lembrete' },
      })
    }
    return tag
  }

  // Toque em botão: é o cliente pedindo o assistente, mesmo se estava pausado.
  if (msg.payload?.startsWith('BOT:')) return send(await acao(msg.payload), msg.payload)

  if (state.pausedUntil) return 'pausado'

  const texto = (msg.text ?? '').trim()
  const novaConversa = !msg.previousMessageAt
    || Date.now() - new Date(msg.previousMessageAt).getTime() >= cfg.silenceHours * 3_600_000
  const abrir = (text: string, action: string) => recente(state.lastMenuAt, MENU_COMPLETO_H * 60)
    ? send({ messages: [qr(BOT.oiDeNovo, [O.buscar, O.promo, O.pedido, O.equipe])], meta: { action: 'menu:curto' } }, 'menu:curto')
    : send({ messages: [menu(text)], meta: { action } }, action)

  // Foto, print, áudio ou reação sem texto: metade dos clientes chega assim.
  if (!texto) {
    if (!novaConversa) return 'sem_texto'
    // Metade chega com foto/print: além de avisar que a equipe identifica, já
    // mostra os mais vendidos (o modelo da foto costuma estar entre eles).
    return send({
      messages: [{ text: BOT.boasVindasFoto }, cards(await bestSellers(10), true), qr(BOT.depoisDaFoto, [O.buscar, O.cor, O.promo, O.equipe])],
      meta: { step: 'busca', action: 'menu:foto' },
    }, 'menu:foto')
  }

  // Resposta à pergunta que o assistente acabou de fazer.
  if (state.step === 'email' && recente(state.stepAt, ESPERA_RESPOSTA_MIN)) return send(await acaoPedido(db, texto), 'pedido')

  // "sim" / "por favor" responde a pergunta anterior: depois de "quer que a
  // equipe confira?" é pedido de atendimento; no resto (inclusive a resposta
  // automática da Meta "Quer conhecer o catálogo?"), é pedido de catálogo.
  const intent = detectIntent(texto) ?? (isAceite(texto)
    ? (/^pedido:(nao_achou|sem_dado)$/.test(state.lastAction ?? '') ? 'BOT:HUMANO' : 'BOT:CATALOGO')
    : null)
  if (!intent && isAgradecimento(texto)) return 'agradecimento'

  // "tem vídeo da radar?": vídeo do modelo citado; sem modelo no texto, do último mostrado.
  if (intent === 'BOT:VIDEOS') {
    const busca = await searchCatalog(texto, 1)
    const alvo = busca.model && busca.hits[0] ? `${busca.hits[0].productId}:${busca.hits[0].variantId}`
      : state.lastProductId ? `${state.lastProductId}:${state.lastVariantId ?? ''}` : ''
    const r = await acao(`BOT:VIDEOS${alvo ? `:${alvo}` : ''}`)
    if (r && novaConversa) r.messages.unshift({ text: BOT.saudacaoCurta })
    return send(r, 'videos')
  }
  // Pós-venda e urgência vêm antes de tudo ("comprei a juliet e não chegou").
  const posVenda = intent && /^BOT:(HUMANO|TROCA|PEDIDO)/.test(intent)

  if (!posVenda && (state.step === 'busca' && recente(state.stepAt, ESPERA_RESPOSTA_MIN))) return send(await acaoBusca(texto), 'busca')

  // Nome de modelo no texto ("tem a juliet espelhada?") → mostra direto.
  if (!posVenda && norm(texto).split(' ').length <= 15) {
    const busca = await searchCatalog(texto, 10)
    if (busca.model && busca.hits.length > 0) {
      const r = await acaoBusca(texto)
      if (novaConversa) r.messages.unshift({ text: BOT.saudacaoCurta })
      return send(r, 'busca_direta')
    }
  }

  if (intent) {
    const r = await acao(intent)
    if (!r) return 'ignorado'
    // Mesma resposta de novo, logo em seguida: o assistente não ajudou, deixa pra equipe.
    if (!novaConversa && state.lastAction === r.meta.action && recente(state.stepAt, NAO_REPETIR_MIN)) return 'repetido'
    if (novaConversa) r.messages.unshift({ text: BOT.saudacaoCurta })
    return send(r, intent)
  }

  if (novaConversa) return abrir(msg.isStoryReply ? BOT.boasVindasStory : BOT.boasVindas, msg.isStoryReply ? 'menu:story' : 'menu')
  return 'conversa_em_andamento'
}

/**
 * Eco de mensagem enviada pela loja. Se não é texto do próprio assistente, foi
 * a equipe respondendo pelo app: o assistente sai daquela conversa.
 */
export async function handleEcho(recipientIgId: string, text: string | undefined): Promise<string> {
  if (!text) return 'eco_sem_texto'
  const db = getAdminSupabase()
  const { data: contact } = await db.from('ig_contacts').select('id, last_user_response_at').eq('ig_scoped_id', recipientIgId).maybeSingle()
  if (!contact) return 'eco_sem_contato'
  const textos = await recentBotTexts(db, contact.id)
  if (textos.some(t => t.trim() === text.trim())) return 'eco_do_bot'
  // Resposta automática da própria Meta (perguntas frequentes / boas-vindas do
  // Instagram) sai segundos depois da mensagem do cliente; pessoa da equipe não
  // digita tão rápido. Achado real em 10/10/2026: a resposta automática "Quer
  // conhecer o catálogo?" era lida como a equipe assumindo, e o "Por favor" do
  // cliente ficava sem resposta.
  if (contact.last_user_response_at && Date.now() - new Date(contact.last_user_response_at).getTime() < 20_000) return 'eco_automatico_meta'
  await setBotState(db, contact.id, { pauseUntil: new Date(Date.now() + PAUSA_EQUIPE_H * 3_600_000).toISOString(), action: 'equipe_respondeu' })
  return 'equipe_respondeu'
}
