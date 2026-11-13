import { getAdminSupabase } from '@/lib/admin-client'
import { STORE_ID } from '@/lib/yampi/sync'
import { normalizarEmail, emailValido } from '@/lib/mkt/optout'

// Base de contatos do e-mail marketing (mkt_contacts).
// 1) Puxa TODOS os clientes da Yampi (GET /customers, 100 por página, ~2 mil hoje)
//    e grava nome, telefone e o aceite de newsletter. Pula anonimizados e quem
//    pediu exclusão da conta (LGPD).
// 2) Enriquece total gasto / nº de pedidos / última compra com customer_purchase_stats
//    (agregado de todos os pedidos pagos, recalculado todo dia pelo cron customer-stats).
//    Comprador que não aparece no /customers entra como contato com source 'pedidos'.
// Retomável: o cursor (página) fica em settings 'mkt_contatos_sync'; se o prazo
// da chamada acabar, a próxima continua de onde parou.

const SETTINGS_KEY = 'mkt_contatos_sync'
const POR_PAGINA = 100

type Db = ReturnType<typeof getAdminSupabase>

export type EstadoSync = {
  /** próxima página da Yampi a ler; null = nenhuma sincronização em andamento */
  pagina: number | null
  totalPaginas: number | null
  iniciadoEm: string | null
  ultimoCompleto: string | null
  ultimoResultado: string | null
}

const ESTADO_VAZIO: EstadoSync = { pagina: null, totalPaginas: null, iniciadoEm: null, ultimoCompleto: null, ultimoResultado: null }

export async function lerEstadoSync(db: Db = getAdminSupabase()): Promise<EstadoSync> {
  const { data } = await db.from('settings').select('value').eq('key', SETTINGS_KEY).maybeSingle()
  if (!data?.value) return { ...ESTADO_VAZIO }
  try {
    return { ...ESTADO_VAZIO, ...(JSON.parse(data.value as string) as Partial<EstadoSync>) }
  } catch {
    return { ...ESTADO_VAZIO }
  }
}

async function gravarEstado(db: Db, estado: EstadoSync): Promise<void> {
  const { error } = await db.from('settings').upsert({ key: SETTINGS_KEY, value: JSON.stringify(estado), updated_at: new Date().toISOString() })
  if (error) throw new Error(`settings: ${error.message}`)
}

type ClienteYampi = {
  id?: number
  name?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  newsletter?: boolean | null
  anonymized?: boolean | null
  active?: boolean | null
  phone?: { full_number?: string | null; formated_number?: string | null } | string | null
  deletion_request?: { data?: { pending_confirmation?: boolean | null; scheduled_date?: string | null } | null } | null
}

function credenciais() {
  const alias = process.env.NEXT_PUBLIC_YAMPI_ALIAS
  const token = process.env.YAMPI_API_TOKEN
  const secretKey = process.env.YAMPI_SECRET_KEY
  if (!alias || !token || !secretKey) throw new Error('credenciais da Yampi faltando (NEXT_PUBLIC_YAMPI_ALIAS, YAMPI_API_TOKEN, YAMPI_SECRET_KEY)')
  return { base: `https://api.dooki.com.br/v2/${alias}`, headers: { 'User-Token': token, 'User-Secret-Key': secretKey, Accept: 'application/json' } }
}

async function buscarPagina(pagina: number): Promise<{ clientes: ClienteYampi[]; totalPaginas: number }> {
  const { base, headers } = credenciais()
  const url = `${base}/customers?${new URLSearchParams({ limit: String(POR_PAGINA), page: String(pagina) })}`
  for (let tentativa = 1; ; tentativa++) {
    const res = await fetch(url, { headers, cache: 'no-store' })
    if (res.ok) {
      const json = await res.json() as { data?: ClienteYampi[]; meta?: { pagination?: { total_pages?: number } } }
      return { clientes: json.data ?? [], totalPaginas: json.meta?.pagination?.total_pages ?? pagina }
    }
    // 429/5xx: espera e tenta de novo (até 3x); o resto é erro de verdade
    if (tentativa >= 3 || (res.status !== 429 && res.status < 500)) {
      throw new Error(`Yampi /customers página ${pagina}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`)
    }
    await new Promise(r => setTimeout(r, 1500 * tentativa))
  }
}

/** Cliente que não pode entrar na base: anonimizado ou com exclusão pedida. */
function excluido(c: ClienteYampi): boolean {
  if (c.anonymized) return true
  const dr = c.deletion_request?.data
  return !!(dr && (dr.pending_confirmation || dr.scheduled_date))
}

function telefone(c: ClienteYampi): string | null {
  if (!c.phone) return null
  if (typeof c.phone === 'string') return c.phone || null
  return c.phone.formated_number || c.phone.full_number || null
}

async function gravarPagina(db: Db, clientes: ClienteYampi[]): Promise<{ gravados: number; pulados: number }> {
  const porEmail = new Map<string, Record<string, unknown>>()
  let pulados = 0
  const agora = new Date().toISOString()
  for (const c of clientes) {
    const email = c.email ? normalizarEmail(c.email) : ''
    if (!email || !emailValido(email) || excluido(c)) { pulados++; continue }
    // o mesmo e-mail 2x no mesmo upsert quebra o ON CONFLICT: fica o último
    porEmail.set(email, {
      email,
      name: [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || c.name || null,
      phone: telefone(c),
      source: 'yampi',
      yampi_customer_id: c.id ?? null,
      newsletter: c.newsletter === true,
      updated_at: agora,
    })
  }
  const linhas = [...porEmail.values()]
  if (linhas.length) {
    const { error } = await db.from('mkt_contacts').upsert(linhas, { onConflict: 'email' })
    if (error) throw new Error(`mkt_contacts: ${error.message}`)
  }
  // quem pediu exclusão depois de já estar na base sai dela
  const sair = clientes.filter(excluido).map(c => (c.email ? normalizarEmail(c.email) : '')).filter(Boolean)
  if (sair.length) await db.from('mkt_contacts').delete().in('email', sair)
  return { gravados: linhas.length, pulados }
}

/** Total gasto, pedidos e última compra a partir de customer_purchase_stats. */
async function enriquecer(db: Db): Promise<{ atualizados: number; novos: number }> {
  type Stat = { email: string; name: string | null; phone_formatted: string | null; total_spent: number; orders_count: number; last_order_at: string | null }
  const stats: Stat[] = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db.from('customer_purchase_stats')
      .select('email, name, phone_formatted, total_spent, orders_count, last_order_at')
      .eq('store_id', STORE_ID).order('id').range(de, de + 999)
    if (error) throw new Error(`customer_purchase_stats: ${error.message}`)
    stats.push(...((data ?? []) as Stat[]))
    if (!data || data.length < 1000) break
  }

  const existentes = new Set<string>()
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db.from('mkt_contacts').select('email').order('id').range(de, de + 999)
    if (error) throw new Error(error.message)
    for (const r of data ?? []) existentes.add(r.email as string)
    if (!data || data.length < 1000) break
  }

  const agora = new Date().toISOString()
  const porEmail = new Map<string, Stat>()
  for (const s of stats) {
    const email = normalizarEmail(s.email ?? '')
    if (emailValido(email)) porEmail.set(email, s)
  }
  const atualizar: Record<string, unknown>[] = []
  const inserir: Record<string, unknown>[] = []
  for (const [email, s] of porEmail) {
    const numeros = { email, total_spent: Number(s.total_spent) || 0, orders_count: s.orders_count ?? 0, last_order_at: s.last_order_at, updated_at: agora }
    if (existentes.has(email)) atualizar.push(numeros)
    else inserir.push({ ...numeros, name: s.name, phone: s.phone_formatted, source: 'pedidos' })
  }

  const LOTE = 500
  // upsert só com as colunas de números: não sobrescreve nome/telefone/origem da Yampi
  for (let i = 0; i < atualizar.length; i += LOTE) {
    const { error } = await db.from('mkt_contacts').upsert(atualizar.slice(i, i + LOTE), { onConflict: 'email' })
    if (error) throw new Error(`enriquecer: ${error.message}`)
  }
  for (let i = 0; i < inserir.length; i += LOTE) {
    const { error } = await db.from('mkt_contacts').upsert(inserir.slice(i, i + LOTE), { onConflict: 'email', ignoreDuplicates: true })
    if (error) throw new Error(`enriquecer (novos): ${error.message}`)
  }
  return { atualizados: atualizar.length, novos: inserir.length }
}

export type ResultadoSync = {
  concluido: boolean
  paginasLidas: number
  proximaPagina: number | null
  totalPaginas: number | null
  gravados: number
  pulados: number
  enriquecimento?: { atualizados: number; novos: number }
}

/** Uma rodada da sincronização, dentro do prazo (padrão 45 s de uma função de 60 s). */
export async function sincronizarContatos(opts: { prazoMs?: number } = {}): Promise<ResultadoSync> {
  const inicio = Date.now()
  const prazo = opts.prazoMs ?? 45_000
  const db = getAdminSupabase()
  const estado = await lerEstadoSync(db)
  let pagina = estado.pagina ?? 1
  if (estado.pagina == null) estado.iniciadoEm = new Date().toISOString()

  let paginasLidas = 0, gravados = 0, pulados = 0
  let totalPaginas = estado.totalPaginas ?? null
  while (true) {
    const r = await buscarPagina(pagina)
    totalPaginas = r.totalPaginas
    const g = await gravarPagina(db, r.clientes)
    gravados += g.gravados
    pulados += g.pulados
    paginasLidas++
    const acabou = r.clientes.length === 0 || pagina >= r.totalPaginas
    pagina++
    if (acabou) break
    // salva o cursor a cada página: se a função morrer, a próxima chamada continua daqui
    await gravarEstado(db, { ...estado, pagina, totalPaginas })
    if (Date.now() - inicio > prazo) {
      return { concluido: false, paginasLidas, proximaPagina: pagina, totalPaginas, gravados, pulados }
    }
  }

  const enriquecimento = await enriquecer(db)
  const fim = new Date().toISOString()
  await gravarEstado(db, {
    pagina: null, totalPaginas, iniciadoEm: null, ultimoCompleto: fim,
    ultimoResultado: `${totalPaginas ?? '?'} páginas da Yampi · ${enriquecimento.atualizados} com pedidos pagos · ${enriquecimento.novos} compradores fora do /customers`,
  })
  return { concluido: true, paginasLidas, proximaPagina: null, totalPaginas, gravados, pulados, enriquecimento }
}
