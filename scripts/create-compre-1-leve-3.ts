// Compre 1 Leve 3 por R$297 (10/11/2026, Black November): mesmo padrão de
// scripts/create-oferta-exclusiva.ts — cópia das variações escolhidas pra dentro
// da coleção "compre-1-leve-3", produto <slug>-l3, SKU JRL3- e preço R$297 cada.
// A Yampi cobra 3 por R$297 pela regra "leve 3 pague 1" da categoria (painel).
// Escolha do dono: todo óculos com custo cadastrado até R$35 do mesmo modelo
// (128 variações; ficaram fora Ellipse, Holbrook, Soto, Sutro, Straight Jacket,
// os sem custo e os de casamento duvidoso). Idempotente.
// Depois: scripts/sync-yampi-compre-1-leve-3.ts e o catálogo do tema.
//
//   node --experimental-strip-types scripts/create-compre-1-leve-3.ts [--aplicar]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]
    }),
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const PRECO = 297
const APLICAR = process.argv.includes('--aplicar')

const ESCOLHA = new Set<string>([
  'JR-DARTBOARD-DEGRADE', 'JR-DARTBOARD-PRETA', 'JR-DARTBOARD-ROSA', 'JR-DARTBOARD-VR28',
  'JR-EYE_JACKET-CINZA_LENTE_AZUL', 'JR-EYE_JACKET-CINZA_LENTE_ESPELHADA', 'JR-EYE_JACKET-CINZA_LENTE_GOLD',
  'JR-EYE_JACKET-CINZA_LENTE_PRETA', 'JR-EYE_JACKET-CINZA_LENTE_RUBY', 'JR-EYE_JACKET-CINZA_LENTE_VR28',
  'JR-EYE_JACKET-CREME_LENTE_PRETA', 'JR-EYE_JACKET-LARANJA_LENTE_ESPELHADA',
  'JR-EYE_JACKET-LARANJA_LENTE_RUBY', 'JR-EYE_JACKET-PRETA_LENTE_ESPELHADA', 'JR-EYE_JACKET-PRETA_LENTE_PRETA',
  'JR-EYE_JACKET-PRETA_LENTE_ROXA', 'JR-EYE_JACKET-PRETA_LENTE_TANZANITE',
  'JR-EYE_JACKET-ROXA_LENTE_DARK_RUBY', 'JR-EYE_JACKET-ROXA_LENTE_ESPELHADA', 'JR-EYE_JACKET-ROXA_LENTE_PRETA',
  'JR-EYE_JACKET-ROXA_LENTE_ROXA', 'JR-EYE_JACKET-ROXA_LENTE_RUBY', 'JR-EYE_JACKET_BRAIN_DEAD-LENTE_AZUL',
  'JR-EYE_JACKET_BRAIN_DEAD-LENTE_DARK_RUBY', 'JR-EYE_JACKET_BRAIN_DEAD-LENTE_ESPELHADA',
  'JR-EYE_JACKET_BRAIN_DEAD-LENTE_GOLD', 'JR-EYE_JACKET_BRAIN_DEAD-LENTE_PRETA',
  'JR-EYE_JACKET_BRAIN_DEAD-LENTE_ROXA', 'JR-EYE_JACKET_BRAIN_DEAD-LENTE_RUBY',
  'JR-EYE_JACKET_BRAIN_DEAD-LENTE_TANZANITE', 'JR-EYE_JACKET_REDUX-BEGE_LENTE_GOLD',
  'JR-EYE_JACKET_REDUX-BRANCA_LENTE_PRETA', 'JR-EYE_JACKET_REDUX-BRANCA_LENTE_TANZANITE',
  'JR-EYE_JACKET_REDUX-CINZA_LENTE_AZUL', 'JR-EYE_JACKET_REDUX-CINZA_LENTE_MARROM',
  'JR-EYE_JACKET_REDUX-CINZA_LENTE_PRETA', 'JR-EYE_JACKET_REDUX-PRETA_LENTE_AZUL',
  'JR-EYE_JACKET_REDUX-PRETA_LENTE_GOLD', 'JR-EYE_JACKET_REDUX-PRETA_LENTE_PRETA',
  'JR-EYE_JACKET_REDUX-PRETA_LENTE_ROSA', 'JR-EYE_JACKET_REDUX-PRETA_LENTE_TANZANITE',
  'JR-EYE_JACKET_REDUX-PRETA_LENTE_VR28', 'JR-FLAK_BRANCA-LENTE_ESPELHADA', 'JR-FLAK_BRANCA-LENTE_PRIZM',
  'JR-FLAK_BRANCA-LENTE_TANZANITE', 'JR-FLAK_COOPER-UNICO', 'JR-FLAK_PRETA-LENTE_ESPELHADA',
  'JR-FLAK_PRETA-LENTE_PRETA', 'JR-FLAK_PRETA-LENTE_PRIZM', 'JR-FLAK_PRETA-LENTE_RUBY',
  'JR-FLAK_PRETA-LENTE_TANZANITE', 'JR-HALF_JACKET-FULL_BLACK', 'JR-HSTN_CINZA-LENTE_ESPELHADA',
  'JR-HSTN_CINZA-LENTE_GOLD', 'JR-HSTN_CINZA-LENTE_ROXA', 'JR-HSTN_CINZA-LENTE_RUBY',
  'JR-HSTN_PRETA-LENTE_AZUL', 'JR-HSTN_PRETA-LENTE_DARK_RUBY', 'JR-HSTN_PRETA-LENTE_ESPELHADA',
  'JR-HSTN_PRETA-LENTE_GOLD', 'JR-HSTN_PRETA-LENTE_PRETA', 'JR-HSTN_PRETA-LENTE_ROXA',
  'JR-HSTN_PRETA-LENTE_RUBY', 'JR-HSTN_PRETA-LENTE_TANZANITE', 'JR-MINUTE_AZUL-LENTE_ESPELHADA',
  'JR-MINUTE_AZUL-LENTE_PRETA', 'JR-MINUTE_BRANCA-LENTE_DARK_RUBY', 'JR-MINUTE_BRANCA-LENTE_LOW_LIGHT',
  'JR-MINUTE_BRANCA-LENTE_PRETA', 'JR-MINUTE_BRANCA-LENTE_RUBY', 'JR-MINUTE_CINZA-LENTE_DARK_RUBY',
  'JR-MINUTE_CINZA-LENTE_ESPELHADA', 'JR-MINUTE_CINZA-LENTE_PRETA', 'JR-MINUTE_COOPER-LENTE_RUBY',
  'JR-MINUTE_CRISTAL-UNICO', 'JR-MINUTE_PRETA-LENTE_AZUL', 'JR-MINUTE_PRETA-LENTE_DARK_RUBY',
  'JR-MINUTE_PRETA-LENTE_ESPELHADA', 'JR-MINUTE_PRETA-LENTE_GOLD', 'JR-MINUTE_PRETA-LENTE_PRETA',
  'JR-MINUTE_PRETA-LENTE_RUBY', 'JR-MINUTE_PRETA-LENTE_TANZANITE', 'JR-MINUTE_PRETA-LENTE_VR28',
  'JR-MINUTE_VERDE-LENTE_PRETA', 'JR-MINUTE_VERDE-LENTE_TORCH', 'JR-MONSTER_DOG_ALL_BLACK-UNICO',
  'JR-MONSTER_DOG_MARROM-LENTE_VR28', 'JR-PLANTARIS_CINZA-LENTE_AZUL', 'JR-PLANTARIS_CINZA-LENTE_GOLD',
  'JR-PLANTARIS_CINZA-LENTE_PRETA', 'JR-PLANTARIS_CINZA-LENTE_RUBY', 'JR-PLANTARIS_CINZA-LENTE_VR28',
  'JR-PLANTARIS_MATTE_BONE-LENTE_DOURADA', 'JR-PLANTARIS_PRETA-UNICO',
  'JR-PLANTARIS_PRETA_HASTE_TRANSPARENTE-UNICO', 'JR-PLANTARIS_SQUARED_PRETA-UNICO',
  'JR-PLANTARIS_STONEWASH-UNICO', 'JR-RADARLOCK_PATH_PRETA-LENTE_PRETA', 'JR-RADARLOCK_PATH_SILVER-ESPELHADA',
  'JR-RADAR_EV_BRANCA-LENTE_GOLD', 'JR-RADAR_EV_BRANCA-LENTE_TANZANITE', 'JR-RADAR_EV_BRONZE-LENTE_VR28',
  'JR-RADAR_EV_BRONZE-LENTE_VR29', 'JR-RADAR_EV_COOPER-LENTE_GOLD', 'JR-RADAR_EV_COOPER-LENTE_PRETA',
  'JR-RADAR_EV_COOPER-LENTE_VR28', 'JR-RADAR_EV_LARANJA-LENTE_ESPELHADA', 'JR-RADAR_EV_LARANJA-LENTE_PRETA',
  'JR-RADAR_EV_LARANJA-LENTE_RUBY', 'JR-RADAR_EV_NEON-LENTE_PRETA', 'JR-RADAR_EV_PIET-LENTE_ESPELHADA',
  'JR-RADAR_EV_PIET-LENTE_GOLD', 'JR-RADAR_EV_PIET-LENTE_GOLD_CAFE', 'JR-RADAR_EV_PIET-LENTE_PRETA',
  'JR-RADAR_EV_PIET-LENTE_TORCH', 'JR-RADAR_EV_PRETA-LENTE_AZUL', 'JR-RADAR_EV_PRETA-LENTE_DARK_RUBY',
  'JR-RADAR_EV_PRETA-LENTE_ESPELHADA', 'JR-RADAR_EV_PRETA-LENTE_PRETA', 'JR-RADAR_EV_PRETA-LENTE_ROXA',
  'JR-RADAR_EV_PRETA-LENTE_RUBY', 'JR-RADAR_EV_PRETA-LENTE_SAPPHIRE', 'JR-RADAR_EV_PRETA-LENTE_TANZANITE',
  'JR-RADAR_EV_THIEVES-ESPELHADA_KV', 'JR-RADAR_EV_THIEVES-LENTE_ESPELHADA', 'JR-RADAR_EV_THIEVES-LENTE_PRETA',
  'JR-RADAR_EV_THIEVES-LENTE_RUBY', 'JR-RADAR_EV_THIEVES_BRANCA-ESPELHADA',
])

async function main() {
  let { data: col } = await supabase.from('collections').select('id').eq('slug', 'compre-1-leve-3').maybeSingle()
  if (!col) {
    const { data: ult } = await supabase.from('collections').select('position').order('position', { ascending: false }).limit(1).single()
    if (!APLICAR) { console.log('[simulação] criaria a coleção compre-1-leve-3'); col = { id: 'SIMULACAO' } }
    else {
      const { data, error } = await supabase.from('collections').insert({
        slug: 'compre-1-leve-3', name: 'Compre 1 Leve 3',
        description: '3 óculos por R$297. Modelos selecionados.', position: (ult?.position ?? 0) + 1,
      }).select('id').single()
      if (error || !data) throw new Error(`coleção: ${error?.message}`)
      col = data
      console.log('coleção compre-1-leve-3 criada', data.id)
    }
  }

  const { data: todos } = await supabase.from('products').select('id,slug,name,description,variants(*),images(*)').eq('status', 'active')
  const fontes = (todos as any[]).filter((p) => (p.variants as any[]).some((v) => ESCOLHA.has(v.sku)))
  let nProd = 0, nVar = 0, nImg = 0
  const vistos = new Set<string>(), skus = new Set<string>()
  for (const p of fontes) {
    const variantes = (p.variants as any[]).filter((v) => ESCOLHA.has(v.sku)).sort((a, b) => a.position - b.position)
    const novoSlug = `${p.slug}-l3`
    let { data: gemeo } = await supabase.from('products').select('id,variants(sku)').eq('slug', novoSlug).maybeSingle()
    if (!gemeo) {
      if (!APLICAR) gemeo = { id: 'SIMULACAO', variants: [] }
      else {
        const { data, error } = await supabase.from('products').insert({
          slug: novoSlug, name: p.name, description: p.description, collection_id: col!.id, status: 'active', featured: false,
        }).select('id').single()
        if (error || !data) { console.error('FALHA produto', novoSlug, error?.message); continue }
        gemeo = { id: data.id, variants: [] }
      }
      nProd++
    }
    const jaTem = new Set((gemeo.variants as { sku: string }[]).map((v) => v.sku))
    const mapa = new Map<string, string>()
    for (const v of variantes) {
      vistos.add(v.sku)
      // SKU da Yampi vai até 40 caracteres e ela corta calada: corta aqui, igual.
      const sku = ('JRL3-' + String(v.sku).replace(/^JR-/, '')).slice(0, 40)
      if (skus.has(sku)) throw new Error(`SKU repetido depois do corte: ${sku}`)
      skus.add(sku)
      if (jaTem.has(sku)) continue
      if (!APLICAR) { nVar++; continue }
      const { data: nv, error } = await supabase.from('variants').insert({
        product_id: gemeo.id, name: v.name, price: PRECO, compare_price: null, sku, stock: v.stock, position: v.position,
      }).select('id').single()
      if (error || !nv) { console.error('FALHA variação', sku, error?.message); continue }
      mapa.set(v.id, nv.id); nVar++
    }
    const imgs = (p.images as any[]).filter((i) => i.url && mapa.has(i.variant_id))
      .map((i) => ({ product_id: gemeo!.id, variant_id: mapa.get(i.variant_id), url: i.url, alt: i.alt, position: i.position }))
    if (APLICAR && imgs.length) {
      const { error } = await supabase.from('images').insert(imgs)
      if (error) console.error('FALHA fotos', novoSlug, error.message); else nImg += imgs.length
    }
    console.log(`${APLICAR ? 'OK' : '..'} ${p.slug} → ${novoSlug}: ${variantes.length} variações${APLICAR ? `, ${imgs.length} fotos` : ''}`)
  }
  const faltou = [...ESCOLHA].filter((s) => !vistos.has(s))
  if (faltou.length) console.error('NÃO ACHEI', faltou)
  console.log(`\n${APLICAR ? 'Feito' : 'Simulação'}: escolha ${ESCOLHA.size}, achadas ${vistos.size}, produtos novos ${nProd}, variações novas ${nVar}, fotos ${nImg}`)
}

main()
