import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'
import { getIgConfig } from '@/lib/ig/config'
import { sendMessage, type SendRecipient, type SendMessagePayload } from '@/lib/ig/instagram'
import { getBotState } from '@/lib/ig/bot-state'
import { marcarRotina } from '@/lib/admin/rotinas'

export const runtime = 'nodejs'
export const maxDuration = 60

const RATE_LIMIT_MS = 500 // ~2 por segundo
const MAX_PER_HOUR = 200  // teto prático de DM automática/hora (limite da própria Meta)

type QueueRow = {
  id: string
  created_at: string
  scheduled_for: string
  contact_id: string
  send_type: 'private_reply' | 'dm' | 'comment_reply'
  recipient_comment_id: string | null
  recipient_ig_id: string | null
  payload: SendMessagePayload
  requires_24h_window: boolean
  attempts: number
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// Chamado (1) pelo webhook logo depois de um evento novo, pra parecer
// instantâneo, e (2) todo minuto pelo pg_cron do Supabase (jr-ig-drain), pra
// garantir que nada fica pra trás mesmo sem tráfego novo. A trava atômica
// (claim_ig_queue_batch) impede os dois de mandar a mesma mensagem 2x.
// Na JR (Vercel Hobby) não há cron da Vercel de garantia: se o pg_cron parar,
// o /admin/alertas avisa pelo batimento (lib/admin/rotinas).
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  return drain()
}


async function drain() {
  const db = getAdminSupabase()
  await marcarRotina(db, 'ig-drain')

  const sentLastHour = await countSentLastHour(db)
  if (sentLastHour >= MAX_PER_HOUR) {
    return NextResponse.json({ ok: true, skipped: 'rate_limit_hour' })
  }

  const { data: batch, error } = await db.rpc('claim_ig_queue_batch', { batch_size: Math.min(20, MAX_PER_HOUR - sentLastHour) })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!batch || batch.length === 0) return NextResponse.json({ ok: true, processed: 0 })

  let igUserId: string, accessToken: string
  try {
    ;({ igUserId, accessToken } = await getIgConfig())
  } catch (err) {
    await db.from('ig_queue').update({ status: 'pending', claimed_at: null }).in('id', (batch as QueueRow[]).map(r => r.id))
    return NextResponse.json({ ok: false, error: String(err) }, { status: 200 })
  }

  // O UPDATE ... RETURNING não garante ordem: o bot manda texto, carrossel e
  // botões em sequência e eles precisam chegar nessa ordem.
  const rows = [...(batch as QueueRow[])].sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for))
  let processed = 0
  for (const row of rows) {
    if (row.requires_24h_window) {
      const withinWindow = await isWithin24hWindow(db, row.contact_id)
      if (!withinWindow) {
        await db.from('ig_queue').update({ status: 'skipped', last_error: 'janela de 24h fechada' }).eq('id', row.id)
        continue
      }
    }

    // Lembrete do bot: só vai se o cliente não voltou a falar desde que foi
    // agendado e se ninguém da equipe assumiu a conversa.
    const bot = (row.payload as { _bot?: { followup?: boolean } })._bot
    if (bot?.followup && await followupObsoleto(db, row)) {
      await db.from('ig_queue').update({ status: 'skipped', last_error: 'lembrete dispensado: conversa andou' }).eq('id', row.id)
      continue
    }

    const recipient: SendRecipient = row.recipient_comment_id
      ? { comment_id: row.recipient_comment_id }
      : { id: row.recipient_ig_id! }

    try {
      // `_bot` é o estado do fluxo da DM guardado junto da mensagem (lib/ig/bot):
      // fica no banco, não vai para o Instagram.
      const { _bot: _estado, ...message } = row.payload as SendMessagePayload & { _bot?: unknown }
      void _estado
      await sendMessage(igUserId, accessToken, recipient, message as SendMessagePayload)
      await db.from('ig_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', row.id)
    } catch (err) {
      const attempts = row.attempts + 1
      await db.from('ig_queue').update({
        status: attempts >= 3 ? 'failed' : 'pending',
        claimed_at: null,
        attempts,
        last_error: String(err),
      }).eq('id', row.id)
    }

    processed++
    await sleep(RATE_LIMIT_MS)
  }

  return NextResponse.json({ ok: true, processed })
}

async function countSentLastHour(db: ReturnType<typeof getAdminSupabase>): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString()
  const { count } = await db.from('ig_queue').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', oneHourAgo)
  return count ?? 0
}

async function isWithin24hWindow(db: ReturnType<typeof getAdminSupabase>, contactId: string): Promise<boolean> {
  const { data } = await db.from('ig_contacts').select('last_user_response_at').eq('id', contactId).single()
  if (!data?.last_user_response_at) return false
  return Date.now() - new Date(data.last_user_response_at).getTime() < 24 * 60 * 60_000
}

async function followupObsoleto(db: ReturnType<typeof getAdminSupabase>, row: QueueRow): Promise<boolean> {
  const { data } = await db.from('ig_contacts').select('last_user_response_at').eq('id', row.contact_id).single()
  if (data?.last_user_response_at && data.last_user_response_at > row.created_at) return true
  const state = await getBotState(db, row.contact_id)
  return !!state.pausedUntil
}
