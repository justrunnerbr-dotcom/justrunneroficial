// Oferta Exclusiva (26/10/2026, banners "Seu estilo por R$147,90 · modelos
// selecionados"): mesmo padrão de scripts/create-oferta-progressiva.ts — cópia
// das variações escolhidas pelo dono pra dentro da coleção "oferta-exclusiva",
// produto <slug>-oe, SKU JROE- e preço fixo R$147,90 (sem desconto por
// quantidade). Idempotente: produto -oe que já existe só ganha as variações que
// faltam. Depois: scripts/sync-yampi-oferta-exclusiva.ts e o catálogo do tema.
//
//   node --experimental-strip-types scripts/create-oferta-exclusiva.ts [--aplicar]
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
const OE_PRICE = 147.9
const APLICAR = process.argv.includes('--aplicar')

// Lista do dono: Radar armação preta e branca, Plantaris preta/verde/azul, Flak
// todas menos Cooper, Minute armação preta, Eye Jacket preta (Redux e normal),
// HSTN armação preta. `so` filtra as variações pelo nome (Eye Jacket e Redux
// têm várias armações no mesmo produto).
const ESCOLHA: { slug: string; so?: RegExp }[] = [
  { slug: 'radar-ev-preta' }, { slug: 'radar-ev-branca' },
  { slug: 'plantaris-preta' }, { slug: 'plantaris-verde' }, { slug: 'plantaris-azul-escuro' },
  { slug: 'flak-preta' }, { slug: 'flak-branca' },
  { slug: 'minute-preta' },
  { slug: 'eye-jacket', so: /^Preta · / }, { slug: 'eye-jacket-redux', so: /^Preta · / },
  { slug: 'hstn-preta' },
]

async function main() {
  let { data: col } = await supabase.from('collections').select('id').eq('slug', 'oferta-exclusiva').maybeSingle()
  if (!col) {
    const { data: ult } = await supabase.from('collections').select('position').order('position', { ascending: false }).limit(1).single()
    if (!APLICAR) { console.log('[simulação] criaria a coleção oferta-exclusiva'); col = { id: 'SIMULACAO' } }
    else {
      const { data, error } = await supabase.from('collections').insert({
        slug: 'oferta-exclusiva', name: 'Oferta Exclusiva',
        description: 'Seu estilo por R$147,90. Modelos selecionados.', position: (ult?.position ?? 0) + 1,
      }).select('id').single()
      if (error || !data) throw new Error(`coleção: ${error?.message}`)
      col = data
      console.log('coleção oferta-exclusiva criada', data.id)
    }
  }

  let nProd = 0, nVar = 0, nImg = 0
  const skus = new Set<string>()
  for (const e of ESCOLHA) {
    const { data: p } = await supabase.from('products').select('id,slug,name,description,variants(*),images(*)').eq('slug', e.slug).eq('status', 'active').single()
    if (!p) { console.error('NÃO ACHEI', e.slug); continue }
    const variantes = (p.variants as any[]).filter((v) => !e.so || e.so.test(v.name)).sort((a, b) => a.position - b.position)

    const novoSlug = `${p.slug}-oe`
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
      // SKU da Yampi vai até 40 caracteres e ela corta calada: corta aqui, igual.
      const sku = ('JROE-' + String(v.sku).replace(/^JR-/, '')).slice(0, 40)
      if (skus.has(sku)) throw new Error(`SKU repetido depois do corte: ${sku}`)
      skus.add(sku)
      if (jaTem.has(sku)) continue
      if (!APLICAR) { console.log(`[simulação] ${novoSlug} · ${v.name} → ${sku} R$${OE_PRICE}`); nVar++; continue }
      const { data: nv, error } = await supabase.from('variants').insert({
        product_id: gemeo.id, name: v.name, price: OE_PRICE, compare_price: null, sku, stock: v.stock, position: v.position,
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
  console.log(`\n${APLICAR ? 'Feito' : 'Simulação'}: produtos ${nProd}, variações ${nVar}, fotos ${nImg}`)
}

main()
