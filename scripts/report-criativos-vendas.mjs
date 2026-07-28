// Relatório read-only: criativos que geraram venda no período, nas duas contas
// de anúncio da Just Runner.
//
// Cuidados que este script já embute (aprendidos na marra):
// 1. actions[]/action_values[] da Meta trazem MUITOS action_type sobrepostos
//    para a mesma conversão (purchase, omni_purchase, offsite_conversion.
//    fb_pixel_purchase...). Somar a lista multiplica o número. Usa-se UM tipo
//    canônico por métrica.
// 2. Consultas grandes viram relatório assíncrono: a API devolve report_run_id
//    em vez dos dados, e é preciso pollar até "Job Completed".
// 3. A atribuição da Meta pode dar crédito a mais de um anúncio pelo MESMO
//    pedido real. Por isso o total é cruzado com a tabela `orders` do Supabase
//    no fim.
//
// Uso: node scripts/report-criativos-vendas.mjs [YYYY-MM-DD] [YYYY-MM-DD]
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

const TOKEN = env.META_ACCESS_TOKEN
const SINCE = process.argv[2] ?? '2026-07-01'
const UNTIL = process.argv[3] ?? new Date().toISOString().slice(0, 10)

const CONTAS = [
  { nome: 'Conta 1 — CA 02 JUST RUNNER OFICIAL', id: env.META_AD_ACCOUNT_ID_1 },
  { nome: 'Conta 2 — CA JUST RUNNER', id: env.META_AD_ACCOUNT_ID_2 },
]

const FIELDS = [
  'ad_id', 'ad_name', 'adset_name', 'campaign_name',
  'spend', 'clicks', 'impressions', 'ctr', 'cpc',
  'actions', 'action_values',
].join(',')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url) {
  const res = await fetch(url)
  const json = await res.json()
  if (json.error) throw new Error(`${json.error.code}: ${json.error.message}`)
  return json
}

async function insights(accountId) {
  const url = `https://graph.facebook.com/v21.0/act_${accountId}/insights`
    + `?level=ad&time_range=${encodeURIComponent(JSON.stringify({ since: SINCE, until: UNTIL }))}`
    + `&fields=${FIELDS}&limit=500&access_token=${TOKEN}`

  let json = await getJson(url)

  // Relatório assíncrono: veio report_run_id em vez de data
  if (!json.data && json.report_run_id) {
    const runId = json.report_run_id
    process.stderr.write(`    (relatório assíncrono ${runId}, aguardando`)
    for (let i = 0; i < 60; i++) {
      await sleep(3000)
      const status = await getJson(`https://graph.facebook.com/v21.0/${runId}?access_token=${TOKEN}`)
      if (status.async_status === 'Job Completed') break
      if (status.async_status === 'Job Failed') throw new Error('relatório assíncrono falhou')
      process.stderr.write('.')
    }
    process.stderr.write(')\n')
    json = await getJson(`https://graph.facebook.com/v21.0/${runId}/insights?limit=500&access_token=${TOKEN}`)
  }

  // paginação
  const rows = json.data ?? []
  let next = json.paging?.next
  while (next) {
    const page = await getJson(next)
    rows.push(...(page.data ?? []))
    next = page.paging?.next
  }
  return rows
}

const canon = (row, campo, tipo) => {
  const hit = (row[campo] ?? []).find((a) => a.action_type === tipo)
  return hit ? Number(hit.value) : 0
}

const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

console.log(`\nCriativos com venda — ${SINCE} a ${UNTIL}\n${'='.repeat(78)}`)

let totalVendas = 0, totalReceita = 0, totalGasto = 0
const vencedores = []

for (const conta of CONTAS) {
  if (!conta.id) { console.log(`\n${conta.nome}: sem id configurado, pulando`); continue }
  process.stderr.write(`  buscando ${conta.nome}...\n`)
  let rows
  try { rows = await insights(conta.id) }
  catch (e) { console.log(`\n${conta.nome}: ERRO — ${e.message}`); continue }

  const gastoConta = rows.reduce((s, r) => s + Number(r.spend || 0), 0)
  totalGasto += gastoConta

  const comVenda = rows
    .map((r) => ({
      conta: conta.nome,
      ad: r.ad_name,
      adset: r.adset_name,
      campanha: r.campaign_name,
      gasto: Number(r.spend || 0),
      cliques: Number(r.clicks || 0),
      atc: canon(r, 'actions', 'add_to_cart'),
      checkout: canon(r, 'actions', 'initiate_checkout'),
      vendas: canon(r, 'actions', 'purchase'),
      receita: canon(r, 'action_values', 'purchase'),
    }))
    .filter((r) => r.vendas > 0)
    .sort((a, b) => b.receita - a.receita)

  console.log(`\n${conta.nome}`)
  console.log(`  anúncios com entrega: ${rows.length}  |  investido: ${brl(gastoConta)}`)

  if (comVenda.length === 0) {
    console.log('  nenhum criativo com venda atribuída no período')
    continue
  }

  for (const r of comVenda) {
    totalVendas += r.vendas
    totalReceita += r.receita
    vencedores.push(r)
    const roas = r.gasto > 0 ? (r.receita / r.gasto) : 0
    console.log(`\n  ${r.ad}`)
    console.log(`    campanha : ${r.campanha}`)
    console.log(`    conjunto : ${r.adset}`)
    console.log(`    ${r.vendas} venda(s)  ${brl(r.receita)}  |  gasto ${brl(r.gasto)}  |  ROAS ${roas.toFixed(2)}x`)
    console.log(`    funil    : ${r.cliques} cliques -> ${r.atc} ATC -> ${r.checkout} checkout -> ${r.vendas} venda`)
  }
}

console.log(`\n${'='.repeat(78)}`)
console.log(`TOTAL atribuído pela Meta: ${totalVendas} venda(s), ${brl(totalReceita)}`)
console.log(`Investido nas duas contas: ${brl(totalGasto)}`)
if (totalGasto > 0) console.log(`ROAS geral: ${(totalReceita / totalGasto).toFixed(2)}x`)
console.log(`Criativos distintos com venda: ${vencedores.length}`)
