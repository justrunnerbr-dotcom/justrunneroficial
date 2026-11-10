import { getAdminSupabase } from '@/lib/admin-client'
import { getIgConfig } from '@/lib/ig/config'

// Fila de publicação do feed/Reels do Instagram.
//
// Porte da JHF (10/11/2026), só a parte de fila + publicação + números dos
// reels (a análise do perfil e a estratégia com IA da JHF ficaram de fora).
// Agenda em settings.ig_feed_fila (JSON, sem migração), igual aos stories.
// Quem publica: /api/cron/ig-stories chama rodarFeed() a cada 5 min (pg_cron
// jr-ig-stories; plano Hobby da Vercel só agenda 1×/dia) e /api/cron/ig-feed
// roda o mesmo ciclo sob demanda.
//
// Vídeo pode vir direto do Drive (drive.usercontent.google.com/download?…),
// como nos stories: o Instagram baixa de lá e não ocupa o Supabase.
// Só item APROVADO é publicado. A API não apaga nem arquiva post.

export const FEED_FILA_KEY = 'ig_feed_fila'
const GRAPH = 'https://graph.instagram.com/v25.0'

export type Formato = 'reels' | 'carrossel' | 'foto'

/** Números de um reel publicado (insights da API, atualizados pelo cron por 7 dias). */
export interface ReelMetricas {
  alcance: number | null
  views: number | null
  curtidas: number | null
  comentarios: number | null
  salvos: number | null
  compartilhamentos: number | null
  interacoes: number | null
  /** tempo médio assistido, em segundos */
  tempoMedio: number | null
  atualizadoEm: string
}

export type RepostStatus = 'rascunho' | 'aprovado' | 'publicando' | 'publicado' | 'erro' | 'cancelado'

export interface ItemFila {
  id: string
  /** post original (repost); null = post novo */
  origemId: string | null
  origemPermalink: string | null
  /** post novo: links das mídias (1 = foto/reels, 2+ = carrossel) */
  midias: string[]
  formato: Formato
  thumb: string | null
  legenda: string
  /** reels que não aparece no grid do perfil, só na aba Reels (share_to_feed=false) */
  soReels?: boolean
  /** de onde veio a mídia (ex.: id do arquivo no Drive), para não repetir */
  fonte?: string | null
  agendadoPara: string
  status: RepostStatus
  filhos?: string[] | null
  containerId?: string | null
  igMediaId?: string | null
  publicadoEm?: string | null
  erro?: string | null
  metricas?: ReelMetricas | null
  /** link do post publicado */
  permalink?: string | null
  criadoEm: string
}

type Db = ReturnType<typeof getAdminSupabase>

async function lerJson<T>(key: string, vazio: T, db: Db = getAdminSupabase()): Promise<T> {
  const { data } = await db.from('settings').select('value').eq('key', key).maybeSingle()
  if (!data?.value) return vazio
  try { return JSON.parse(data.value) as T } catch { return vazio }
}

async function gravarJson(key: string, valor: unknown, db: Db = getAdminSupabase()): Promise<void> {
  const { error } = await db.from('settings')
    .upsert({ key, value: JSON.stringify(valor), updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw new Error(error.message)
}

async function ig(path: string, init?: RequestInit & { params?: Record<string, string> }) {
  const { accessToken } = await getIgConfig()
  const qs = new URLSearchParams({ ...(init?.params ?? {}), access_token: accessToken })
  const res = await fetch(`${GRAPH}/${path}?${qs}`, init)
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `HTTP ${res.status}`)
  return json
}

// ── Fila ───────────────────────────────────────────────────────────────────

export async function getFila(db: Db = getAdminSupabase()): Promise<ItemFila[]> {
  return (await lerJson<{ itens?: ItemFila[] }>(FEED_FILA_KEY, {}, db)).itens ?? []
}

/** Lê, altera e grava a fila numa tacada (o cron e o admin mexem na mesma chave). */
export async function updateFila(fn: (itens: ItemFila[]) => ItemFila[] | void): Promise<ItemFila[]> {
  const db = getAdminSupabase()
  const itens = await getFila(db)
  const novo = (fn(itens) ?? itens).sort((a, b) => a.agendadoPara.localeCompare(b.agendadoPara))
  await gravarJson(FEED_FILA_KEY, { itens: novo }, db)
  return novo
}

// ── Publicação ─────────────────────────────────────────────────────────────

type Midia = { tipo: 'imagem' | 'video'; url: string }

/** Mídia do post original com link fresco (o do CDN expira em alguns dias). */
async function midiasDoOriginal(id: string): Promise<Midia[]> {
  const m = await ig(id, { params: { fields: 'media_type,media_url,children{media_type,media_url}' } })
  const conv = (x: { media_type: string; media_url?: string }): Midia | null =>
    x.media_url ? { tipo: x.media_type === 'VIDEO' ? 'video' : 'imagem', url: x.media_url } : null
  const lista = m.media_type === 'CAROUSEL_ALBUM' ? (m.children?.data ?? []).map(conv) : [conv(m)]
  const ok = lista.filter(Boolean) as Midia[]
  if (!ok.length) throw new Error('o Instagram não devolveu a mídia do post original (pode ter direitos de música ou ter sido apagado)')
  return ok
}

/** Link do Drive não tem extensão: em reels a mídia é sempre vídeo. */
const midiaDeUrl = (url: string, formato: Formato): Midia => ({
  tipo: formato === 'reels' || /\.(mp4|mov|m4v)(\?|$)/i.test(url) ? 'video' : 'imagem', url,
})

async function pronto(containerId: string): Promise<boolean> {
  const st = await ig(containerId, { params: { fields: 'status_code,status' } })
  if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error(`mídia recusada pelo Instagram: ${st.status ?? st.status_code}`)
  return st.status_code === 'FINISHED'
}

/**
 * Publica (ou continua publicando) um item da fila. Foto sai na hora; vídeo e
 * carrossel com vídeo esperam o Instagram processar — se não terminou, volta
 * 'publicando' e o próximo ciclo do cron continua de onde parou.
 */
export async function publicarItem(item: ItemFila): Promise<ItemFila> {
  const { igUserId } = await getIgConfig()
  let { containerId, filhos } = item
  if (!containerId) {
    if (!filhos?.length) {
      const midias = item.origemId ? await midiasDoOriginal(item.origemId) : item.midias.map(u => midiaDeUrl(u, item.formato))
      if (midias.length === 1) {
        const m = midias[0]
        const c = await ig(`${igUserId}/media`, {
          method: 'POST',
          params: m.tipo === 'video'
            ? { media_type: 'REELS', video_url: m.url, caption: item.legenda, share_to_feed: item.soReels ? 'false' : 'true' }
            : { image_url: m.url, caption: item.legenda },
        })
        containerId = c.id as string
      } else {
        filhos = []
        for (const m of midias.slice(0, 10)) {
          const c = await ig(`${igUserId}/media`, {
            method: 'POST',
            params: { is_carousel_item: 'true', ...(m.tipo === 'video' ? { media_type: 'VIDEO', video_url: m.url } : { image_url: m.url }) },
          })
          filhos.push(c.id as string)
        }
      }
    }
    if (!containerId && filhos?.length) {
      for (const f of filhos) if (!(await pronto(f))) return { ...item, status: 'publicando', filhos }
      const c = await ig(`${igUserId}/media`, {
        method: 'POST',
        params: { media_type: 'CAROUSEL', children: filhos.join(','), caption: item.legenda },
      })
      containerId = c.id as string
    }
  }
  if (!(await pronto(containerId!))) return { ...item, status: 'publicando', filhos, containerId }
  const pub = await ig(`${igUserId}/media_publish`, { method: 'POST', params: { creation_id: containerId! } })
  const link = await ig(pub.id as string, { params: { fields: 'permalink' } }).catch(() => ({ permalink: null }))
  return { ...item, status: 'publicado', filhos, containerId, igMediaId: pub.id as string, permalink: link.permalink ?? null, publicadoEm: new Date().toISOString(), erro: null }
}

/** Insights de um reel. O Instagram demora alguns minutos para liberar os números. */
export async function metricasReel(igMediaId: string): Promise<Omit<ReelMetricas, 'atualizadoEm'>> {
  const r = await ig(`${igMediaId}/insights`, {
    params: { metric: 'reach,views,likes,comments,saved,shares,total_interactions,ig_reels_avg_watch_time' },
  })
  const v = (nome: string): number | null => {
    const m = (r.data ?? []).find((x: { name: string }) => x.name === nome)
    const val = m ? (m.total_value?.value ?? m.values?.[0]?.value) : undefined
    return typeof val === 'number' ? val : null
  }
  const ms = v('ig_reels_avg_watch_time')
  return {
    alcance: v('reach'), views: v('views'), curtidas: v('likes'), comentarios: v('comments'),
    salvos: v('saved'), compartilhamentos: v('shares'), interacoes: v('total_interactions'),
    tempoMedio: ms === null ? null : Math.round(ms / 100) / 10,
  }
}

/** Ciclo do cron: publica o que venceu (no máximo 2 por ciclo) e atualiza os números dos reels. */
export async function rodarFeed(): Promise<{ publicados: number; aguardando: number; erros: number; metricas: number }> {
  const agora = Date.now()
  const itens = await getFila()
  let publicados = 0, aguardando = 0, erros = 0
  const mudou = new Set<string>()

  for (let i = 0; i < itens.length && publicados < 2; i++) {
    const it = itens[i]
    const venceu = new Date(it.agendadoPara).getTime() <= agora
    if (!(venceu && (it.status === 'aprovado' || it.status === 'publicando'))) continue
    mudou.add(it.id)
    // Agendado há mais de 3h e ainda não saiu: não publica atrasado sem ninguém ver.
    if (it.status === 'aprovado' && agora - new Date(it.agendadoPara).getTime() > 3 * 3_600_000) {
      itens[i] = { ...it, status: 'erro', erro: 'passou mais de 3h do horário sem publicar; reagende' }
      erros++
      continue
    }
    try {
      itens[i] = await publicarItem(it)
      if (itens[i].status === 'publicado') publicados++
      else aguardando++
    } catch (err) {
      itens[i] = { ...it, status: 'erro', erro: err instanceof Error ? err.message : String(err) }
      erros++
    }
  }

  // Números dos reels: 7 dias depois de publicado, no máximo a cada 1h, até 10 por ciclo.
  let metricas = 0
  const atualizar = itens.filter(it => it.formato === 'reels' && it.status === 'publicado' && it.igMediaId && it.publicadoEm
    && agora - new Date(it.publicadoEm).getTime() < 7 * 86_400_000
    && (!it.metricas || agora - new Date(it.metricas.atualizadoEm).getTime() > 3_600_000)).slice(0, 10)
  for (const it of atualizar) {
    try {
      const m = await metricasReel(it.igMediaId!)
      const idx = itens.findIndex(x => x.id === it.id)
      itens[idx] = { ...itens[idx], metricas: { ...m, atualizadoEm: new Date().toISOString() } }
      mudou.add(it.id)
      metricas++
    } catch { /* métrica é melhor esforço; tenta no próximo ciclo */ }
  }

  if (mudou.size) {
    // Só troca o que o cron mexeu, por cima da versão atual: o dono pode ter
    // editado outro item enquanto o cron rodava.
    await updateFila(atual => atual.map(a => (mudou.has(a.id) ? itens.find(x => x.id === a.id) ?? a : a)))
  }
  return { publicados, aguardando, erros, metricas }
}
