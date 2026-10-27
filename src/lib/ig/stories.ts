import { getAdminSupabase } from '@/lib/admin-client'
import { getIgConfig } from '@/lib/ig/config'

// Stories agendados do Instagram.
//
// Porte da JHF (26/10/2026). Na JR a mídia fica no Supabase Storage (bucket
// público products/stories/), não no R2; o cron roda pelo pg_cron do Supabase
// (job jr-ig-stories), porque o plano Hobby da Vercel só agenda 1×/dia.
//
// Fluxo: Claude monta a agenda a partir da pasta do Drive (mídia já adaptada
// para 9:16 e hospedada no Storage) → o dono aprova no admin → o cron
// /api/cron/ig-stories publica no horário pela API de publicação do Instagram
// e, nas 24h em que o story fica no ar, puxa alcance, respostas e navegação.
//
// Só story APROVADO é publicado. A API não aceita figurinhas (link, enquete,
// música); texto tem que vir na própria arte. A chamada para ação é responder
// o story — a resposta cai no assistente da DM.
//
// Agenda em settings.ig_stories (JSON, sem migração). Volume baixo (poucos
// stories por dia), cabe com folga.

export const STORIES_KEY = 'ig_stories'
const GRAPH = 'https://graph.instagram.com/v25.0'

export type StoryTema = 'produto' | 'video_rosto' | 'promo' | 'prova_social' | 'bastidor' | 'cta'
export type StoryStatus = 'rascunho' | 'aprovado' | 'publicando' | 'publicado' | 'erro' | 'cancelado'

export interface StoryMetricas {
  alcance: number | null
  views: number | null
  respostas: number | null
  compartilhamentos: number | null
  interacoes: number | null
  avancou: number | null      // toque para o próximo story
  voltou: number | null       // toque para o anterior
  saiu: number | null         // saiu dos stories
  pulou: number | null        // arrastou para o próximo perfil
  /** respostas que chegaram ao assistente da DM (contadas pelo webhook) */
  respostasDm?: number
  atualizadoEm: string
}

export interface Story {
  id: string
  mediaUrl: string
  /** Capa só pra prévia do admin (26/10/2026): vídeo publicado direto do Drive não toca embutido no navegador. */
  capaUrl?: string | null
  tipo: 'imagem' | 'video'
  agendadoPara: string
  tema: StoryTema
  modelo?: string | null
  /** O que a arte pede para o cliente fazer (ex.: "responde 🔥"), para relatório. */
  cta?: string | null
  nota?: string | null
  status: StoryStatus
  containerId?: string | null
  igMediaId?: string | null
  publicadoEm?: string | null
  erro?: string | null
  metricas?: StoryMetricas | null
  criadoEm: string
}

type Db = ReturnType<typeof getAdminSupabase>

export async function getStories(db: Db = getAdminSupabase()): Promise<Story[]> {
  const { data } = await db.from('settings').select('value').eq('key', STORIES_KEY).maybeSingle()
  if (!data?.value) return []
  try { return (JSON.parse(data.value) as { itens?: Story[] }).itens ?? [] } catch { return [] }
}

export async function saveStories(itens: Story[], db: Db = getAdminSupabase()): Promise<void> {
  const ordenados = [...itens].sort((a, b) => a.agendadoPara.localeCompare(b.agendadoPara))
  const { error } = await db.from('settings')
    .upsert({ key: STORIES_KEY, value: JSON.stringify({ itens: ordenados }), updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw new Error(error.message)
}

/** Lê, altera e grava a agenda numa tacada (o cron e o admin mexem na mesma chave). */
export async function updateStories(fn: (itens: Story[]) => Story[] | void): Promise<Story[]> {
  const db = getAdminSupabase()
  const itens = await getStories(db)
  const novo = fn(itens) ?? itens
  await saveStories(novo, db)
  return novo
}

async function ig(path: string, init?: RequestInit & { params?: Record<string, string> }) {
  const { accessToken } = await getIgConfig()
  const qs = new URLSearchParams({ ...(init?.params ?? {}), access_token: accessToken })
  const res = await fetch(`${GRAPH}/${path}?${qs}`, init)
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `HTTP ${res.status}`)
  return json
}

/**
 * Publica (ou continua publicando) um story. Imagem sai na hora; vídeo precisa
 * que o Instagram termine de processar o container — se ainda não terminou,
 * volta 'publicando' e o próximo ciclo do cron tenta de novo.
 */
export async function publicarStory(s: Story): Promise<Story> {
  const { igUserId } = await getIgConfig()
  let containerId = s.containerId
  if (!containerId) {
    const c = await ig(`${igUserId}/media`, {
      method: 'POST',
      params: { media_type: 'STORIES', ...(s.tipo === 'video' ? { video_url: s.mediaUrl } : { image_url: s.mediaUrl }) },
    })
    containerId = c.id as string
  }
  // Imagem também passa por processamento: publicar logo depois de criar o
  // container dava "Media ID is not available" (1º teste, 24/10/2026). Espera
  // alguns segundos; se ainda não terminou, a próxima rodada do cron publica.
  for (let tentativa = 0; ; tentativa++) {
    const st = await ig(containerId, { params: { fields: 'status_code,status' } })
    if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error(`mídia recusada pelo Instagram: ${st.status ?? st.status_code}`)
    if (st.status_code === 'FINISHED') break
    if (s.tipo === 'video' || tentativa >= 5) return { ...s, status: 'publicando', containerId }
    await new Promise(r => setTimeout(r, 3000))
  }
  const pub = await ig(`${igUserId}/media_publish`, { method: 'POST', params: { creation_id: containerId } })
  return { ...s, status: 'publicado', containerId, igMediaId: pub.id as string, publicadoEm: new Date().toISOString(), erro: null }
}

/** Métricas de um story publicado (só existem enquanto ele está no ar, ~24h). */
export async function metricasStory(igMediaId: string): Promise<Omit<StoryMetricas, 'respostasDm' | 'atualizadoEm'>> {
  const valor = (arr: { name: string; values?: { value: number }[]; total_value?: { value: number } }[], nome: string) => {
    const m = arr.find(x => x.name === nome)
    return m ? (m.total_value?.value ?? m.values?.[0]?.value ?? null) : null
  }
  const geral = await ig(`${igMediaId}/insights`, { params: { metric: 'reach,views,replies,shares,total_interactions' } })
    .catch(() => ({ data: [] }))
  const nav = await ig(`${igMediaId}/insights`, { params: { metric: 'navigation', breakdown: 'story_navigation_action_type' } })
    .catch(() => ({ data: [] }))
  const quebras: Record<string, number> = {}
  // a API devolve em minúsculas ("tap_back"); normaliza para as chaves abaixo
  for (const r of nav.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? []) quebras[String(r.dimension_values?.[0] ?? '').toUpperCase()] = r.value
  return {
    alcance: valor(geral.data ?? [], 'reach'),
    views: valor(geral.data ?? [], 'views'),
    respostas: valor(geral.data ?? [], 'replies'),
    compartilhamentos: valor(geral.data ?? [], 'shares'),
    interacoes: valor(geral.data ?? [], 'total_interactions'),
    avancou: quebras.TAP_FORWARD ?? null,
    voltou: quebras.TAP_BACK ?? null,
    saiu: quebras.TAP_EXIT ?? null,
    pulou: quebras.SWIPE_FORWARD ?? null,
  }
}

/** Respostas ao story que chegaram à DM (o webhook guarda o id do story respondido). */
export async function respostasNaDm(igMediaIds: string[]): Promise<Record<string, number>> {
  if (!igMediaIds.length) return {}
  const db = getAdminSupabase()
  const desde = new Date(Date.now() - 3 * 86_400_000).toISOString()
  const { data } = await db.from('ig_events').select('raw_payload').eq('event_type', 'message').gte('created_at', desde).limit(5000)
  const n: Record<string, number> = {}
  for (const e of data ?? []) {
    for (const en of (e.raw_payload as { entry?: { messaging?: { message?: { is_echo?: boolean; reply_to?: { story?: { id?: string } } } }[] }[] }).entry ?? []) {
      for (const m of en.messaging ?? []) {
        const id = m.message?.reply_to?.story?.id
        if (id && !m.message?.is_echo && igMediaIds.includes(id)) n[id] = (n[id] ?? 0) + 1
      }
    }
  }
  return n
}

/** Ciclo do cron: publica o que venceu e atualiza métricas dos que estão no ar. */
export async function rodarStories(): Promise<{ publicados: number; aguardandoVideo: number; erros: number; metricas: number }> {
  const agora = Date.now()
  const itens = await getStories()
  let publicados = 0, aguardandoVideo = 0, erros = 0, metricas = 0
  const mudou = new Set<string>()

  for (let i = 0; i < itens.length; i++) {
    const s = itens[i]
    const venceu = new Date(s.agendadoPara).getTime() <= agora
    if (!(venceu && (s.status === 'aprovado' || s.status === 'publicando'))) continue
    // Agendado há mais de 3h e ainda não saiu: não publica atrasado sem ninguém ver.
    if (s.status === 'aprovado' && agora - new Date(s.agendadoPara).getTime() > 3 * 3_600_000) {
      itens[i] = { ...s, status: 'erro', erro: 'passou mais de 3h do horário sem publicar; reagende' }
      erros++
      mudou.add(s.id)
      continue
    }
    mudou.add(s.id)
    try {
      itens[i] = await publicarStory(s)
      if (itens[i].status === 'publicado') publicados++
      else aguardandoVideo++
    } catch (err) {
      itens[i] = { ...s, status: 'erro', erro: err instanceof Error ? err.message : String(err) }
      erros++
    }
  }

  // Métricas: stories no ar (até 24h), no máximo a cada 30 min.
  const noAr = itens.filter(s => s.status === 'publicado' && s.igMediaId && s.publicadoEm
    && agora - new Date(s.publicadoEm).getTime() < 24 * 3_600_000
    && (!s.metricas || agora - new Date(s.metricas.atualizadoEm).getTime() > 30 * 60_000))
  const dm = await respostasNaDm(noAr.map(s => s.igMediaId!))
  for (const s of noAr) {
    try {
      const m = await metricasStory(s.igMediaId!)
      const idx = itens.findIndex(x => x.id === s.id)
      itens[idx] = { ...itens[idx], metricas: { ...m, respostasDm: dm[s.igMediaId!] ?? 0, atualizadoEm: new Date().toISOString() } }
      mudou.add(s.id)
      metricas++
    } catch { /* métrica é melhor esforço; tenta no próximo ciclo */ }
  }

  if (mudou.size) {
    // Só troca o que o cron mexeu, por cima da versão atual: o dono pode ter
    // editado outro story enquanto o cron rodava.
    await updateStories(atual => atual.map(a => (mudou.has(a.id) ? itens.find(x => x.id === a.id) ?? a : a)))
  }
  return { publicados, aguardandoVideo, erros, metricas }
}

/** Resumo para a estratégia: o que funcionou nos stories já publicados. */
export function resumoStories(itens: Story[]) {
  const pub = itens.filter(s => s.status === 'publicado' && s.metricas?.alcance)
  const taxa = (s: Story) => (s.metricas!.respostas ?? 0) / Math.max(1, s.metricas!.alcance ?? 1)
  const saida = (s: Story) => ((s.metricas!.saiu ?? 0) + (s.metricas!.pulou ?? 0)) / Math.max(1, s.metricas!.alcance ?? 1)
  const agrupar = (chave: (s: Story) => string) => {
    const g = new Map<string, Story[]>()
    for (const s of pub) g.set(chave(s), [...(g.get(chave(s)) ?? []), s])
    return [...g.entries()].map(([k, l]) => ({
      chave: k, n: l.length,
      alcanceMedio: Math.round(l.reduce((t, s) => t + (s.metricas!.alcance ?? 0), 0) / l.length),
      taxaResposta: l.reduce((t, s) => t + taxa(s), 0) / l.length,
      taxaSaida: l.reduce((t, s) => t + saida(s), 0) / l.length,
    })).sort((a, b) => b.taxaResposta - a.taxaResposta || b.alcanceMedio - a.alcanceMedio)
  }
  const hora = (s: Story) => `${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(s.publicadoEm ?? s.agendadoPara))}h`
  return {
    publicados: pub.length,
    alcanceMedio: pub.length ? Math.round(pub.reduce((t, s) => t + (s.metricas!.alcance ?? 0), 0) / pub.length) : 0,
    respostas: pub.reduce((t, s) => t + (s.metricas!.respostas ?? 0), 0),
    porTema: agrupar(s => s.tema),
    porHorario: agrupar(hora),
  }
}
