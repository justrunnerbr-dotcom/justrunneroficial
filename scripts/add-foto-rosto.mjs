// Foto "no rosto" como 2ª foto de cada produto — UMA por produto (2026-10-06).
//
// A galeria da PDP junta as fotos de todas as variações em sequência, então a
// foto entra só na 1ª variação (por position), logo depois da capa: vira a 2ª
// foto da galeria sem se repetir em cada cor. Produto que já tem a foto da
// categoria em qualquer variação é pulado (os 16 que ficaram do ajuste de julho,
// ver fix-ugc-single-photo.ts).
//
// As fotos já estão no Storage em products/ugc/ desde julho; nada sobe aqui.
// Modelo sem foto de rosto (13.11, Ellipse, Soto...) fica como está.
//
// Uso: node scripts/add-foto-rosto.mjs [--dry-run]
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
const BASE = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/ugc`

// Pelo começo do nome do produto. "Eye Jacket Flame" antes de "Eye Jacket".
const POR_NOME = [
  ['eye jacket flame', 'eye-jacket-flame.jpg'],
  ['eye jacket', 'eye-jacket.png'],
  ['encoder', 'encoder.png'],
  ['flak', 'flak.jpg'],
  ['half jacket', 'half-jacket.jpg'],
  ['hstn', 'hstn.png'],
  ['minute', 'minute.jpg'],
  ['plantaris', 'plantaris.jpg'],
  ['radar', 'radar.jpg'],
  ['straight jacket', 'straight-jacket.png'],
]

async function main() {
  for (const [, arquivo] of POR_NOME) {
    const res = await fetch(`${BASE}/${arquivo}`, { method: 'HEAD' })
    if (!res.ok) throw new Error(`Foto não encontrada no Storage: ugc/${arquivo} (${res.status})`)
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('id, slug, name, variants(id, name, position), images(id, variant_id, url, position)')
    .eq('status', 'active')
  if (error) throw error

  let adicionadas = 0
  let jaTinham = 0
  let semFoto = 0
  const inseridas = []

  for (const p of products) {
    const par = POR_NOME.find(([prefixo]) => p.name.toLowerCase().startsWith(prefixo))
    if (!par) { semFoto++; continue }
    const url = `${BASE}/${par[1]}`
    if (p.images.some((i) => i.url === url)) { jaTinham++; continue }

    const primeira = [...p.variants]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .find((v) => p.images.some((i) => i.variant_id === v.id))
    if (!primeira) { console.log(`  ⚠ ${p.slug}: nenhuma variação com foto — pulado`); continue }

    const daVariacao = p.images.filter((i) => i.variant_id === primeira.id).sort((a, b) => a.position - b.position)
    const novaPos = daVariacao[0].position + 1
    const deslocar = daVariacao.filter((i) => i.position >= novaPos).sort((a, b) => b.position - a.position)

    console.log(`  ${p.slug} / ${primeira.name}: ugc/${par[1]} na posição ${novaPos}${deslocar.length ? ` (${deslocar.length} foto(s) andam 1 pra frente)` : ''}`)
    adicionadas++
    if (DRY_RUN) continue

    for (const img of deslocar) {
      const { error: e } = await supabase.from('images').update({ position: img.position + 1 }).eq('id', img.id)
      if (e) throw new Error(`${p.slug}: deslocar ${img.id}: ${e.message}`)
    }
    const { data: nova, error: e } = await supabase
      .from('images')
      .insert({ product_id: p.id, variant_id: primeira.id, url, alt: `${p.name} no rosto`, position: novaPos })
      .select('id')
      .single()
    if (e) throw new Error(`${p.slug}: inserir: ${e.message}`)
    inseridas.push(nova.id)
  }

  console.log(`\nProdutos ativos: ${products.length} · recebem foto: ${adicionadas} · já tinham: ${jaTinham} · modelo sem foto de rosto: ${semFoto}`)
  if (DRY_RUN) { console.log('[DRY RUN] Nada foi gravado.'); return }
  console.log(`Gravadas ${inseridas.length} fotos. IDs (para desfazer):\n${inseridas.join(',')}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
