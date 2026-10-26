import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse, after } from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'
import { replyToComment } from '@/lib/ig/instagram'
import { enqueueWelcome, enqueueFollowups } from '@/lib/ig/queue'
import { getIgConfig } from '@/lib/ig/config'
import { handleIncoming, handleEcho } from '@/lib/ig/bot'

export const runtime = 'nodejs' // precisa do módulo crypto do Node, não roda em edge

// Porte da JHF (assistente sem IA, versão de 10/10/2026): comentário, resposta
// de story e DM entram aqui, viram mensagens na ig_queue e o /api/ig/drain
// manda (chamado logo abaixo e todo minuto pelo pg_cron do Supabase).

// ── Handshake de verificação (Meta chama isso 1x ao salvar o webhook) ─────
export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token && token === process.env.IG_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// ── Eventos de verdade (comentário, mensagem, resposta de story) ──────────
export async function POST(request: Request) {
  const rawBody = await request.text()

  if (!isValidSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const db = getAdminSupabase()

  const { data: eventRow } = await db.from('ig_events').insert({
    event_type: guessEventType(payload),
    raw_payload: payload,
  }).select('id').single()

  const origin = new URL(request.url).origin

  // dispara o processamento e a drenagem da fila SEM segurar a resposta do
  // webhook (a Meta espera 200 rápido) — a trava atômica da fila garante que
  // isso nunca manda em dobro mesmo rodando "em paralelo" com o cron.
  after(async () => {
    try {
      await processPayload(payload)
      if (eventRow) await db.from('ig_events').update({ processed: true }).eq('id', eventRow.id)
    } catch (err) {
      if (eventRow) await db.from('ig_events').update({ error: String(err) }).eq('id', eventRow.id)
    }
    await fetch(`${origin}/api/ig/drain`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }).catch(() => {})
  })

  return NextResponse.json({ ok: true })
}

function isValidSignature(rawBody: string, header: string | null): boolean {
  if (!header || !process.env.IG_APP_SECRET) return false
  const expected = 'sha256=' + createHmac('sha256', process.env.IG_APP_SECRET).update(rawBody).digest('hex')
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function guessEventType(payload: unknown): string {
  const p = payload as { entry?: { changes?: { field?: string }[]; messaging?: unknown[] }[] }
  const entry = p.entry?.[0]
  if (entry?.changes?.[0]?.field === 'comments') return 'comment'
  if (entry?.messaging) return 'message'
  return 'unknown'
}

// ── Processamento ──────────────────────────────────────────────────────────

type Automation = {
  id: string
  active: boolean
  trigger_comment: boolean
  trigger_story_reply: boolean
  trigger_dm: boolean
  keywords: string[]
  match_type: 'contains' | 'exact' | 'any'
  specific_media_id: string | null
  public_replies: string[]
  welcome_message: string
  quick_reply_label: string | null
  link_message: string | null
  link_button_label: string | null
  link_url: string | null
  reminder_message: string | null
  reminder_delay_minutes: number | null
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function matchesKeyword(text: string, automation: Automation): boolean {
  if (automation.match_type === 'any') return true
  const n = normalize(text)
  return automation.keywords.some(k => {
    const nk = normalize(k)
    return automation.match_type === 'exact' ? n === nk : n.includes(nk)
  })
}

async function upsertContact(igScopedId: string, username: string | undefined, automationId: string) {
  const db = getAdminSupabase()
  const { data } = await db
    .from('ig_contacts')
    .upsert({ ig_scoped_id: igScopedId, username, last_automation_id: automationId, updated_at: new Date().toISOString() }, { onConflict: 'ig_scoped_id' })
    .select('id')
    .single()
  return data!.id as string
}

async function processPayload(payload: unknown) {
  const db = getAdminSupabase()
  const p = payload as {
    entry?: {
      id: string
      changes?: { field: string; value: { id: string; text?: string; from?: { id: string; username?: string }; media?: { id: string } } }[]
      messaging?: {
        sender: { id: string }
        recipient: { id: string }
        message?: { mid: string; text?: string; is_echo?: boolean; quick_reply?: { payload: string }; reply_to?: { story?: { id: string } } }
        postback?: { mid?: string; title?: string; payload: string }
      }[]
    }[]
  }

  const { data: automations } = await db.from('ig_automations').select('*').eq('active', true)
  if (!automations) return

  for (const entry of p.entry ?? []) {
    // ── Comentários ──
    for (const change of entry.changes ?? []) {
      if (change.field !== 'comments') continue
      const { id: commentId, text, from, media } = change.value
      if (!text || !from) continue

      const candidates = (automations as Automation[]).filter(a =>
        a.trigger_comment
        && (!a.specific_media_id || a.specific_media_id === media?.id)
        && matchesKeyword(text, a))

      const automation = candidates[0]
      if (!automation) continue

      const contactId = await upsertContact(from.id, from.username, automation.id)
      await enqueueWelcome({ contactId, automation, sendType: 'private_reply', recipientCommentId: commentId })

      if (automation.public_replies.length > 0) {
        const reply = automation.public_replies[Math.floor(Math.random() * automation.public_replies.length)]
        try { const { accessToken } = await getIgConfig(); await replyToComment(commentId, accessToken, reply) } catch { /* não trava o resto do processamento por causa disso */ }
      }
    }

    // ── Mensagens (DM normal, resposta de story, quick reply, botão) ──
    for (const msg of entry.messaging ?? []) {
      const senderId = msg.sender.id
      const text = msg.message?.text

      // Eco é a cópia da mensagem que a própria loja mandou. Se não foi o bot,
      // foi a equipe respondendo pelo app: o assistente sai daquela conversa.
      if (msg.message?.is_echo || senderId === entry.id) {
        if (msg.message?.is_echo) await handleEcho(msg.recipient.id, text)
        continue
      }
      if (!msg.message && !msg.postback) continue // read, reaction, edição

      // Lido antes de atualizar: o assistente precisa saber se a pessoa já
      // estava conversando antes desta mensagem.
      const { data: anterior } = await db.from('ig_contacts')
        .select('last_user_response_at').eq('ig_scoped_id', senderId).maybeSingle()
      const previousMessageAt = anterior?.last_user_response_at ?? null
      // Qualquer ação da pessoa (texto, botão, resposta de story) abre a janela de 24h.
      await db.from('ig_contacts').upsert(
        { ig_scoped_id: senderId, last_user_response_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: 'ig_scoped_id' },
      )

      const botPayload = msg.postback?.payload ?? msg.message?.quick_reply?.payload
      if (botPayload?.startsWith('BOT:')) {
        await handleIncoming({ igScopedId: senderId, payload: botPayload, previousMessageAt })
        continue
      }

      if (msg.message?.quick_reply) {
        const automationId = msg.message.quick_reply.payload
        const automation = (automations as Automation[]).find(a => a.id === automationId)
        if (!automation) continue
        const contactId = await upsertContact(senderId, undefined, automation.id)
        await enqueueFollowups({ contactId, igScopedId: senderId, automation })
        continue
      }

      const isStoryReply = !!msg.message?.reply_to?.story
      const automation = text
        ? (automations as Automation[]).find(a => (isStoryReply ? a.trigger_story_reply : a.trigger_dm) && matchesKeyword(text, a))
        : undefined
      if (automation) {
        const contactId = await upsertContact(senderId, undefined, automation.id)
        await enqueueWelcome({ contactId, automation, sendType: 'dm', recipientIgId: senderId })
        continue
      }

      await handleIncoming({ igScopedId: senderId, text, isStoryReply, previousMessageAt })
    }
  }
}
