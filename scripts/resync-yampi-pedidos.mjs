// Reativa o webhook de sync do admin na Yampi e ressincroniza pedidos de um
// período, reproduzindo o payload que a Yampi enviaria.
//
// Contexto: o webhook 1754608 ("Just Runner - Admin Dashboard Sync") foi
// encontrado com active=false em 27/07/2026, e por isso nenhum pedido de
// 21/07 em diante chegou na tabela `orders` — o admin ficou mostrando metade
// das vendas do mês. A Yampi desativa webhook sozinha após falhas de entrega.
//
// O upsert é idempotente (onConflict store_id,external_id), então reprocessar
// um pedido já sincronizado é inofensivo.
//
// Uso:
//   node scripts/resync-yampi-pedidos.mjs --desde 2026-07-21 [--dry-run] [--sem-reativar]
import fs from 'node:fs'
import { createHmac } from 'node:crypto'

const DRY_RUN = process.argv.includes('--dry-run')
const SEM_REATIVAR = process.argv.includes('--sem-reativar')
const desdeIdx = process.argv.indexOf('--desde')
const DESDE = desdeIdx >= 0 ? process.argv[desdeIdx + 1] : '2026-07-21'

const WEBHOOK_ID = 1754608
const WEBHOOK_URL = 'https://justrunner.com.br/api/webhooks/yampi'
const WEBHOOK_NAME = 'Just Runner - Admin Dashboard Sync'
const WEBHOOK_EVENTS = ['order.created', 'order.status.updated', 'order.updated', 'order.paid']
const SKU_CATALOGO = /^(JR-|JROP-|JRC-)/

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

const headers = {
  'User-Token': env.YAMPI_API_TOKEN,
  'User-Secret-Key': env.YAMPI_SECRET_KEY,
  'Content-Type': 'application/json',
}
const base = `https://api.dooki.com.br/v2/${env.NEXT_PUBLIC_YAMPI_ALIAS}`

async function reativarWebhook() {
  const atual = await (await fetch(`${base}/webhooks/${WEBHOOK_ID}`, { headers })).json()
  const ativo = atual.data?.active
  console.log(`\nWebhook ${WEBHOOK_ID}: active=${ativo}`)
  if (ativo) { console.log('  já está ativo, nada a fazer'); return }
  if (DRY_RUN) { console.log('  [DRY RUN] reativaria'); return }

  // O PUT exige o payload completo: só {active:true} devolve 422 "Campo obrigatório".
  const res = await fetch(`${base}/webhooks/${WEBHOOK_ID}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ name: WEBHOOK_NAME, url: WEBHOOK_URL, events: WEBHOOK_EVENTS, active: true }),
  })
  if (!res.ok) { console.error(`  FALHOU reativar: ${res.status} ${(await res.text()).slice(0, 300)}`); return }
  const conf = await (await fetch(`${base}/webhooks/${WEBHOOK_ID}`, { headers })).json()
  console.log(`  reativado -> active=${conf.data?.active}`)
}

async function ressincronizar() {
  const res = await fetch(`${base}/orders?limit=60&include=items,customer,transactions,status&sort=-created_at`, { headers })
  const { data } = await res.json()

  const alvo = data.filter((o) => {
    const dia = (o.created_at?.date ?? '').slice(0, 10)
    if (dia < DESDE) return false
    return (o.items?.data ?? []).some((i) => SKU_CATALOGO.test(i.item_sku ?? ''))
  })

  console.log(`\nPedidos com SKU do catálogo desde ${DESDE}: ${alvo.length}`)

  let ok = 0, pulados = 0, falhou = 0
  for (const order of alvo) {
    const dia = (order.created_at?.date ?? '').slice(0, 10)
    const valor = Number(order.value_total ?? 0).toFixed(2)
    const rotulo = `${dia} #${order.id} R$${valor}`

    if (DRY_RUN) { console.log(`  [DRY RUN] ${rotulo}`); continue }

    const payload = JSON.stringify({ event: 'order.paid', resource: { data: order } })
    const sig = createHmac('sha256', env.YAMPI_WEBHOOK_SECRET).update(payload).digest('hex')
    const r = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-yampi-hmac-sha256': sig },
      body: payload,
    })
    const txt = await r.text()
    if (!r.ok) { falhou++; console.log(`  FALHOU  ${rotulo} -> ${r.status} ${txt.slice(0, 120)}`) }
    else if (txt.includes('"skipped":true')) { pulados++; console.log(`  pulado  ${rotulo} -> ${txt.slice(0, 90)}`) }
    else { ok++; console.log(`  ok      ${rotulo}`) }
  }

  if (!DRY_RUN) console.log(`\nSincronizados: ${ok}  |  Pulados: ${pulados}  |  Falhas: ${falhou}`)
}

if (!SEM_REATIVAR) await reativarWebhook()
await ressincronizar()
