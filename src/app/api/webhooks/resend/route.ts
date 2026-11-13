import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getAdminSupabase } from '@/lib/admin-client'
import { recordOptout } from '@/lib/mkt/optout'

export const runtime = 'nodejs'

/** Webhook da Resend (delivered/opened/clicked/bounced/complained). O evento traz
 *  `data.email_id`, o mesmo que guardamos em mkt_sends.provider_message_id.
 *  Cada evento vira 1 linha em mkt_events (svix-id único: reenvio não duplica)
 *  e marca a primeira entrega/abertura/clique no próprio envio, para as contagens
 *  do painel serem por destinatário. Reclamação de spam = descadastro. */

const TOLERANCIA_S = 5 * 60

/** Verificação de assinatura no padrão Svix (o que a Resend usa), sem o pacote svix:
 *  HMAC-SHA256 de "<svix-id>.<svix-timestamp>.<corpo>" com a chave (base64 depois
 *  de "whsec_"); o header svix-signature traz "v1,<assinatura base64>" separados por espaço. */
function assinaturaValida(secret: string, id: string, timestamp: string, corpo: string, header: string): boolean {
  if (!id || !timestamp || !header) return false
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCIA_S) return false
  const chave = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64')
  const esperado = createHmac('sha256', chave).update(`${id}.${timestamp}.${corpo}`).digest()
  return header.split(' ').some(parte => {
    const [versao, assinatura] = parte.split(',')
    if (versao !== 'v1' || !assinatura) return false
    const recebido = Buffer.from(assinatura, 'base64')
    return recebido.length === esperado.length && timingSafeEqual(recebido, esperado)
  })
}

const COLUNA_PRIMEIRA_VEZ: Record<string, 'delivered_at' | 'opened_at' | 'clicked_at'> = {
  'email.delivered': 'delivered_at',
  'email.opened': 'opened_at',
  'email.clicked': 'clicked_at',
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ ok: false, error: 'RESEND_WEBHOOK_SECRET não configurado' }, { status: 503 })

  const corpo = await request.text()
  const svixId = request.headers.get('svix-id') ?? ''
  if (!assinaturaValida(secret, svixId, request.headers.get('svix-timestamp') ?? '', corpo, request.headers.get('svix-signature') ?? '')) {
    return NextResponse.json({ ok: false, error: 'assinatura inválida' }, { status: 401 })
  }

  let event: { type?: string; created_at?: string; data?: { email_id?: string; bounce?: { type?: string } } }
  try {
    event = JSON.parse(corpo)
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 })
  }
  const tipo = event.type ?? 'desconhecido'
  const emailId = event.data?.email_id
  if (!emailId) return NextResponse.json({ ok: true, skipped: true })

  const db = getAdminSupabase()
  const { data: send } = await db.from('mkt_sends').select('id, contact_email, status').eq('provider_message_id', emailId).maybeSingle()
  if (!send) return NextResponse.json({ ok: true, skipped: true, reason: 'envio não encontrado' })

  const { error: evErr } = await db.from('mkt_events')
    .upsert({ send_id: send.id, event_type: tipo, provider_event_id: svixId, raw_payload: event }, { onConflict: 'provider_event_id', ignoreDuplicates: true })
  if (evErr) return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 }) // 500 → a Resend tenta de novo

  const quando = event.created_at && !Number.isNaN(Date.parse(event.created_at)) ? new Date(event.created_at).toISOString() : new Date().toISOString()
  const coluna = COLUNA_PRIMEIRA_VEZ[tipo]
  if (coluna) await db.from('mkt_sends').update({ [coluna]: quando }).eq('id', send.id).is(coluna, null)

  // bounce temporário (caixa cheia etc.) não bloqueia o endereço para sempre
  if (tipo === 'email.bounced' && event.data?.bounce?.type !== 'Transient') {
    await db.from('mkt_sends').update({ status: 'bounced' }).eq('id', send.id)
  }
  if (tipo === 'email.complained') {
    await db.from('mkt_sends').update({ status: 'unsubscribed' }).eq('id', send.id)
    if (send.contact_email) await recordOptout({ email: send.contact_email as string, reason: 'reclamou de spam (Resend)' }).catch(() => {})
  }
  return NextResponse.json({ ok: true })
}
