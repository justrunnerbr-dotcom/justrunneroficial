// Gera prototipo-tema/assets/catalogo-real.json.js a partir do catálogo real (Supabase).
// Só leitura no banco. Rodar de novo sempre que o catálogo mudar:
//   node scripts/_prototipo-catalogo.mjs
//
// Desde 12/10/2026 o protótipo usa o MESMO catálogo do site no ar: produtos JR- (R$ 297, "Leve 2 pelo
// preço de 1", 2º grátis) e combos JRC- (3 óculos por R$ 327). A Oferta Progressiva (JROP-) saiu.
// As vitrines da home seguem a curadoria do site: src/lib/lancamentos.ts e C1L2_FEATURED_FIRST da home.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)
    .filter(l => /^[A-Z_0-9]+=/.test(l))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }),
)
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY }
const get = async q => {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${q}`, { headers: H })
  if (!r.ok) throw new Error(`${q}: ${r.status} ${await r.text()}`)
  return r.json()
}

const ps = await get('products?select=id,slug,name,status,collection:collections(slug),variants(id,name,sku,price,compare_price,position,yampi_product_id),collection_id,images(url,position,variants(name))&status=eq.active')

// Família (modelo do protótipo) pelo começo do nome — do prefixo mais longo pro mais curto.
const FAMILIAS = [
  ['radar-ev-kit', ['Radar EV Kit de Lentes'], 'Kit de Lentes Radar EV'],
  ['plantaris-squared', ['Plantaris Squared'], 'Plantaris Squared'],
  ['eye-jacket-redux', ['Eye Jacket Redux'], 'Eye Jacket Redux'],
  ['eye-jacket', ['Eye Jacket'], 'Eye Jacket'],
  ['straight-jacket', ['Straight Jacket'], 'Straight Jacket'],
  ['half-jacket', ['Half Jacket'], 'Half Jacket'],
  ['monster-dog', ['Monster Dog'], 'Monster Dog'],
  ['m-frame', ['M Frame'], 'M Frame'],
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

const models = {}
const porVariante = {}   // variant id → [modelo, cor, lente] (pra resolver as vitrines curadas)
const semFamilia = []
const opPendente = []   // variações JROP (Oferta Progressiva): entram como preço alternativo da mesma cor/lente
const oePendente = []   // variações JROE (Oferta Exclusiva, R$147,90, 26/10/2026): idem, campo `oe`
const modelosDaColecao = {}
for (const p of ps) {
  const op = p.variants.filter(v => /^JROP-/.test(v.sku || '') && v.yampi_product_id)
  if (op.length) { opPendente.push({ p, op }); continue }
  const oe = p.variants.filter(v => /^JROE-/.test(v.sku || '') && v.yampi_product_id)
  if (oe.length) { oePendente.push({ p, op: oe }); continue }
  const jr = p.variants.filter(v => /^(JR|JRC)-/.test(v.sku || '') && v.yampi_product_id)
  if (!jr.length) continue
  const fam = FAMILIAS.find(([, pre]) => pre.some(x => p.name.toLowerCase().startsWith(x.toLowerCase())))
  if (!fam) { semFamilia.push(p.name); continue }
  const [slug, prefixos, nome] = fam
  const combo = slug === 'combo'
  let cor = combo ? p.name : p.name
  for (const pre of prefixos) if (cor.toLowerCase().startsWith(pre.toLowerCase())) { cor = cor.slice(pre.length).trim(); break }
  if (combo) cor = p.name
  const m = (models[slug] ||= { name: nome, combo, colors: {} })
  if (p.collection?.slug) (modelosDaColecao[p.collection.slug] ||= new Set()).add(slug)
  for (const v of [...jr].sort((a, b) => a.position - b.position)) {
    // "Cinza · Lente Azul": a cor vem na variação quando o nome do produto não traz cor (Eye Jacket, Redux).
    const partes = cor === 'Padrão' || !cor ? v.name.split(' · ') : [v.name]
    const corV = partes.length > 1 ? partes[0] : (cor || 'Padrão')
    const lente = (partes.length > 1 ? partes[1] : v.name).replace(/Lente /g, '')
    const fotos = p.images.filter(i => i.variants?.name === v.name).sort((a, b) => a.position - b.position).map(i => i.url)
    const fotosProduto = fotos.length ? fotos : p.images.filter(i => !i.variants).sort((a, b) => a.position - b.position).map(i => i.url)
    const c = (m.colors[corV] ||= { productSlug: p.slug, lenses: {} })
    c.lenses[lente] = { id: String(v.yampi_product_id), sku: v.sku, price: v.price, de: v.compare_price, photos: fotosProduto }
    porVariante[v.id] = [slug, corV, lente]
  }
}

// Oferta Progressiva (op) e Exclusiva (oe): mesma família, cor e lente do produto JR (nomes iguais), com o id/preço do gêmeo.
for (const [campo, pendentes] of [['op', opPendente], ['oe', oePendente]]) {
let opOk = 0; const opSem = []
for (const { p, op } of pendentes) {
  const fam = FAMILIAS.find(([, pre]) => pre.some(x => p.name.toLowerCase().startsWith(x.toLowerCase())))
  if (!fam) { opSem.push(p.name); continue }
  const [slug, prefixos] = fam
  let cor = p.name
  for (const pre of prefixos) if (cor.toLowerCase().startsWith(pre.toLowerCase())) { cor = cor.slice(pre.length).trim(); break }
  for (const v of op) {
    const partes = cor === 'Padrão' || !cor ? v.name.split(' · ') : [v.name]
    const corV = partes.length > 1 ? partes[0] : (cor || 'Padrão')
    const lente = (partes.length > 1 ? partes[1] : v.name).replace(/Lente /g, '')
    const alvo = models[slug]?.colors[corV]?.lenses[lente]
    if (alvo) { alvo[campo] = { id: String(v.yampi_product_id), sku: v.sku, price: v.price }; opOk++ } else opSem.push(`${p.name} · ${v.name}`)
  }
}
console.log(campo === 'op' ? 'oferta progressiva' : 'oferta exclusiva', ': ligadas', opOk, '| sem par JR:', opSem.length ? opSem.join(', ') : 'nenhuma')
}

// Categorias do menu, na ordem do site antigo (collections.position), com os modelos de cada uma.
const colTodas = await get('collections?select=slug,name,position&order=position')
const categorias = colTodas.filter(c => modelosDaColecao[c.slug] && !['combos', 'oferta-exclusiva'].includes(c.slug))
  .map(c => ({ slug: c.slug, nome: c.name === 'Hstn' ? 'HSTN' : c.name, modelos: [...modelosDaColecao[c.slug]] }))

// Vitrines curadas do site no ar (mesmos arquivos que a home usa).
const ids = txt => [...txt.matchAll(/variantId: '([0-9a-f-]{36})'/g)].map(x => x[1])
const lancTxt = readFileSync(join(ROOT, 'src/lib/lancamentos.ts'), 'utf8')
const homeTxt = readFileSync(join(ROOT, 'src/app/(store)/page.tsx'), 'utf8')
const c1l2Ini = homeTxt.indexOf('= [', homeTxt.indexOf('C1L2_FEATURED_FIRST'))
const c1l2Bloco = homeTxt.slice(c1l2Ini, homeTxt.indexOf('\n]', c1l2Ini))
const resolve = list => list.map(id => porVariante[id]).filter(Boolean)
const vitrines = { lancamentos: resolve(ids(lancTxt)), leve2Destaque: resolve(ids(c1l2Bloco)) }

// Redirecionamentos do site no ar pro tema novo (next.config.ts): /produto/<slug> → página do modelo na cor certa.
// Inclui as versões -op (Oferta Progressiva), que caem no mesmo modelo/cor do produto JR. A cor vai pelo nome
// (?cor=), porque a ordem das cores na página do tema não é a do banco.
const redirProdutos = {}
for (const [slug, m] of Object.entries(models)) {
  const cores = Object.keys(m.colors)
  cores.forEach((cor, i) => { const ps = m.colors[cor].productSlug; redirProdutos[ps] ||= { p: slug, cor }; redirProdutos[ps + '-op'] ||= { p: slug, cor, op: 1 }; redirProdutos[ps + '-oe'] ||= { p: slug, cor, oe: 1 } })   // produto com várias cores (Eye Jacket, Redux) abre na 1ª
}
const colecoes = await get('collections?select=slug')
const MODELO_DA_COLECAO = { radar: 'radar-ev', casual: 'dartboard', 'eye-jacket': 'eye-jacket', flak: 'flak', minute: 'minute', plantaris: 'plantaris', hstn: 'hstn',
  encoder: 'encoder', 'straight-jacket': 'straight-jacket', 'half-jacket': 'half-jacket', '1311': '1311', ellipse: 'ellipse', holbrook: 'holbrook',
  'm-frame': 'm-frame', 'monster-dog': 'monster-dog', soto: 'soto', sphaera: 'sphaera', sutro: 'sutro' }
const CAT_DA_COLECAO = { 'compre-1-leve-2': 'leve2', 'oferta-progressiva': 'oferta', 'oferta-exclusiva': 'exclusiva', combos: 'leve3', lancamentos: 'lancamentos', 'mais-vendidos': 'mais-vendidos' }
const redirColecoes = {}
for (const { slug } of colecoes) {
  if (CAT_DA_COLECAO[slug]) redirColecoes[slug] = `colecao.html?cat=${CAT_DA_COLECAO[slug]}`
  else if (modelosDaColecao[slug]) redirColecoes[slug] = `colecao.html?cat=${slug}`
}
for (const [k, v] of Object.entries(CAT_DA_COLECAO)) redirColecoes[k] ||= `colecao.html?cat=${v}`
writeFileSync(join(ROOT, 'src/lib/tema-redirects.json'), JSON.stringify({ produtos: redirProdutos, colecoes: redirColecoes }, null, 1) + '\n')
console.log('redirects: produtos', Object.keys(redirProdutos).length, '| coleções', Object.keys(redirColecoes).length)

// Ranking de vendas por armação (src/lib/best-sellers.ts): ordena "Lentes Mais Vendidas" e intercala o Compre 1 Leve 2.
const ranking = [...readFileSync(join(ROOT, 'src/lib/best-sellers.ts'), 'utf8').matchAll(/^\s*'([a-z0-9-]+)',/gm)].map(x => x[1])
console.log('ranking de vendas:', ranking.length, 'armações')

const out = { models, vitrines, categorias, ranking, checkoutDomain: `seguro.${new URL(env.NEXT_PUBLIC_SITE_URL).hostname.replace(/^www\./, '')}` }
writeFileSync(join(ROOT, 'prototipo-tema/assets/catalogo-real.json.js'),
  `/* Gerado por scripts/_prototipo-catalogo.mjs em ${new Date().toISOString()} — não editar à mão. */\nwindow.JR_REAL = ${JSON.stringify(out)};\n`)

let nv = 0; const semFoto = []; const precos = {}
for (const [s, m] of Object.entries(models)) for (const [c, x] of Object.entries(m.colors)) for (const [l, y] of Object.entries(x.lenses)) {
  nv++; precos[y.price] = (precos[y.price] || 0) + 1; if (!y.photos.length) semFoto.push(`${s}/${c}/${l}`)
}
console.log('modelos', Object.keys(models).length, '| cores', Object.values(models).reduce((a, m) => a + Object.keys(m.colors).length, 0), '| SKUs', nv, '| preços', precos)
for (const [s, m] of Object.entries(models)) console.log(' ', s, '→', Object.entries(m.colors).map(([c, x]) => `${c}(${Object.keys(x.lenses).length})`).join(', '))
console.log('vitrines: lançamentos', vitrines.lancamentos.length, '/', ids(lancTxt).length, '| leve 2 destaque', vitrines.leve2Destaque.length, '/', ids(c1l2Bloco).length)
console.log('sem foto:', semFoto.length ? semFoto.join(', ') : 'nenhum')
console.log('sem família:', semFamilia.join(', ') || 'nenhum')
console.log('checkout', out.checkoutDomain)
