import { getAdminSupabase } from '@/lib/admin-client'
import { getProductCosts, getSuppliers, matchProductCostRecord } from '@/lib/admin/product-costs'
import { APPROVED_STATUSES } from '@/lib/admin/financial-breakdown'
import { normalizePhone } from '@/lib/yampi/sync'

/**
 * As duas listas que a operação usa todo dia:
 *   • fornecedores — o que comprar de cada um, agrupado
 *   • logística    — cliente, e-mail, itens e a foto de cada produto
 *
 * Roda no servidor (cron da Vercel) justamente pra não depender de nenhuma
 * máquina ligada. Gera SEMPRE um dia fechado: o cron dispara de madrugada e
 * pede o dia anterior, então nunca existe lista parcial.
 */

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'

/** Dia anterior em horário de Brasília, no formato AAAA-MM-DD. */
export function diaAnteriorBRT(agora = new Date()): string {
  const brt = new Date(agora.getTime() - 3 * 3600e3)
  brt.setUTCDate(brt.getUTCDate() - 1)
  return brt.toISOString().slice(0, 10)
}

// ── comparação difusa, a mesma que casa custo em product-costs.ts ────────────
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const tokens = (s: string) => new Set(norm(s).split(' ').filter(Boolean))
// O mesmo nome escrito com espaçamento diferente: o pedido vem "Dart Board Preta
// Lente VR28" e o catálogo tem "Dartboard Preta Lente VR28". O Jaccard compara
// `dart`+`board` contra `dartboard`, não casa, e cai para 50% — empatado com um
// produto errado ("Minute Preta Lente VR28"), então o item saía sem foto.
// Colando os espaços os dois viram a mesma string e o casamento é exato.
const colado = (s: string) => norm(s).replace(/ /g, '')
function jaccard(a: Set<string>, b: Set<string>): number {
  const i = [...a].filter(x => b.has(x)).length
  const u = new Set([...a, ...b]).size
  return u === 0 ? 0 : i / u
}

const limparRotulo = (s: string) => s.replace(/^\[[^\]]*\]\s*/, '').replace(/\s+/g, ' ').trim()

export interface ListasDoDia {
  dia:          string   // AAAA-MM-DD
  dataBR:       string   // DD/MM/AAAA
  pedidos:      number
  unidades:     number
  fornecedores: string   // texto pronto
  logistica:    string   // texto pronto
  semFoto:      number
  motoboy:      string   // texto pronto
  pedidosMotoboy: number
  motoboyErro:  string | null
}

// Opção de frete criada no checkout da Yampi em 09/2026. O nome do frete e as
// observações que a equipe escreve no pedido não são gravados no Supabase, então
// vêm da API da Yampi pelo dia do pedido.
const FRETE_MOTOBOY = /motoboy/i

interface PedidoYampi { numero: string; servico: string; endereco: string; uf: string; observacoes: string[] }

async function dadosDosPedidosYampi(dia: string): Promise<Map<string, PedidoYampi>> {
  const alias = process.env.NEXT_PUBLIC_YAMPI_ALIAS
  const token = process.env.YAMPI_API_TOKEN
  const secretKey = process.env.YAMPI_SECRET_KEY
  if (!alias || !token || !secretKey) throw new Error('credenciais da Yampi faltando')

  const headers = { 'User-Token': token, 'User-Secret-Key': secretKey, Accept: 'application/json' }
  const porId = new Map<string, PedidoYampi>()
  const comObservacao: string[] = []
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`https://api.dooki.com.br/v2/${alias}/orders?${new URLSearchParams({
      date: `created_at:${dia}|${dia}`, limit: '100', page: String(page),
    })}`, { headers, cache: 'no-store' })
    if (!res.ok) throw new Error(`Yampi respondeu ${res.status}`)

    const json = await res.json() as {
      data?: Array<{
        id: number; number?: number | string; shipment_service?: string | null; total_comments?: number
        shipping_address?: { data?: { full_address?: string; city?: string; uf?: string; zip_code?: string } }
      }>
      meta?: { pagination?: { total_pages?: number } }
    }
    for (const o of json.data ?? []) {
      const a = o.shipping_address?.data ?? {}
      porId.set(String(o.id), {
        numero:   String(o.number ?? o.id),
        servico:  o.shipment_service ?? '',
        endereco: [a.full_address, [a.city, a.uf].filter(Boolean).join('/'), a.zip_code && `CEP ${a.zip_code}`]
          .filter(Boolean).join(' — '),
        uf:       (a.uf ?? '').toUpperCase(),
        observacoes: [],
      })
      if (o.total_comments) comObservacao.push(String(o.id))
    }
    if (page >= (json.meta?.pagination?.total_pages ?? 1)) break
  }

  // A listagem não traz o texto das observações (nem com include=comments), só a
  // contagem — então busca uma a uma, e são poucas por dia.
  await Promise.all(comObservacao.map(async id => {
    const p = porId.get(id)!
    try {
      const res = await fetch(`https://api.dooki.com.br/v2/${alias}/orders/${id}/comments`, { headers, cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const json = await res.json() as { data?: Array<{ comments?: string }> }
      p.observacoes = (json.data ?? []).map(c => (c.comments ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    } catch {
      p.observacoes = ['(não foi possível ler a observação na Yampi)']
    }
  }))
  return porId
}

export async function gerarListasDoDia(dia: string): Promise<ListasDoDia> {
  const db = getAdminSupabase()
  const ini = `${dia}T00:00:00-03:00`
  const fim = new Date(new Date(ini).getTime() + 86_400_000).toISOString()
  const [ano, mes, d] = dia.split('-')
  const dataBR = `${d}/${mes}/${ano}`

  const { data: pedidos } = await db.from('orders')
    .select('id, external_id, total, customer_snapshot')
    .eq('store_id', STORE_ID)
    .in('status', APPROVED_STATUSES)
    .gte('created_at', ini).lt('created_at', fim)
    .order('created_at')

  const lista = pedidos ?? []
  if (!lista.length) {
    const vazio = (t: string) => `${t}\n\nNenhum pedido pago neste dia.\n`
    return {
      dia, dataBR, pedidos: 0, unidades: 0, semFoto: 0,
      fornecedores: vazio(`PEDIDOS DE ${dataBR} — Just Runner`),
      logistica:    vazio(`*PEDIDOS ${d}/${mes} - JUST RUNNER*`),
      motoboy:      vazio(`*MOTOBOY ${d}/${mes} - JUST RUNNER*`),
      pedidosMotoboy: 0, motoboyErro: null,
    }
  }

  // itens em lotes — `in()` com muitos ids estoura o tamanho da URL
  const itens: Array<{ order_id: string; product_title: string; variant_title: string | null; sku: string | null; quantity: number }> = []
  for (let i = 0; i < lista.length; i += 200) {
    const { data } = await db.from('order_items')
      .select('order_id, product_title, variant_title, sku, quantity')
      .in('order_id', lista.slice(i, i + 200).map(o => o.id))
    itens.push(...(data ?? []))
  }

  const [custos, fornecedoresRaw] = await Promise.all([getProductCosts(), getSuppliers()])
  const nomeFornecedor = Object.fromEntries(fornecedoresRaw.map(s => [s.id, s.name]))

  // ── catálogo de fotos, indexado por "produto + variante" ──────────────────
  // Casar por SKU não funciona: order_items traz o SKU da Yampi
  // ("JHFOP-PENNY175-CARBONLENTEPRETA") e variants traz o do catálogo
  // ("JHFOP-PLANTARIS_PRETA_LENTE_PRETA"). Convenções diferentes.
  const [{ data: produtos }, { data: variantes }, { data: imagens }] = await Promise.all([
    db.from('products').select('id, name'),
    db.from('variants').select('id, name, product_id'),
    db.from('images').select('variant_id, product_id, url').order('position'),
  ])
  const nomeProduto = Object.fromEntries((produtos ?? []).map(p => [p.id, p.name]))
  const fotoVariante: Record<string, string> = {}
  const fotoProduto: Record<string, string> = {}
  for (const im of imagens ?? []) {
    if (im.variant_id && !fotoVariante[im.variant_id]) fotoVariante[im.variant_id] = im.url
    if (im.product_id && !fotoProduto[im.product_id]) fotoProduto[im.product_id] = im.url
  }
  const catalogo = (variantes ?? []).map(v => {
    const chave = `${nomeProduto[v.product_id] ?? ''} ${v.name ?? ''}`
    return {
      toks:   tokens(chave),
      colado: colado(chave),
      url:    fotoVariante[v.id] ?? fotoProduto[v.product_id] ?? null,
    }
  }).filter((x): x is { toks: Set<string>; colado: string; url: string } => !!x.url)

  function fotoDe(rotulo: string): string | null {
    const alvo = tokens(rotulo)
    const alvoColado = colado(rotulo)
    let melhor = 0, url: string | null = null
    for (const c of catalogo) {
      const s = c.colado === alvoColado ? 1 : jaccard(alvo, c.toks)
      if (s > melhor) { melhor = s; url = c.url }
    }
    // abaixo de 60% é melhor não mandar foto do que mandar a errada pra logística
    return melhor >= 0.6 ? url : null
  }

  // ── lista dos fornecedores ────────────────────────────────────────────────
  const porFornecedor: Record<string, Record<string, { rotulo: string; sku: string | null; qtd: number; custo: number | null }>> = {}
  let unidades = 0
  for (const it of itens) {
    const rotulo = limparRotulo(it.variant_title || it.product_title || '?')
    // O título vem com [SO]/[OP]/[BUMP] na frente. `matchProductCostRecord` só
    // tira o [SO], então um order bump não achava o próprio custo e caía em
    // "SEM CUSTO CADASTRADO" — limpar antes resolve sem mexer no casamento que
    // o admin usa.
    const c = matchProductCostRecord(limparRotulo(it.product_title), custos)
    // Fornecedor = quem tem o menor custo cadastrado para a peça (o casamento já
    // escolhe o menor). Desde 01/10/2026 a tabela inteira do Yuri está no banco,
    // então não existe mais preço de fornecedor fora de `product_costs`.
    const forn = c?.supplier_id ? (nomeFornecedor[c.supplier_id] ?? 'FORNECEDOR NÃO IDENTIFICADO') : 'SEM CUSTO CADASTRADO'
    const custo = c?.cost ?? null

    porFornecedor[forn] ??= {}
    const k = `${rotulo}|||${it.sku ?? ''}`
    porFornecedor[forn][k] ??= { rotulo, sku: it.sku, qtd: 0, custo }
    porFornecedor[forn][k].qtd += Number(it.quantity || 0)
    unidades += Number(it.quantity || 0)
  }

  const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const receita = lista.reduce((s, o) => s + Number(o.total ?? 0), 0)

  const F: string[] = [`PEDIDOS DE ${dataBR} — Just Runner`,
    `${lista.length} pedidos pagos · ${unidades} unidades · ${brl(receita)}`]

  const ordem = Object.entries(porFornecedor).sort((x, y) =>
    Object.values(y[1]).reduce((s, v) => s + v.qtd, 0) - Object.values(x[1]).reduce((s, v) => s + v.qtd, 0))

  for (const [forn, vars] of ordem) {
    const l = Object.values(vars).sort((p, q) => q.qtd - p.qtd || p.rotulo.localeCompare(q.rotulo))
    const un = l.reduce((s, v) => s + v.qtd, 0)
    const custoTotal = l.reduce((s, v) => s + (v.custo ?? 0) * v.qtd, 0)
    F.push('', '─'.repeat(58))
    F.push(`PEDIDOS DE ${dataBR} — ${forn}`)
    F.push(`${un} ${un === 1 ? 'unidade' : 'unidades'}${custoTotal ? ` · custo ${brl(custoTotal)}` : ''}`)
    F.push('')
    for (const v of l) F.push(`${String(v.qtd).padStart(2)}x  ${v.rotulo}${v.sku ? `  [${v.sku}]` : ''}`)
  }

  // ── frete e observações de cada pedido, da Yampi ─────────────────────────
  // Se a Yampi falhar, as listas avisam em vez de parecer um dia sem pedido de
  // motoboy e sem observação.
  let yampi = new Map<string, PedidoYampi>()
  let motoboyErro: string | null = null
  try {
    yampi = await dadosDosPedidosYampi(dia)
  } catch (err) {
    motoboyErro = err instanceof Error ? err.message : 'erro'
  }
  const ehMotoboy = (o: { external_id: string | null }) =>
    FRETE_MOTOBOY.test(yampi.get(String(o.external_id))?.servico ?? '')
  const doMotoboy = lista.filter(ehMotoboy)
  const demais = lista.filter(o => !ehMotoboy(o))
  const whatsappDe = (snapshot: unknown) => {
    const tel = normalizePhone((snapshot as { phone?: Parameters<typeof normalizePhone>[0] } | null)?.phone)
    return tel ? `WhatsApp: +${tel} — https://wa.me/${tel}` : 'WhatsApp: (sem telefone)'
  }

  // ── lista da logística ────────────────────────────────────────────────────
  // Pedido de motoboy continua aqui, mas sempre no topo, num bloco próprio.
  const L: string[] = [`*PEDIDOS ${d}/${mes} - JUST RUNNER*`, '']
  if (motoboyErro) L.push(`⚠️ A CONSULTA NA YAMPI FALHOU (${motoboyErro}): envio motoboy não separado e observações não incluídas`, '')
  let semFoto = 0
  const blocoLogistica = (o: typeof lista[number], motoboy: boolean) => {
    const snap = (o.customer_snapshot ?? {}) as Record<string, string | undefined>
    const nome = snap.name || [snap.first_name, snap.last_name].filter(Boolean).join(' ') || '(sem nome)'
    if (motoboy) L.push('🛵 ENVIO MOTOBOY')
    L.push(nome)
    if (snap.email) L.push(snap.email)
    if (motoboy) L.push(whatsappDe(o.customer_snapshot))
    for (const obs of yampi.get(String(o.external_id))?.observacoes ?? []) L.push(`📝 OBS: ${obs}`)
    L.push('')
    for (const it of itens.filter(i => i.order_id === o.id)) {
      const rotulo = limparRotulo(it.variant_title || it.product_title || '?')
      L.push(`${it.quantity}x ${rotulo}`)
      const url = fotoDe(rotulo)
      if (url) L.push(url)
      else { L.push('(sem foto cadastrada)'); semFoto++ }
      L.push('')
    }
    L.push('─'.repeat(40), '')
  }
  if (doMotoboy.length) {
    L.push(`*🛵 ENVIO MOTOBOY — PRIORIDADE (${doMotoboy.length})*`, '')
    for (const o of doMotoboy) blocoLogistica(o, true)
    L.push(`*DEMAIS PEDIDOS (${demais.length})*`, '')
  }
  for (const o of demais) blocoLogistica(o, false)

  // ── lista do motoboy ──────────────────────────────────────────────────────
  const M: string[] = [`*MOTOBOY ${d}/${mes} - JUST RUNNER*`, '']
  if (motoboyErro) M.push(`NÃO FOI POSSÍVEL GERAR: a consulta de frete na Yampi falhou (${motoboyErro}).`)
  else if (!doMotoboy.length) M.push('Nenhum pedido pago com entrega motoboy neste dia.')
  for (const o of doMotoboy) {
    const f = yampi.get(String(o.external_id))!
    const snap = (o.customer_snapshot ?? {}) as Record<string, unknown>
    const nome = String(snap.name || [snap.first_name, snap.last_name].filter(Boolean).join(' ') || '(sem nome)')
    M.push(`Pedido ${f.numero}`, nome)
    if (snap.email) M.push(String(snap.email))
    M.push(whatsappDe(snap))
    M.push(f.endereco || '(sem endereço)')
    if (f.uf && f.uf !== 'SP') M.push(`⚠️ FORA DE SP (${f.uf})`)
    for (const obs of f.observacoes) M.push(`📝 OBS: ${obs}`)
    M.push('')
    for (const it of itens.filter(i => i.order_id === o.id)) {
      M.push(`${it.quantity}x ${limparRotulo(it.variant_title || it.product_title || '?')}`)
    }
    M.push('', '─'.repeat(40), '')
  }

  // ── observações no fim da lista dos fornecedores ──────────────────────────
  // A lista soma os itens de todos os pedidos, então uma troca pedida na
  // observação ("enviar a Carbon, ele não quer a X Metal") não aparece na soma.
  const comObs = lista.filter(o => yampi.get(String(o.external_id))?.observacoes.length)
  if (motoboyErro) {
    F.push('', '─'.repeat(58), `⚠️ OBSERVAÇÕES NÃO INCLUÍDAS: a consulta na Yampi falhou (${motoboyErro})`)
  } else if (comObs.length) {
    F.push('', '─'.repeat(58), `OBSERVAÇÕES DOS PEDIDOS (${comObs.length})`,
      'Os itens abaixo já estão somados acima — confira se a observação muda o que comprar.')
    for (const o of comObs) {
      const y = yampi.get(String(o.external_id))!
      const snap = (o.customer_snapshot ?? {}) as Record<string, string | undefined>
      const nome = snap.name || [snap.first_name, snap.last_name].filter(Boolean).join(' ') || '(sem nome)'
      F.push('', `Pedido ${y.numero} — ${nome}`)
      for (const it of itens.filter(i => i.order_id === o.id)) {
        F.push(`${String(it.quantity).padStart(2)}x  ${limparRotulo(it.variant_title || it.product_title || '?')}${it.sku ? `  [${it.sku}]` : ''}`)
      }
      for (const obs of y.observacoes) F.push(`📝 OBS: ${obs}`)
    }
  }

  return {
    dia, dataBR, pedidos: lista.length, unidades, semFoto,
    fornecedores: F.join('\n') + '\n',
    logistica:    L.join('\n'),
    motoboy:      M.join('\n'),
    pedidosMotoboy: doMotoboy.length, motoboyErro,
  }
}
