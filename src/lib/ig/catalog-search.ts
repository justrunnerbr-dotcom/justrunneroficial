import { getAdminSupabase } from '@/lib/admin-client'
import { resolveVariantImages } from '@/lib/product-image'
import type { Image as ProductImage, Variant } from '@/lib/types'
import { getProductionVideos } from '@/data/production-videos'
import { BEST_SELLER_SLUGS } from '@/lib/best-sellers'

// Busca aproximada de óculos para a DM: o cliente escreve do jeito dele
// ("juliete espelhada", "aquele minute marrom", "eyejaket roxo") e devolvemos
// as variações do catálogo mais próximas.
//
// Duas partes do texto contam separado:
// - MODELO: comparado com o nome do produto (com tolerância a erro de digitação
//   e aos apelidos de ALIASES);
// - COR/LENTE: comparada com o nome da variação, via sinônimos de CORES
//   ("espelhado" acha "Espelhada", "dourado" acha "Gold"/"24K").
//
// Just Runner (porte de 26/10/2026): aqui cada PRODUTO é uma cor de armação
// ("Radar EV Preta") e as variações são as lentes ("Lente Ruby"). O modelo
// ("Radar EV") sai do começo do nome (MODELOS) e a cor da armação vai junto
// com o nome da lente na hora de comparar cor ("Preta Lente Ruby"), no mesmo
// formato que a JHF usa no nome da variação.

const SITE = 'https://justrunner.com.br'

// Do mais longo pro mais curto: o primeiro que bate no começo do nome é o modelo.
const MODELOS = ['Radar EV Thieves', 'Radar EV', 'Radar', 'Eye Jacket Redux', 'Eye Jacket Flame', 'Eye Jacket Brain Dead',
  'Eye Jacket', 'Plantaris Squared', 'Plantaris', 'Straight Jacket', 'Half Jacket', 'Monster Dog', 'M Frame', 'Minute',
  'Flak', 'HSTN', 'Encoder', '13.11', 'Ellipse', 'Holbrook', 'Soto', 'Sphaera', 'Sutro', 'Dartboard']

export interface SearchHit {
  productId: string
  productName: string
  productSlug: string
  variantId: string
  variantName: string
  price: number
  comparePrice: number | null
  imageUrl: string | null
  url: string
  /** Mesma cor no catálogo da Oferta Progressiva (1 unidade a R$175), se existir. */
  oneUrl: string | null
  score: number
}

export interface SearchResult {
  /** Modelo reconhecido no texto (null = buscou só por cor/estilo). */
  model: string | null
  hits: SearchHit[]
}

interface CatalogProduct {
  id: string
  name: string
  slug: string
  /** Modelo sem a cor da armação ("Radar EV"). */
  model: string
  /** Cor da armação que vem no nome do produto ("Preta"); vazio quando a cor está na variação. */
  frame: string
  /** Slug da coleção (chave dos vídeos de produção). */
  collectionSlug: string
  keys: string[]          // formas normalizadas do nome do modelo
  variants: Variant[]
  images: ProductImage[]
}

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9.+ ]+/g, ' ').replace(/\s+/g, ' ').trim()

// Apelidos e grafias que os clientes usam → nome do produto no catálogo.
export const ALIASES: Record<string, string> = {
  'radarev': 'Radar EV', 'radar ev': 'Radar EV', 'thieves': 'Radar EV Thieves',
  'minut': 'Minute', 'minuto': 'Minute',
  'eyejacket': 'Eye Jacket', 'eye jaket': 'Eye Jacket', 'eyejaket': 'Eye Jacket', 'ej': 'Eye Jacket', 'redux': 'Eye Jacket Redux',
  'flak 2': 'Flak', 'flak 2.0': 'Flak', 'flak2': 'Flak', 'flack': 'Flak', 'flek': 'Flak',
  'plantares': 'Plantaris', 'plantaris quadrado': 'Plantaris Squared', 'squared': 'Plantaris Squared',
  'monsterdog': 'Monster Dog', 'monster': 'Monster Dog',
  'halfjacket': 'Half Jacket', 'half': 'Half Jacket', 'straightjacket': 'Straight Jacket', 'straight': 'Straight Jacket',
  'mframe': 'M Frame', 'houston': 'HSTN', 'dart board': 'Dartboard', '1311': '13.11', '13 11': '13.11',
}

// Grupos de sinônimos de cor/lente. A chave é só um rótulo; vale a lista.
export const CORES: Record<string, string[]> = {
  preto: ['preto', 'preta', 'black', 'all black', 'pretinho', 'escuro', 'escura', 'fosco', 'matte', 'fume', 'smoke'],
  espelhado: ['espelhado', 'espelhada', 'espelho', 'mirror', 'refletivo', 'prizm'],
  dourado: ['dourado', 'dourada', 'gold', 'ouro', '24k', 'amarelo', 'amarela'],
  azul: ['azul', 'blue', 'sapphire', 'safira', 'tanzanite', 'ice', 'gelo'],
  vermelho: ['vermelho', 'vermelha', 'ruby', 'rubi', 'red', 'torch', 'fogo'],
  roxo: ['roxo', 'roxa', 'violet', 'violeta', 'lilas', 'purple', 'plasma'],
  marrom: ['marrom', 'cafe', 'coffee', 'brown', 'vr28', 'bronze', 'cooper', 'copper', 'cobre', 'bege', 'caramelo'],
  transparente: ['transparente', 'cristal', 'clear', 'transparent', 'incolor'],
  branco: ['branco', 'branca', 'white', 'bone', 'gelo'],
  prata: ['prata', 'silver', 'xmetal', 'x metal', 'metal', 'cromado', 'titanium', 'cinza', 'grafite'],
  rosa: ['rosa', 'pink', 'rose'],
  verde: ['verde', 'green', 'emerald', 'camuflado'],
  laranja: ['laranja', 'orange'],
  degrade: ['degrade', 'gradiente'],
  carbon: ['carbon', 'carbono', 'fibra'],
  piet: ['piet', 'mondrian'],
  neon: ['neon', 'fluor', 'fluorescente'],
}

const STOP = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'da', 'do', 'com', 'lente', 'lentes', 'oculos', 'oculo',
  'quero', 'queria', 'tem', 'tenho', 'vcs', 'voces', 'esse', 'essa', 'aquele', 'aquela', 'modelo', 'cor', 'e', 'em',
  'pra', 'para', 'me', 'manda', 'mandar', 'ver', 'qual', 'quais', 'oi', 'ola', 'bom', 'dia', 'tarde', 'noite', 'por',
  'favor', 'ai', 'ae', 'mano', 'irmao', 'sim', 'na', 'no', 'que', 'tipo', 'estilo', 'oakley', 'original', 'haste', 'aro'])

/** Similaridade 0–1 entre duas palavras (Levenshtein normalizado). */
export function sim(a: string, b: string): number {
  if (a === b) return 1
  if (!a || !b) return 0
  const m = a.length, n = b.length
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return 1 - prev[n] / Math.max(m, n)
}

let cache: { at: number; products: CatalogProduct[]; rank: Record<string, string[]>; op: Map<string, string> } | null = null

function separaModelo(nome: string): { model: string; frame: string } {
  const m = MODELOS.find(x => norm(nome) === norm(x) || norm(nome).startsWith(norm(x) + ' '))
  if (!m) return { model: nome, frame: '' }
  return { model: m, frame: nome.split(' ').slice(m.split(' ').length).join(' ') }
}

async function catalog() {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache
  const db = getAdminSupabase()
  const [{ data: cols }, { data: prods }] = await Promise.all([
    db.from('collections').select('id, slug'),
    db.from('products').select('id, name, slug, collection_id, variants(*), images(*)').eq('status', 'active'),
  ])
  const slugCol = new Map((cols ?? []).map(c => [c.id as string, c.slug as string]))
  // Fora da busca: gêmeos da Oferta Progressiva (-op, mesmo óculos), combos e o case.
  const fora = new Set(['oferta-progressiva', 'oferta-exclusiva', 'combos'])
  const products: CatalogProduct[] = ((prods ?? []) as (Omit<CatalogProduct, 'model' | 'frame' | 'collectionSlug' | 'keys'> & { collection_id: string })[])
    .filter(p => !fora.has(slugCol.get(p.collection_id) ?? '') && !/-o[pe]$/.test(p.slug) && !/case/i.test(p.name))
    .map(p => {
      const { model, frame } = separaModelo(p.name)
      const n = norm(model)
      const primeira = n.split(' ')[0]
      // "radar" sozinho acha Radar EV e Radar EV Thieves; "eye" (curta demais) não.
      const keys = [n, n.replace(/ /g, ''), ...(primeira.length >= 5 ? [primeira] : [])]
      return { ...p, model, frame, collectionSlug: slugCol.get(p.collection_id) ?? '', keys: [...new Set(keys)] }
    })
  // Ranking das cores de cada modelo: a JR não tem o ranking por variação da
  // JHF (settings.c1l2_variant_rank); as lentes seguem a ordem do cadastro.
  cache = { at: Date.now(), products, rank: {}, op: new Map() }
  return cache
}

/** Nome usado para comparar cor: armação + lente ("Preta Lente Ruby"). */
const nomeCor = (p: CatalogProduct, v: Variant) => `${p.frame} ${v.name.replace(' · ', ' ')}`.trim()

function modelScore(text: string, tokens: string[], p: CatalogProduct): { score: number; used: Set<number> } {
  let best = 0, used = new Set<number>()
  // janelas de 1 a 3 palavras do texto contra o nome do modelo
  for (let size = 1; size <= 3; size++) {
    for (let i = 0; i + size <= tokens.length; i++) {
      const win = tokens.slice(i, i + size)
      for (const variant of [win.join(' '), win.join('')]) {
        for (const k of p.keys) {
          const s = sim(variant, k)
          // palavra curta só vale se for exata (evita "dart" casar com "dark")
          const ok = k.length <= 4 && s < 1 ? 0 : s
          if (ok > best) { best = ok; used = new Set(win.map((_, j) => i + j)) }
        }
      }
    }
  }
  // apelidos
  for (const [alias, name] of Object.entries(ALIASES)) {
    if (name !== p.model) continue
    const a = norm(alias)
    if (` ${text} `.includes(` ${a} `) || text.replace(/ /g, '').includes(a.replace(/ /g, ''))) {
      if (0.97 > best) {
        best = 0.97
        used = new Set(tokens.map((t, i) => (a.split(' ').some(w => sim(w, t) > 0.8) ? i : -1)).filter(i => i >= 0))
      }
    }
  }
  return { score: best, used }
}

function colorGroups(words: string[]): string[] {
  const groups: string[] = []
  for (const w of words) {
    for (const [g, syn] of Object.entries(CORES)) {
      // palavra curta só vale exata ("preco" não pode virar "preto")
      if (syn.some(s => (Math.min(s.length, w.length) <= 5 ? s === w : sim(s, w) >= 0.8)) && !groups.includes(g)) groups.push(g)
    }
  }
  return groups
}

/**
 * Cores pedidas, separadas em armação e lente quando o cliente diz
 * ("armação preta e lente cinza"). Sem marcador, a cor vale para qualquer parte.
 */
export interface ColorQuery { any: string[]; frame: string[]; lens: string[] }

const MARCA_LENTE = new Set(['lente', 'lentes'])
const MARCA_ARMACAO = new Set(['armacao', 'armacoes', 'aro', 'haste', 'hastes', 'frame', 'armação'])
// Lente "cinza"/"fumê" é a lente escura comum, que no catálogo se chama Preta/Black.
const LENTE_ESCURA = new Set(['cinza', 'grafite', 'fume', 'smoke', 'escura', 'escuro'])

export function colorQuery(tokens: string[]): ColorQuery {
  const q: ColorQuery = { any: [], frame: [], lens: [] }
  let modo: 'any' | 'frame' | 'lens' = 'any'
  for (const t of tokens) {
    if (MARCA_LENTE.has(t)) { modo = 'lens'; continue }
    if (MARCA_ARMACAO.has(t)) { modo = 'frame'; continue }
    if (STOP.has(t)) continue
    const groups = modo === 'lens' && LENTE_ESCURA.has(t) ? ['preto'] : colorGroups([t])
    for (const g of groups) if (!q[modo].includes(g)) q[modo].push(g)
  }
  return q
}

const temCor = (q: ColorQuery) => q.any.length + q.frame.length + q.lens.length > 0

function variantColorScore(variantName: string, q: ColorQuery): number {
  const total = q.any.length + q.frame.length + q.lens.length
  if (total === 0) return 0
  const vn = ` ${norm(variantName)} `
  // "Preta Lente Espelhada": antes de "lente" é a armação, depois é a lente.
  const i = vn.indexOf(' lente')
  const armacao = i >= 0 ? vn.slice(0, i) + ' ' : vn
  const lente = i >= 0 ? vn.slice(i) : vn
  const tem = (parte: string, g: string) => CORES[g].some(s => parte.includes(` ${s} `) || parte.includes(` ${s}`) || parte.includes(`/${s}`))
  let hit = 0
  // cor sem dizer se é armação ou lente: armação vale um pouco mais
  // ("radar preta" = armação preta antes de lente preta em armação de outra cor)
  for (const g of q.any) hit += tem(armacao, g) ? 1 : tem(vn, g) ? 0.9 : 0
  for (const g of q.frame) hit += tem(armacao, g) ? 1 : tem(vn, g) ? 0.3 : 0
  for (const g of q.lens) hit += tem(lente, g) ? 1 : tem(vn, g) ? 0.3 : 0
  return hit / total
}

const UTM = 'utm_source=instagram&utm_medium=dm&utm_campaign=bot_dm'

function toHit(p: CatalogProduct, v: Variant, score: number, utmContent: string, _op?: Map<string, string>): SearchHit {
  const { primary } = resolveVariantImages(p.images ?? [], p.variants, v.id)
  // Endereço do tema: /produto/<slug>, a lente em ?l= sem o "Lente " e, no
  // Eye Jacket/Redux (várias armações num produto só), a cor em ?cor=.
  const [cor, lenteNome] = v.name.includes(' · ') ? v.name.split(' · ') : [null, v.name]
  const qs = new URLSearchParams()
  if (cor) qs.set('cor', cor)
  if (lenteNome && lenteNome !== 'Único') qs.set('l', lenteNome.replace(/^Lente /, ''))
  const extra = qs.toString()
  return {
    productId: p.id, productName: p.name, productSlug: p.slug,
    variantId: v.id, variantName: v.name, price: Number(v.price), comparePrice: v.compare_price ? Number(v.compare_price) : null,
    imageUrl: primary?.url ?? null,
    url: `${SITE}/produto/${p.slug}?${extra ? `${extra}&` : ''}${UTM}&utm_content=${utmContent}`,
    // No site novo 1 óculos já sai R$175 na mesma página: não precisa de link à parte.
    oneUrl: null,
    score,
  }
}

/** Ordena as variações de um produto: ranking de vendas/views primeiro, depois cadastro. */
function byRank(p: CatalogProduct, rank: Record<string, string[]>): Variant[] {
  const top = rank[p.id] ?? []
  return [...p.variants].sort((a, b) => {
    const ra = top.indexOf(a.id), rb = top.indexOf(b.id)
    return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || a.position - b.position
  })
}

// Mais vendido primeiro no empate (src/lib/best-sellers.ts, vendas reais da Yampi).
const POS_VENDA = new Map(BEST_SELLER_SLUGS.map((slug, i) => [slug, i]))
const posVenda = (h: SearchHit) => POS_VENDA.get(h.productSlug) ?? 999
const ordena = (a: SearchHit, b: SearchHit) => b.score - a.score || posVenda(a) - posVenda(b)

/**
 * Intercala as armações: na JR cada produto é uma cor de armação e "radar"
 * casa com 14 produtos. Sem isso o carrossel mostrava 10 lentes da mesma
 * armação; assim mostra uma lente de cada armação primeiro, na ordem de venda.
 */
function intercala(hits: SearchHit[]): SearchHit[] {
  const grupos = new Map<string, SearchHit[]>()
  for (const h of hits) grupos.set(h.productId, [...(grupos.get(h.productId) ?? []), h])
  const filas = [...grupos.values()]
  const out: SearchHit[] = []
  for (let i = 0; out.length < hits.length; i++) for (const f of filas) if (f[i]) out.push(f[i])
  return out
}

export async function searchCatalog(query: string, limit = 10): Promise<SearchResult> {
  const { products, rank, op } = await catalog()
  const text = norm(query)
  const tokens = text.split(' ').filter(Boolean)

  const scored = products.map(p => ({ p, ...modelScore(text, tokens, p) })).sort((a, b) => b.score - a.score)
  const top = scored[0]
  const MODEL_MIN = 0.78

  if (top && top.score >= MODEL_MIN) {
    // Modelos empatados (ex.: "eye jacket" acha Eye Jacket, Redux, Flame...) entram juntos.
    const models = scored.filter(s => s.score >= top.score - 0.02 && s.score >= MODEL_MIN)
    const groups = colorQuery(tokens.filter((_, i) => !top.used.has(i)))
    const hits: SearchHit[] = []
    for (const { p, score } of models) {
      for (const v of byRank(p, rank)) {
        const c = variantColorScore(nomeCor(p, v), groups)
        if (temCor(groups) && c === 0) continue
        hits.push(toHit(p, v, score + c, 'busca', op))
      }
    }
    hits.sort(ordena)
    // Cor pedida não existe nesse modelo: mostra as cores mais vendidas dele.
    if (hits.length === 0) {
      for (const { p, score } of models) for (const v of byRank(p, rank).slice(0, 5)) hits.push(toHit(p, v, score, 'busca_sem_cor', op))
      hits.sort(ordena)
    }
    // Só intercala entre os de melhor nota (cor certa primeiro, sempre).
    const melhor = hits[0]?.score ?? 0
    const topo = hits.filter(h => h.score >= melhor - 0.001)
    return { model: models.map(m => m.p.name).join(', '), hits: [...intercala(topo), ...hits.slice(topo.length)].slice(0, limit) }
  }

  // Sem modelo: busca só por cor/estilo, 1 variação por modelo, as mais vendidas.
  const groups = colorQuery(tokens)
  if (!temCor(groups)) return { model: null, hits: [] }
  const hits: SearchHit[] = []
  for (const p of products) {
    if (/combo|kit/i.test(p.name)) continue
    const ranked = byRank(p, rank)
    let best: { v: Variant; c: number; pos: number } | null = null
    ranked.forEach((v, pos) => {
      const c = variantColorScore(nomeCor(p, v), groups)
      if (c > 0 && (!best || c > best.c || (c === best.c && pos < best.pos))) best = { v, c, pos }
    })
    if (best) {
      const b = best as { v: Variant; c: number; pos: number }
      hits.push(toHit(p, b.v, b.c - b.pos * 0.01 + ((rank[p.id]?.length ?? 0) > 0 ? 0.05 : 0), 'busca_cor', op))
    }
  }
  hits.sort(ordena)
  return { model: null, hits: hits.slice(0, limit) }
}

/** Variações de um produto (botão "Outras cores"). */
export async function productVariants(productId: string, limit = 10): Promise<SearchHit[]> {
  const { products, rank, op } = await catalog()
  const p = products.find(x => x.id === productId)
  if (!p) return []
  return byRank(p, rank).slice(0, limit).map(v => toHit(p, v, 1, 'outras_cores', op))
}

/** As cores mais vendidas de vários modelos (vitrine "Mais vendidos" na DM). */
export async function bestSellers(limit = 10): Promise<SearchHit[]> {
  const { products, rank } = await catalog()
  // Ranking de vendas reais da Yampi (src/lib/best-sellers.ts), 1 por modelo.
  const vistos = new Set<string>()
  const lista: CatalogProduct[] = []
  for (const slug of BEST_SELLER_SLUGS) {
    const p = products.find(x => x.slug === slug)
    if (!p || vistos.has(p.model) || !p.variants.length) continue
    vistos.add(p.model); lista.push(p)
  }
  return lista.slice(0, limit).map(p => toHit(p, byRank(p, rank)[0], 1, 'mais_vendidos'))
}

export interface ProductMedia {
  productId: string
  name: string
  url: string
  oneUrl: string | null
  /** Vídeos da página do produto (até 3). */
  videos: string[]
  /** Foto do óculos no rosto (arquivo "rosto" no cadastro). */
  ugc: string | null
  /** Fotos da cor escolhida, para quando o modelo não tem vídeo. */
  photos: string[]
}

/** Vídeos, foto no rosto e fotos de um produto (cor `variantId` ou a mais vendida). */
export async function productMedia(productId: string, variantId?: string): Promise<ProductMedia | null> {
  const { products, rank, op } = await catalog()
  const p = products.find(x => x.id === productId)
  if (!p) return null
  const v = p.variants.find(x => x.id === variantId) ?? byRank(p, rank)[0]
  const hit = toHit(p, v, 1, 'videos', op)
  const imgs = [...(p.images ?? [])].filter(i => i.url).sort((a, b) => a.position - b.position)
  const isUgc = (u: string) => /\/ugc\//.test(u) || /rosto/i.test(decodeURIComponent(u.split('/').pop() ?? ''))
  const daCor = imgs.filter(i => i.variant_id === v.id && !isUgc(i.url)).map(i => i.url)
  return {
    productId: p.id, name: p.name, url: hit.url, oneUrl: hit.oneUrl,
    videos: getProductionVideos(p.collectionSlug) ?? [],
    ugc: imgs.find(i => isUgc(i.url))?.url ?? null,
    photos: (daCor.length ? daCor : imgs.filter(i => !isUgc(i.url)).map(i => i.url)).slice(0, 3),
  }
}
