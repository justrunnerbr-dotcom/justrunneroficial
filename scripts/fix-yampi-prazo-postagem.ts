// Corrige o "Prazo para postagem" (campo `availability`) dos SKUs da Just Runner
// na Yampi.
//
// O bug: sync-yampi-catalog.ts, sync-yampi-oferta-progressiva.ts e
// sync-yampi-combos.ts gravavam `availability: 999` achando que era quantidade
// de estoque. Na Yampi esse campo é "Prazo para postagem" EM DIAS — então o
// checkout somava 999 dias ao prazo dos Correios e mostrava mais de 1000 dias
// de entrega em todo o catálogo, desde 10/07/2026. Estoque de verdade é
// `quantity_managed`/`quantity`, que já estão corretos (venda contínua).
//
// Os SKUs legados da mesma conta sempre usaram availability=1, o que confirma
// que 1 é o valor esperado para postagem no dia seguinte.
//
// Uso:
//   node --experimental-strip-types scripts/fix-yampi-prazo-postagem.ts --dry-run
//   node --experimental-strip-types scripts/fix-yampi-prazo-postagem.ts
import fs from 'node:fs'

const DRY_RUN = process.argv.includes('--dry-run')

const argIdx = process.argv.indexOf('--dias')
const PRAZO_POSTAGEM = argIdx >= 0 ? Number(process.argv[argIdx + 1]) : 1

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const headers = {
  'User-Token': env.YAMPI_API_TOKEN,
  'User-Secret-Key': env.YAMPI_SECRET_KEY,
  'Content-Type': 'application/json',
}
const base = `https://api.dooki.com.br/v2/${env.NEXT_PUBLIC_YAMPI_ALIAS}`

// Só o catálogo da Just Runner. Os ~885 SKUs legados da conta ficam intocados.
const NOSSOS_PREFIXOS = /^(JR-|JROP-|JRC-)/

interface Sku {
  id: number
  sku: string
  product_id: number
  price_cost: number
  price_sale: number
  weight: number
  height: number
  width: number
  length: number
  quantity_managed: boolean
  availability: number
  availability_soldout: number
  blocked_sale: boolean
}

async function listarTodos(): Promise<Sku[]> {
  const porId = new Map<number, Sku>()
  for (let page = 1; page <= 40; page++) {
    const res = await fetch(`${base}/catalog/skus?limit=100&page=${page}`, { headers })
    if (!res.ok) throw new Error(`listagem página ${page}: ${res.status} ${await res.text()}`)
    const rows = ((await res.json()).data ?? []) as Sku[]
    if (rows.length === 0) break
    // dedupe por id: a paginação da Yampi pode repetir registros entre páginas
    for (const s of rows) porId.set(s.id, s)
    if (rows.length < 100) break
  }
  return [...porId.values()]
}

async function main() {
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Corrigindo prazo de postagem na Yampi`)
  console.log(`Novo valor: ${PRAZO_POSTAGEM} dia(s)\n`)

  const todos = await listarTodos()
  const nossos = todos.filter((s) => s.sku && NOSSOS_PREFIXOS.test(s.sku))
  const errados = nossos.filter((s) => s.availability !== PRAZO_POSTAGEM)

  console.log(`SKUs na conta          : ${todos.length}`)
  console.log(`SKUs da Just Runner    : ${nossos.length}`)
  console.log(`Precisam de correção   : ${errados.length}`)

  const porPrefixo: Record<string, number> = {}
  for (const s of errados) {
    const p = s.sku.startsWith('JROP-') ? 'JROP-' : s.sku.startsWith('JRC-') ? 'JRC-' : 'JR-'
    porPrefixo[p] = (porPrefixo[p] ?? 0) + 1
  }
  console.log(`  por prefixo          : ${JSON.stringify(porPrefixo)}\n`)

  if (errados.length === 0) {
    console.log('Nada a fazer.\n')
    return
  }

  if (DRY_RUN) {
    for (const s of errados.slice(0, 5)) {
      console.log(`  ${s.sku.padEnd(34)} availability ${s.availability} -> ${PRAZO_POSTAGEM}`)
    }
    if (errados.length > 5) console.log(`  ... e mais ${errados.length - 5}`)
    console.log('\n[DRY RUN] Nada foi gravado.\n')
    return
  }

  let ok = 0
  let falhou = 0
  for (const s of errados) {
    // A API exige os campos obrigatórios no PUT mesmo em update parcial —
    // reenviados com o valor atual para não alterar nada além do prazo.
    const body = {
      product_id: s.product_id,
      sku: s.sku,
      price_cost: s.price_cost,
      price_sale: s.price_sale,
      weight: s.weight,
      height: s.height,
      width: s.width,
      length: s.length,
      quantity_managed: s.quantity_managed,
      availability: PRAZO_POSTAGEM,
      availability_soldout: s.availability_soldout,
      blocked_sale: s.blocked_sale,
      variations_values_ids: [],
    }
    const res = await fetch(`${base}/catalog/skus/${s.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    })
    if (res.ok) {
      ok++
      if (ok % 50 === 0) console.log(`  ${ok}/${errados.length}...`)
    } else {
      falhou++
      console.error(`  FALHOU ${s.sku}: ${res.status} ${(await res.text()).slice(0, 160)}`)
    }
  }

  console.log(`\nCorrigidos: ${ok}  |  Falhas: ${falhou}\n`)
}

main().catch((err: Error) => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
