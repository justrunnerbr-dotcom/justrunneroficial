import { getAdminSupabase } from '@/lib/admin-client'
import { emailsBloqueados, normalizarEmail, emailValido } from '@/lib/mkt/optout'

// Públicos do e-mail marketing. Fonte única: mkt_contacts (sincronizado da Yampi
// por lib/mkt/contatos.ts). Descadastrados e bounces saem sempre.

export type SegmentType = 'todos_clientes' | 'cliente_sumido' | 'compradores' | 'lista_customizada'

export const SEGMENT_LABEL: Record<SegmentType, string> = {
  todos_clientes: 'Todos os clientes',
  cliente_sumido: 'Clientes sumidos (última compra há N dias)',
  compradores: 'Quem já comprou (1+ pedido pago)',
  lista_customizada: 'Lista de e-mails',
}

export type MktSegment = {
  id: string
  name: string
  type: SegmentType
  criteria: Record<string, unknown>
  created_at: string
}

export type SegmentContact = {
  email: string
  name: string | null
  vars: Record<string, string | number | null>
}

type Contato = {
  email: string
  name: string | null
  newsletter: boolean
  orders_count: number
  last_order_at: string | null
}

type Segment = { type: string; criteria: Record<string, unknown> }

export async function listSegments(): Promise<MktSegment[]> {
  const db = getAdminSupabase()
  const { data, error } = await db.from('mkt_segments').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as MktSegment[]
}

export async function createSegment(input: Omit<MktSegment, 'id' | 'created_at'>): Promise<string> {
  const db = getAdminSupabase()
  const { data, error } = await db.from('mkt_segments').insert(input).select('id').single()
  if (error) throw new Error(error.message)
  return data.id as string
}

export async function deleteSegment(id: string): Promise<void> {
  const db = getAdminSupabase()
  const { error } = await db.from('mkt_segments').delete().eq('id', id)
  if (error) throw new Error(error.code === '23503' ? 'este público é usado por uma campanha' : error.message)
}

/** Base inteira de contatos, paginada por id (o PostgREST corta em 1000). */
export async function carregarContatos(db = getAdminSupabase()): Promise<Contato[]> {
  const out: Contato[] = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db.from('mkt_contacts').select('email, name, newsletter, orders_count, last_order_at')
      .order('id').range(de, de + 999)
    if (error) throw new Error(error.message)
    out.push(...((data ?? []) as Contato[]))
    if (!data || data.length < 1000) break
  }
  return out
}

const diasDesde = (iso: string | null, agora: number) => (iso ? Math.floor((agora - new Date(iso).getTime()) / 86_400_000) : null)

function varsDe(email: string, name: string | null, lastOrderAt: string | null, agora: number): SegmentContact['vars'] {
  const nome = name?.trim() ?? ''
  return {
    nome,
    primeiro_nome: nome ? nome.split(/\s+/)[0] : '',
    email,
    ultima_compra_data: lastOrderAt ? new Date(lastOrderAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '',
    dias_sumido: diasDesde(lastOrderAt, agora),
  }
}

/** Resolve o público em memória a partir da base já carregada (sem bloqueados). */
export function filtrarSegmento(segment: Segment, contatos: Contato[], bloqueados: Set<string>): SegmentContact[] {
  const agora = Date.now()
  const c = segment.criteria ?? {}
  const vistos = new Set<string>()
  const out: SegmentContact[] = []
  const add = (email: string, name: string | null, lastOrderAt: string | null) => {
    const e = normalizarEmail(email)
    if (!emailValido(e) || bloqueados.has(e) || vistos.has(e)) return
    vistos.add(e)
    out.push({ email: e, name, vars: varsDe(e, name, lastOrderAt, agora) })
  }

  if (segment.type === 'lista_customizada') {
    const porEmail = new Map(contatos.map(x => [x.email, x]))
    for (const bruto of (c.emails as string[] | undefined) ?? []) {
      const x = porEmail.get(normalizarEmail(bruto))
      add(bruto, x?.name ?? null, x?.last_order_at ?? null)
    }
    return out
  }

  const soNewsletter = c.somente_newsletter === true
  const diasMin = Number(c.dias_minimo ?? 0)
  const diasMaxRaw = c.dias_maximo
  const diasMax = diasMaxRaw != null && diasMaxRaw !== '' ? Number(diasMaxRaw) : null

  for (const x of contatos) {
    if (soNewsletter && !x.newsletter) continue
    if (segment.type === 'compradores' && !(x.orders_count >= 1)) continue
    if (segment.type === 'cliente_sumido') {
      // faixa fechada opcional: sem dias_maximo, "sumido há 200 dias" cairia em
      // todas as faixas de uma sequência (45/90/180) ao mesmo tempo
      const dias = diasDesde(x.last_order_at, agora)
      if (dias == null || dias < diasMin) continue
      if (diasMax != null && dias > diasMax) continue
    }
    if (segment.type !== 'todos_clientes' && segment.type !== 'compradores' && segment.type !== 'cliente_sumido') continue
    add(x.email, x.name, x.last_order_at)
  }
  return out
}

export async function resolveSegment(segment: Segment, bloqueados?: Set<string>): Promise<SegmentContact[]> {
  const db = getAdminSupabase()
  const [contatos, bloq] = await Promise.all([carregarContatos(db), bloqueados ?? emailsBloqueados(db)])
  return filtrarSegmento(segment, contatos, bloq)
}

/** Quantos receberiam HOJE cada público (base e bloqueios lidos uma vez só). */
export async function contarSegmentos(segments: MktSegment[]): Promise<Record<string, number>> {
  if (!segments.length) return {}
  const db = getAdminSupabase()
  const [contatos, bloq] = await Promise.all([carregarContatos(db), emailsBloqueados(db)])
  return Object.fromEntries(segments.map(s => [s.id, filtrarSegmento(s, contatos, bloq).length]))
}
