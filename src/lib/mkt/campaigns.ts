import { getAdminSupabase } from '@/lib/admin-client'
import { PREFIXO_TESTE } from '@/lib/mkt/templates'

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused'

export type CampaignStats = {
  total: number
  pendentes: number
  enviados: number
  falhas: number
  voltaram: number
  descadastrados: number
  entregues: number
  abertos: number
  clicados: number
}

export type MktCampaign = {
  id: string
  name: string
  template_id: string
  segment_id: string | null
  status: CampaignStatus
  scheduled_for: string | null
  approved_at: string | null
  materialized_at: string | null
  completed_at: string | null
  created_at: string
  template_name?: string
  segment_name?: string
  stats: CampaignStats
}

const VAZIO: CampaignStats = { total: 0, pendentes: 0, enviados: 0, falhas: 0, voltaram: 0, descadastrados: 0, entregues: 0, abertos: 0, clicados: 0 }

export async function listCampaigns(): Promise<MktCampaign[]> {
  const db = getAdminSupabase()
  const { data: campaigns, error } = await db.from('mkt_campaigns')
    .select('*, mkt_templates(name), mkt_segments(name)')
    .eq('channel', 'email').eq('kind', 'manual')
    .not('name', 'like', `${PREFIXO_TESTE}%`)
    .order('created_at', { ascending: false }).limit(50)
  if (error) throw new Error(error.message)
  if (!campaigns?.length) return []

  // contagens agregadas no banco (mkt_stats_campanhas): nunca baixar envios linha a linha
  const { data: stats } = await db.rpc('mkt_stats_campanhas', { p_ids: campaigns.map(c => c.id) })
  const porId = new Map(((stats ?? []) as (Record<string, number | string> & { campaign_id: string })[]).map(s => [s.campaign_id, s]))

  return campaigns.map(c => {
    const s = porId.get(c.id as string)
    const n = (k: keyof CampaignStats) => Number(s?.[k] ?? 0)
    return {
      ...(c as unknown as MktCampaign),
      template_name: (c.mkt_templates as { name: string } | null)?.name,
      segment_name: (c.mkt_segments as { name: string } | null)?.name,
      stats: s
        ? { total: n('total'), pendentes: n('pendentes'), enviados: n('enviados'), falhas: n('falhas'), voltaram: n('voltaram'), descadastrados: n('descadastrados'), entregues: n('entregues'), abertos: n('abertos'), clicados: n('clicados') }
        : { ...VAZIO },
    }
  })
}

export async function createCampaign(input: { name: string; template_id: string; segment_id: string; scheduled_for: string | null }): Promise<string> {
  const db = getAdminSupabase()
  const { data, error } = await db.from('mkt_campaigns')
    .insert({ ...input, channel: 'email', kind: 'manual', status: 'draft' }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id as string
}

/** Portão de aprovação: SÓ o clique do dono tira a campanha do rascunho.
 *  Não monta fila aqui (a Server Action tem tempo curto): só agenda; o drain
 *  promove para 'sending' na hora marcada e monta a fila em fatias. */
export async function aprovarCampanha(id: string): Promise<void> {
  const db = getAdminSupabase()
  const { data: c } = await db.from('mkt_campaigns').select('status, scheduled_for, segment_id').eq('id', id).single()
  if (!c) throw new Error('campanha não encontrada')
  if (c.status !== 'draft') throw new Error('só rascunho pode ser aprovado')
  if (!c.segment_id) throw new Error('campanha sem público')
  const agora = new Date().toISOString()
  const { error } = await db.from('mkt_campaigns')
    .update({ status: 'scheduled', approved_at: agora, scheduled_for: c.scheduled_for ?? agora, updated_at: agora })
    .eq('id', id).eq('status', 'draft') // trava contra clique duplo
  if (error) throw new Error(error.message)
}

/** Pausar: o que ainda está pendente fica na fila, mas o claim só pega campanha
 *  em 'sending', então nada sai. Retomar volta para 'scheduled' e o drain continua
 *  de onde parou (fila idempotente). */
export async function pausarCampanha(id: string): Promise<void> {
  const db = getAdminSupabase()
  const { error } = await db.from('mkt_campaigns').update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('id', id).in('status', ['scheduled', 'sending'])
  if (error) throw new Error(error.message)
}

export async function retomarCampanha(id: string): Promise<void> {
  const db = getAdminSupabase()
  const { error } = await db.from('mkt_campaigns').update({ status: 'scheduled', updated_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'paused')
  if (error) throw new Error(error.message)
}

/** Só rascunho pode ser excluído (campanha que já enviou guarda o histórico). */
export async function deleteCampaign(id: string): Promise<void> {
  const db = getAdminSupabase()
  const { error } = await db.from('mkt_campaigns').delete().eq('id', id).eq('status', 'draft')
  if (error) throw new Error(error.message)
}
