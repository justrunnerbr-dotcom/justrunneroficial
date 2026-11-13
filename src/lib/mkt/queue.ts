import { getAdminSupabase } from '@/lib/admin-client'
import { resolveSegment } from '@/lib/mkt/segments'
import { renderTemplate } from '@/lib/mkt/template'
import { prepararHtmlEmail, emailsBloqueados, normalizarEmail } from '@/lib/mkt/optout'
import { aplicarUtm, linkEmail, slugify, SITE_URL } from '@/lib/mkt/utm'

type Db = ReturnType<typeof getAdminSupabase>

export type MaterializeResult = {
  /** inseridos nesta chamada */
  enqueued: number
  /** já estavam na fila desta campanha (rodada anterior) */
  alreadyQueued: number
  /** destinatários que ainda faltam enfileirar (próxima fatia) */
  remaining: number
  done: boolean
}

/** Fatia por chamada. Na JHF, materializar tudo de uma vez na Server Action
 *  estourava o tempo e, ao clicar de novo, a fila era remontada do começo
 *  (1.500 pessoas receberam 2-3 cópias em 29/07/2026). Aqui a aprovação só muda
 *  o status; quem monta a fila é o drain, 500 por minuto, retomando de onde parou. */
export const FATIA_PADRAO = 500
const LOTE_INSERT = 100 // cada linha leva o HTML inteiro (~20 KB): lote pequeno não estoura o payload

/** E-mails JÁ na fila desta campanha (qualquer status) — paginado por id. */
async function carregarEnfileirados(db: Db, campaignId: string): Promise<Set<string>> {
  const out = new Set<string>()
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db.from('mkt_sends').select('contact_email')
      .eq('campaign_id', campaignId).order('id').range(de, de + 999)
    if (error) throw new Error(error.message)
    for (const r of data ?? []) if (r.contact_email) out.add(normalizarEmail(r.contact_email as string))
    if (!data || data.length < 1000) break
  }
  return out
}

/** Monta mais uma fatia da fila de uma campanha (1 linha em mkt_sends por
 *  destinatário). Não envia nada. Idempotente e retomável: pula quem já está na
 *  fila e o upsert com ignoreDuplicates no índice único (campaign_id, email_key)
 *  garante que nem dois drains concorrentes duplicam um envio. Quando não sobra
 *  ninguém, grava materialized_at e o drain para de chamar. */
export async function materializarFatia(campaignId: string, maxRows = FATIA_PADRAO): Promise<MaterializeResult> {
  const db = getAdminSupabase()
  const { data: campaign, error } = await db.from('mkt_campaigns')
    .select('id, name, status, scheduled_for, mkt_templates(subject, body), mkt_segments(type, criteria)')
    .eq('id', campaignId).single()
  if (error || !campaign) throw new Error(error?.message ?? 'campanha não encontrada')

  const template = campaign.mkt_templates as unknown as { subject: string | null; body: string } | null
  const segment = campaign.mkt_segments as unknown as { type: string; criteria: Record<string, unknown> } | null
  if (!template) throw new Error('campanha sem modelo')
  if (!segment) throw new Error('campanha sem público')

  const [bloqueados, enfileirados] = await Promise.all([emailsBloqueados(db), carregarEnfileirados(db, campaignId)])
  const contatos = await resolveSegment(segment, bloqueados)

  let alreadyQueued = 0
  const elegiveis = contatos.filter(c => {
    if (enfileirados.has(c.email)) { alreadyQueued++; return false }
    return true
  })
  const fatia = elegiveis.slice(0, maxRows)
  const remaining = elegiveis.length - fatia.length

  const slug = slugify(campaign.name as string)
  // rodapé de descadastro + UTM aplicados aqui, não no modelo salvo
  const corpo = aplicarUtm(prepararHtmlEmail(template.body), slug)
  const linkSite = linkEmail(SITE_URL, slug)
  const agendado = new Date().toISOString()

  let enqueued = 0
  for (let i = 0; i < fatia.length; i += LOTE_INSERT) {
    const lote = fatia.slice(i, i + LOTE_INSERT).map(c => {
      const vars = { ...c.vars, link_site: linkSite }
      return {
        campaign_id: campaignId,
        contact_email: c.email,
        contact_name: c.name,
        rendered_body: renderTemplate(corpo, vars),
        rendered_subject: renderTemplate(template.subject ?? '(sem assunto)', vars),
        scheduled_for: agendado,
      }
    })
    const { error: insErr } = await db.from('mkt_sends')
      .upsert(lote, { onConflict: 'campaign_id,email_key', ignoreDuplicates: true })
    if (insErr) throw new Error(insErr.message)
    enqueued += lote.length
  }

  if (remaining === 0) {
    await db.from('mkt_campaigns').update({ materialized_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', campaignId).is('materialized_at', null)
  }
  return { enqueued, alreadyQueued, remaining, done: remaining === 0 }
}
