// Cria na Yampi os brindes do quiz (07/10/2026): um por óculos de bônus, regra
// 'promocode' — só entram no pedido pelo cupom único que o quiz gera. A lista
// vem de src/lib/quiz/bonus.ts (SKU da versão [JR OP]). Idempotente: procura
// pelo nome ou pelo SKU+regra antes de criar (a Yampi troca o "—" do nome).
// `start_at` aceita só data (com hora = 422). Brinde ligado a cupom não apaga.
// Uso: node scripts/_quiz-cria-brindes.mjs [--aplicar]
import { readFileSync } from 'node:fs'
process.loadEnvFile('.env.local')
const e = process.env
const H = { 'User-Token': e.YAMPI_API_TOKEN, 'User-Secret-Key': e.YAMPI_SECRET_KEY, Accept: 'application/json', 'Content-Type': 'application/json' }
const BASE = `https://api.dooki.com.br/v2/${e.NEXT_PUBLIC_YAMPI_ALIAS}/pricing/freebies`
const aplicar = process.argv.includes('--aplicar')

const fonte = readFileSync('src/lib/quiz/bonus.ts', 'utf8')
const BONUS = [...fonte.matchAll(/nome: '([^']+)',\s*yampiSku: (\d+)/g)].map(m => ({ nome: m[1], sku: Number(m[2]) }))
if (BONUS.length === 0) throw new Error('nenhum bônus lido de bonus.ts')
console.log(`${BONUS.length} bônus em bonus.ts`)

const existentes = (await (await fetch(`${BASE}?limit=100`, { headers: H })).json()).data ?? []
const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
const out = []
for (const b of BONUS) {
  const name = `QUIZ BÔNUS — ${b.nome}`
  const ja = existentes.find(f => f.name === name || f.resource_id === b.sku && f.rule === 'promocode')
  if (ja) { console.log(`já existe  ${ja.id}  ${name}`); out.push({ ...b, freebieId: ja.id }); continue }
  if (!aplicar) { console.log(`criaria    ${name} (sku ${b.sku})`); continue }
  const r = await fetch(BASE, { method: 'POST', headers: H, body: JSON.stringify({ name, active: true, start_at: hoje, resource_type: 'sku', resource_id: b.sku, rule: 'promocode' }) })
  const j = await r.json()
  console.log(`POST ${r.status}  ${j.data?.id ?? JSON.stringify(j).slice(0, 200)}  ${name}`)
  if (j.data?.id) out.push({ ...b, freebieId: j.data.id })
}
// Brindes do quiz que saíram da lista: remove (só os do quiz — nome começa com QUIZ).
const manter = new Set(BONUS.map(b => b.sku))
for (const f of existentes.filter(f => /^QUIZ/.test(f.name) && f.rule === 'promocode' && !manter.has(f.resource_id))) {
  if (!aplicar) { console.log(`removeria ${f.id}  ${f.name}`); continue }
  const r = await fetch(`${BASE}/${f.id}`, { method: 'DELETE', headers: H })
  console.log(`DELETE ${r.status}  ${f.id}  ${f.name}`)
}
console.log(JSON.stringify(out))
