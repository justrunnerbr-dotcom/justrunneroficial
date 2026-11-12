import { getAdminSupabase } from '@/lib/admin-client'
import { LANCAMENTOS } from '@/lib/lancamentos'
import { C1L2_DESTAQUES } from '@/lib/c1l2-destaques'
import { BEST_SELLER_SLUGS } from '@/lib/best-sellers'

// Catálogo do tema novo (window.JR_REAL), montado direto do banco.
//
// Mesma conta do scripts/_prototipo-catalogo.mjs, que gera o arquivo fixo
// public/tema/assets/catalogo-real.json.js. Desde 12/11/2026 o site lê esta
// versão pela rota /api/tema/catalogo, que se atualiza quando o admin salva
// produto, variação ou coleção (revalidatePath). O arquivo fixo continua sendo
// o reserva: a página carrega ele se a rota falhar, e a rota devolve ele se o
// banco estiver fora.
// Mudou a regra aqui? Mude no script também (e vice-versa).

export const CATALOGO_PATH = '/api/tema/catalogo'

const FAMILIAS: [string, string[], string][] = [
  ['radar-ev-kit', ['Radar EV Kit de Lentes'], 'Kit de Lentes Radar EV'],
  ['plantaris-squared', ['Plantaris Squared'], 'Plantaris Squared'],
  ['eye-jacket-redux', ['Eye Jacket Redux'], 'Eye Jacket Redux'],
  ['eye-jacket', ['Eye Jacket'], 'Eye Jacket'],
  ['straight-jacket', ['Straight Jacket'], 'Straight Jacket'],
  ['half-jacket', ['Half Jacket'], 'Half Jacket'],
  ['monster-dog', ['Monster Dog'], 'Monster Dog'],
  ['m-frame', ['M Frame'], 'M Frame'],
  ['radarlock-path', ['Radarlock Path', 'Radarlock'], 'Radarlock Path'],
  ['radar-ev', ['Radar EV', 'Radar'], 'Radar EV'],
  ['plantaris', ['Plantaris'], 'Plantaris'],
  ['minute', ['Minute'], 'Minute'],
  ['flak', ['Flak'], 'Flak'],
  ['hstn', ['HSTN'], 'HSTN'],
  ['encoder', ['Encoder'], 'Encoder'],
  ['dartboard', ['Dartboard'], 'Dartboard'],
  ['1311', ['13.11', '1311'], '13.11'],
  ['ellipse', ['Ellipse'], 'Ellipse'],
  ['holbrook', ['Holbrook'], 'Holbrook'],
  ['soto', ['Soto'], 'Soto'],
  ['sphaera', ['Sphaera'], 'Sphaera'],
  ['sutro', ['Sutro'], 'Sutro'],
  ['fat-cat', ['Fat Cat'], 'Fat Cat'],
  ['terraforma', ['Terraforma'], 'Terraforma'],
  ['combo', ['Combo'], 'Compre 1 Leve 3'],
]

type Variante = { id: string; name: string; sku: string | null; price: number; compare_price: number | null; position: number; yampi_product_id: string | null }
type Produto = {
  id: string; slug: string; name: string
  collection: { slug: string } | null
  variants: Variante[]
  images: { url: string; position: number; variants: { name: string } | null }[]
}
type Lente = { id: string; sku: string | null; price: number; de: number | null; photos: string[]; op?: Gemeo; oe?: Gemeo; l3?: Gemeo }
type Gemeo = { id: string; sku: string | null; price: number }
type Modelo = { name: string; combo: boolean; colors: Record<string, { productSlug: string; lenses: Record<string, Lente> }> }

const familia = (nome: string) => FAMILIAS.find(([, pre]) => pre.some(x => nome.toLowerCase().startsWith(x.toLowerCase())))
const semPrefixo = (nome: string, prefixos: string[]) => {
  for (const pre of prefixos) if (nome.toLowerCase().startsWith(pre.toLowerCase())) return nome.slice(pre.length).trim()
  return nome
}
/** "Cinza · Lente Azul": a cor vem na variação quando o nome do produto não traz cor (Eye Jacket, Redux). */
const corELente = (cor: string, v: Variante) => {
  const partes = cor === 'Padrão' || !cor ? v.name.split(' · ') : [v.name]
  return {
    cor: partes.length > 1 ? partes[0] : (cor || 'Padrão'),
    lente: (partes.length > 1 ? partes[1] : v.name).replace(/Lente /g, ''),
  }
}

export async function montarCatalogo() {
  const db = getAdminSupabase()
  const { data: ps, error } = await db.from('products')
    .select('id,slug,name,collection:collections(slug),variants(id,name,sku,price,compare_price,position,yampi_product_id),images(url,position,variants(name))')
    .eq('status', 'active')
  if (error) throw new Error(`produtos: ${error.message}`)
  const { data: colTodas, error: e2 } = await db.from('collections').select('slug,name,position').order('position')
  if (e2) throw new Error(`coleções: ${e2.message}`)
  const produtos = (ps ?? []) as unknown as Produto[]
  // Banco respondeu vazio (projeto pausado/restaurando): não publica catálogo vazio.
  if (produtos.length < 50) throw new Error(`catálogo com só ${produtos.length} produtos ativos`)

  const models: Record<string, Modelo> = {}
  const porVariante: Record<string, [string, string, string]> = {}
  const pendentes: Record<'op' | 'oe' | 'l3', { p: Produto; vs: Variante[] }[]> = { op: [], oe: [], l3: [] }
  const modelosDaColecao: Record<string, Set<string>> = {}

  for (const p of produtos) {
    const comYampi = (re: RegExp) => p.variants.filter(v => re.test(v.sku || '') && v.yampi_product_id)
    const op = comYampi(/^JROP-/); if (op.length) { pendentes.op.push({ p, vs: op }); continue }
    const oe = comYampi(/^JROE-/); if (oe.length) { pendentes.oe.push({ p, vs: oe }); continue }
    const l3 = comYampi(/^JRL3-/); if (l3.length) { pendentes.l3.push({ p, vs: l3 }); continue }
    const jr = comYampi(/^(JR|JRC)-/)
    if (!jr.length) continue
    const fam = familia(p.name)
    if (!fam) continue
    const [slug, prefixos, nome] = fam
    const combo = slug === 'combo'
    const cor = combo ? p.name : semPrefixo(p.name, prefixos)
    const m = (models[slug] ||= { name: nome, combo, colors: {} })
    if (p.collection?.slug) (modelosDaColecao[p.collection.slug] ||= new Set()).add(slug)
    for (const v of [...jr].sort((a, b) => a.position - b.position)) {
      const { cor: corV, lente } = corELente(cor, v)
      const fotos = p.images.filter(i => i.variants?.name === v.name).sort((a, b) => a.position - b.position).map(i => i.url)
      const fotosProduto = fotos.length ? fotos : p.images.filter(i => !i.variants).sort((a, b) => a.position - b.position).map(i => i.url)
      const c = (m.colors[corV] ||= { productSlug: p.slug, lenses: {} })
      c.lenses[lente] = { id: String(v.yampi_product_id), sku: v.sku, price: Number(v.price), de: v.compare_price === null ? null : Number(v.compare_price), photos: fotosProduto }
      porVariante[v.id] = [slug, corV, lente]
    }
  }

  // Oferta Progressiva (op), Exclusiva (oe) e Compre 1 Leve 3 (l3): mesma família/cor/lente do JR, com o id/preço do gêmeo.
  for (const campo of ['op', 'oe', 'l3'] as const) {
    for (const { p, vs } of pendentes[campo]) {
      const fam = familia(p.name)
      if (!fam) continue
      const cor = semPrefixo(p.name, fam[1])
      for (const v of vs) {
        const { cor: corV, lente } = corELente(cor, v)
        const alvo = models[fam[0]]?.colors[corV]?.lenses[lente]
        if (alvo) alvo[campo] = { id: String(v.yampi_product_id), sku: v.sku, price: Number(v.price) }
      }
    }
  }

  const categorias = (colTodas ?? [])
    .filter(c => modelosDaColecao[c.slug] && !['combos', 'oferta-exclusiva', 'compre-1-leve-3'].includes(c.slug))
    .map(c => ({ slug: c.slug, nome: c.name === 'Hstn' ? 'HSTN' : c.name, modelos: [...modelosDaColecao[c.slug]] }))

  const resolve = (lista: { variantId: string }[]) => lista.map(x => porVariante[x.variantId]).filter(Boolean)
  const vitrines = { lancamentos: resolve(LANCAMENTOS), leve2Destaque: resolve(C1L2_DESTAQUES) }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://justrunner.com.br'

  return {
    models, vitrines, categorias, ranking: BEST_SELLER_SLUGS,
    checkoutDomain: `seguro.${new URL(site).hostname.replace(/^www\./, '')}`,
  }
}
