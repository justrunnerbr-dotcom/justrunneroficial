import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'
import { sendEmail } from '@/lib/mkt/resend'
import { materializarFatia, FATIA_PADRAO } from '@/lib/mkt/queue'
import { normalizarEmail } from '@/lib/mkt/optout'
import { marcarRotina } from '@/lib/admin/rotinas'

export const runtime = 'nodejs'
export const maxDuration = 60

// Worker do e-mail marketing. Chamado todo minuto pelo pg_cron (jr-mkt-drain,
// migration 20261112000001) com GET + Bearer CRON_SECRET. A cada chamada:
//  1) promove campanhas aprovadas cuja hora chegou ('scheduled' → 'sending');
//  2) monta mais uma fatia (≤500) da fila de UMA campanha ainda incompleta;
//  3) envia até 40 e-mails, 600 ms entre eles (~40/min, folga no limite da Resend);
//  4) fecha como 'completed' a campanha com fila montada e nada pendente.
// claim_mkt_sends_batch_by_channel (FOR UPDATE SKIP LOCKED) impede dois drains de
// mandarem o mesmo envio; o id do envio vai como Idempotency-Key para a Resend.

const LOTE = 40
const ESPACO_MS = 600
const MAX_TENTATIVAS = 3
const PRAZO_ENVIO_MS = 50_000 // para de enviar antes do limite de 60 s e devolve o resto para a fila

type Db = ReturnType<typeof getAdminSupabase>
type SendRow = { id: string; campaign_id: string; contact_email: string | null; rendered_subject: string | null; rendered_body: string; attempts: number }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function promover(db: Db): Promise<number> {
  const agora = new Date().toISOString()
  const { data, error } = await db.from('mkt_campaigns')
    .update({ status: 'sending', updated_at: agora })
    .eq('status', 'scheduled').lte('scheduled_for', agora)
    .select('id')
  if (error) throw new Error(`promover: ${error.message}`)
  return data?.length ?? 0
}

async function materializar(db: Db) {
  const { data } = await db.from('mkt_campaigns').select('id')
    .eq('status', 'sending').eq('kind', 'manual').is('materialized_at', null).not('segment_id', 'is', null)
    .order('created_at', { ascending: true }).limit(1)
  const c = data?.[0]
  if (!c) return null
  const r = await materializarFatia(c.id as string, FATIA_PADRAO)
  return { campanha: c.id as string, enfileirados: r.enqueued, faltam: r.remaining }
}

async function enviar(db: Db, inicio: number) {
  const { data, error } = await db.rpc('claim_mkt_sends_batch_by_channel', { batch_size: LOTE, p_channel: 'email' })
  if (error) throw new Error(`claim: ${error.message}`)
  const rows = (data ?? []) as SendRow[]
  if (!rows.length) return { enviados: 0, falhas: 0, descadastrados: 0, devolvidos: 0 }

  // descadastrou depois da fila montada: não envia
  const emails = [...new Set(rows.map(r => r.contact_email && normalizarEmail(r.contact_email)).filter(Boolean) as string[])]
  const { data: opt } = await db.from('mkt_optouts').select('email').in('email', emails)
  const bloqueados = new Set((opt ?? []).map(o => normalizarEmail(o.email as string)))

  let enviados = 0, falhas = 0, descadastrados = 0, devolvidos = 0
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (Date.now() - inicio > PRAZO_ENVIO_MS) {
      const resto = rows.slice(i).map(r => r.id)
      await db.from('mkt_sends').update({ status: 'pending', claimed_at: null }).in('id', resto)
      devolvidos = resto.length
      break
    }
    const email = row.contact_email ? normalizarEmail(row.contact_email) : null
    if (email && bloqueados.has(email)) {
      await db.from('mkt_sends').update({ status: 'unsubscribed', claimed_at: null }).eq('id', row.id)
      descadastrados++
      continue
    }
    try {
      if (!email) throw new Error('sem e-mail')
      const r = await sendEmail({ to: email, subject: row.rendered_subject ?? '(sem assunto)', html: row.rendered_body, idempotencyKey: row.id })
      await db.from('mkt_sends').update({ status: 'sent', sent_at: new Date().toISOString(), provider_message_id: r.id, last_error: null }).eq('id', row.id)
      enviados++
    } catch (err) {
      const attempts = row.attempts + 1
      await db.from('mkt_sends').update({
        status: attempts >= MAX_TENTATIVAS ? 'failed' : 'pending',
        claimed_at: null,
        attempts,
        last_error: (err instanceof Error ? err.message : String(err)).slice(0, 500),
      }).eq('id', row.id)
      falhas++
    }
    await sleep(ESPACO_MS)
  }
  return { enviados, falhas, descadastrados, devolvidos }
}

/** Campanha com fila completa e nada pendente → concluída. */
async function concluir(db: Db): Promise<number> {
  const { data } = await db.from('mkt_campaigns').select('id').eq('status', 'sending').not('materialized_at', 'is', null)
  let n = 0
  for (const c of data ?? []) {
    const { count } = await db.from('mkt_sends').select('id', { count: 'exact', head: true })
      .eq('campaign_id', c.id).in('status', ['pending', 'sending'])
    if (count === 0) {
      const agora = new Date().toISOString()
      await db.from('mkt_campaigns').update({ status: 'completed', completed_at: agora, updated_at: agora }).eq('id', c.id).eq('status', 'sending')
      n++
    }
  }
  return n
}

async function rodarDrain() {
  const inicio = Date.now()
  const db = getAdminSupabase()
  const promovidas = await promover(db)

  // falha ao montar a fila não pode impedir o envio do que já está pendente
  let materializacao: Awaited<ReturnType<typeof materializar>> | { erro: string } = null
  try {
    materializacao = await materializar(db)
  } catch (err) {
    console.error('[mkt/drain] materialização:', err)
    materializacao = { erro: err instanceof Error ? err.message : String(err) }
  }

  const envio = await enviar(db, inicio)
  const concluidas = await concluir(db)
  await marcarRotina(db, 'mkt-drain', `${envio.enviados} enviados, ${envio.falhas} falhas`)
  return { promovidas, materializacao, ...envio, concluidas }
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json({ ok: true, ...(await rodarDrain()) })
  } catch (err) {
    console.error('[mkt/drain]', err)
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
