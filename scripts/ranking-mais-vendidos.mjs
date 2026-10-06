// Gera src/lib/best-sellers.ts: ranking de modelos por unidades vendidas na
// Yampi (pedidos pagos, todo o histórico). As categorias da loja usam esse
// ranking para mostrar os mais vendidos primeiro.
//
// A fonte é a Yampi e não a tabela `orders` do Supabase, que parou de receber
// pedidos em 13/08/2026 (52 pedidos contra ~1000 na Yampi em 06/10/2026).
//
// Vendas da Oferta Progressiva (JROP-) somam no modelo principal; combos (JRC-)
// ficam de fora, porque são kits e não um modelo. Pedidos do catálogo antigo
// (SKUs anteriores ao padrão JR-) são casados pelo nome do produto na Yampi
// ("Óculos de Sol Flak 2.0 Preta Preta" -> flak-preta): vale o nome de produto
// atual mais longo que for prefixo do título.
//
// Uso: node scripts/ranking-mais-vendidos.mjs [--dry-run]
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const DRY_RUN = process.argv.includes('--dry-run')

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]
    }),
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const base = `https://api.dooki.com.br/v2/${env.NEXT_PUBLIC_YAMPI_ALIAS}`
const headers = { 'User-Token': env.YAMPI_API_TOKEN, 'User-Secret-Key': env.YAMPI_SECRET_KEY }

// Pedido que não virou venda não entra no ranking.
const STATUS_FORA = new Set(['waiting_payment', 'cancelled', 'refused', 'pending'])

function normaliza(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^\[jr( op)?\]\s*/, '')
    .replace(/^oculos de sol\s+/, '')
    .replace(/\b2\.0\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    // Grafias do catálogo antigo: "Plantaris Premium", "Radar Ev", "Flak Preto".
    .replace(/\b(premium|ev)\b/g, ' ')
    .replace(/\bpreto\b/g, 'preta')
    .replace(/\bbranco\b/g, 'branca')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  const { data: variants, error } = await supabase
    .from('variants')
    .select('sku, product:products(slug)')
  if (error) throw error
  const slugBySku = new Map(variants.filter((v) => v.sku && v.product).map((v) => [v.sku, v.product.slug]))

  const { data: products, error: errProducts } = await supabase
    .from('products')
    .select('slug, name')
    .not('slug', 'like', '%-op')
  if (errProducts) throw errProducts
  const porNome = products
    .map((p) => ({ slug: p.slug, nome: normaliza(p.name) }))
    .sort((a, b) => b.nome.length - a.nome.length)
  const slugPorTitulo = (titulo) => {
    const t = normaliza(titulo)
    return porNome.find((p) => t === p.nome || t.startsWith(p.nome + ' '))?.slug
  }

  const unidades = new Map()
  const statusVistos = new Map()
  const skusSemProduto = new Map()
  let pedidos = 0
  let casadosPorNome = 0
  let page = 1
  let lastPage = 1

  do {
    const res = await fetch(`${base}/orders?include=items.sku&limit=100&page=${page}`, { headers })
    if (!res.ok) throw new Error(`GET orders page ${page}: ${res.status}`)
    const body = await res.json()
    lastPage = body.meta.pagination.total_pages

    for (const order of body.data) {
      const status = order.status?.data?.alias ?? 'desconhecido'
      statusVistos.set(status, (statusVistos.get(status) ?? 0) + 1)
      if (STATUS_FORA.has(status)) continue
      pedidos++

      for (const item of order.items?.data ?? []) {
        const sku = item.item_sku ?? ''
        if (sku.startsWith('JRC-')) continue
        const titulo = item.sku?.data?.title ?? ''
        let slug = slugBySku.get(sku) ?? (titulo ? slugPorTitulo(titulo) : undefined)
        if (!slug) {
          const chave = titulo || sku || '(sem nome)'
          skusSemProduto.set(chave, (skusSemProduto.get(chave) ?? 0) + item.quantity)
          continue
        }
        if (!slugBySku.has(sku)) casadosPorNome += item.quantity
        // Combo é kit (ordem fixa por número), não entra no ranking de modelos.
        if (slug.startsWith('combo-')) continue
        slug = slug.replace(/-op$/, '')
        unidades.set(slug, (unidades.get(slug) ?? 0) + item.quantity)
      }
    }
    page++
  } while (page <= lastPage)

  const ranking = [...unidades.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  console.log('Status dos pedidos:', Object.fromEntries(statusVistos))
  console.log(`Pedidos contados: ${pedidos}`)
  const totalContado = ranking.reduce((acc, [, q]) => acc + q, 0)
  const totalFora = [...skusSemProduto.values()].reduce((acc, q) => acc + q, 0)
  console.log(`Unidades contadas: ${totalContado} (${casadosPorNome} casadas pelo nome) · sem modelo atual: ${totalFora}`)
  console.log(`Modelos ranqueados: ${ranking.length}`)
  ranking.forEach(([slug, qtd], i) => console.log(`${String(i + 1).padStart(3)}. ${slug} — ${qtd}`))
  if (skusSemProduto.size > 0) {
    console.log('\nVendido sem modelo correspondente no catálogo atual (ignorado):')
    for (const [nome, qtd] of [...skusSemProduto].sort((a, b) => b[1] - a[1])) console.log(`  ${nome} — ${qtd}`)
  }

  if (pedidos === 0 || ranking.length === 0) throw new Error('Nenhuma venda contada — ranking não foi gravado.')
  if (DRY_RUN) return

  const hoje = new Date().toISOString().slice(0, 10)
  const out = `// Gerado por scripts/ranking-mais-vendidos.mjs em ${hoje} — não editar à mão.
// Modelos ordenados por unidades vendidas na Yampi (pedidos pagos, todo o
// histórico; Oferta Progressiva soma no modelo principal, combos ficam fora).
export const BEST_SELLER_SLUGS: string[] = [
${ranking.map(([slug, qtd]) => `  '${slug}', // ${qtd}`).join('\n')}
]

const RANK = new Map(BEST_SELLER_SLUGS.map((slug, i) => [slug, i]))

// Mais vendidos primeiro; quem não vendeu mantém a ordem que já tinha.
export function sortByBestSellers<T extends { slug: string }>(products: T[]): T[] {
  return products
    .map((p, i) => ({ p, i, r: RANK.get(p.slug.replace(/-op$/, '')) ?? Infinity }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(({ p }) => p)
}
`
  fs.writeFileSync('src/lib/best-sellers.ts', out)
  console.log('\nGravado src/lib/best-sellers.ts')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
