import { NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { getAdminSupabase } from '@/lib/admin-client'
import { QUIZ_BONUS, QUIZ_VALIDADE, QUIZ_MIN_SUBTOTAL, QUIZ_DESTINO } from '@/lib/quiz/bonus'

// Gera o cupom único do bônus do quiz na Yampi. O cupom aponta pro brinde do
// modelo escolhido, vale uma vez e só libera o brinde com subtotal cheio de
// R$ 594 (2 óculos do Compre 1 Leve 2). Um bônus por pessoa: se o mesmo
// WhatsApp ou e-mail já tem cupom, devolve o que já existe.

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem 0/O/1/I
const novoCodigo = () => 'QUIZ' + Array.from({ length: 6 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')

function agoraSP(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(/ /g, ' ')
}

export async function POST(req: Request) {
  let body: { id?: string; bonusId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  const bonus = QUIZ_BONUS.find(b => b.id === body.bonusId)
  if (!bonus || !body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) {
    return NextResponse.json({ ok: false, error: 'pedido inválido' }, { status: 400 })
  }
  if (agoraSP() > QUIZ_VALIDADE) {
    return NextResponse.json({ ok: false, error: 'promoção encerrada' }, { status: 410 })
  }

  const db = getAdminSupabase()
  const { data: lead } = await db.from('quiz_respostas')
    .select('id, completo, consentimento, whatsapp, email, cupom')
    .eq('id', body.id).maybeSingle()
  if (!lead || !lead.completo || !lead.consentimento) {
    return NextResponse.json({ ok: false, error: 'responda o quiz completo' }, { status: 403 })
  }
  if (lead.cupom) return NextResponse.json({ ok: true, code: lead.cupom, destino: QUIZ_DESTINO })

  // Um bônus por pessoa (mesmo WhatsApp ou e-mail em outra resposta).
  // Duas consultas em vez de .or(): o e-mail vem do navegador e não entra em texto de filtro.
  for (const [col, val] of [['whatsapp', lead.whatsapp], ['email', lead.email]] as const) {
    if (!val) continue
    const { data: anterior } = await db.from('quiz_respostas')
      .select('cupom').not('cupom', 'is', null).eq(col, val).limit(1).maybeSingle()
    if (anterior?.cupom) return NextResponse.json({ ok: true, code: anterior.cupom, destino: QUIZ_DESTINO })
  }

  const headers = {
    'User-Token': process.env.YAMPI_API_TOKEN!, 'User-Secret-Key': process.env.YAMPI_SECRET_KEY!,
    Accept: 'application/json', 'Content-Type': 'application/json',
  }
  // Código colidindo com um existente volta 422; tenta de novo com outro.
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const code = novoCodigo()
    const res = await fetch(`https://api.dooki.com.br/v2/${process.env.NEXT_PUBLIC_YAMPI_ALIAS}/pricing/promocodes`, {
      method: 'POST', headers, cache: 'no-store',
      body: JSON.stringify({
        code, description: `Bônus do quiz — ${bonus.nome}`,
        value: 0, discount_type: 'v', quantity: 1, once_per_customer: true, accumulate: false,
        min_value: QUIZ_MIN_SUBTOTAL, freebie_id: bonus.freebieId, active: true, advertise: false,
        start_at: agoraSP(), end_at: QUIZ_VALIDADE,
      }),
    })
    const json = await res.json().catch(() => ({})) as { data?: { id: number } }
    if (res.ok && json.data?.id) {
      const { error } = await db.from('quiz_respostas')
        .update({ cupom: code, cupom_yampi_id: json.data.id, modelo_brinde: bonus.id, updated_at: new Date().toISOString() })
        .eq('id', lead.id)
      if (error) console.error('[quiz/bonus] cupom criado mas não salvo:', code, error)
      return NextResponse.json({ ok: true, code, destino: QUIZ_DESTINO })
    }
    if (res.status !== 422) {
      console.error('[quiz/bonus] Yampi recusou o cupom:', res.status, JSON.stringify(json).slice(0, 300))
      break
    }
  }
  return NextResponse.json({ ok: false, error: 'não foi possível gerar o bônus agora' }, { status: 502 })
}
