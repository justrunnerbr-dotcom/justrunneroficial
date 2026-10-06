// Recupera pedidos da Yampi pra tabela `orders` com o mesmo código do webhook
// (upsertYampiOrder), sem disparar evento da Meta — venda antiga já foi
// contada na época. Idempotente (upsert por store_id,external_id).
//
// Uso: npx tsx --env-file=.env.local scripts/backfill-pedidos-yampi.mts --desde 2026-08-13 [--dry-run]
import { createClient } from '@supabase/supabase-js'
import { upsertYampiOrder } from '@/lib/yampi/sync'

const DRY_RUN = process.argv.includes('--dry-run')
const i = process.argv.indexOf('--desde')
const DESDE = i >= 0 ? process.argv[i + 1] : ''
if (!/^\d{4}-\d{2}-\d{2}$/.test(DESDE)) throw new Error('Informe --desde AAAA-MM-DD')

const alias = process.env.NEXT_PUBLIC_YAMPI_ALIAS!
const headers = { 'User-Token': process.env.YAMPI_API_TOKEN!, 'User-Secret-Key': process.env.YAMPI_SECRET_KEY! }
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const pedidos: any[] = []
for (let page = 1; page <= 50; page++) {
  const res = await fetch(`https://api.dooki.com.br/v2/${alias}/orders?limit=100&include=items,customer,transactions,status,shipping_address&orderBy=id&sortedBy=desc&page=${page}`, { headers })
  if (!res.ok) throw new Error(`Yampi orders page ${page}: ${res.status}`)
  const { data } = await res.json()
  pedidos.push(...data.filter((o: any) => (o.created_at?.date ?? '') >= DESDE))
  if (data.length === 0 || (data.at(-1).created_at?.date ?? '') < DESDE) break
}
console.log(`Pedidos na Yampi desde ${DESDE}: ${pedidos.length}`)
if (pedidos.length === 0) throw new Error('Nenhum pedido encontrado — nada foi verificado.')

let ok = 0, pulados = 0, falhas = 0
for (const o of pedidos) {
  if (DRY_RUN) continue
  const r = await upsertYampiOrder(db, { data: o } as any, { fireCapiEvents: false })
  if (!r.ok) { falhas++; console.log(`FALHA ${o.id}: ${r.error}`) }
  else if (r.skipped) pulados++
  else ok++
}
console.log(DRY_RUN ? '[DRY RUN] nada gravado' : `Gravados: ${ok} · fora do site (pulados): ${pulados} · falhas: ${falhas}`)
