import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'

// Salva a resposta do quiz em duas etapas: ao terminar as perguntas (completo:
// false, só respostas) e ao enviar o contato (completo: true). A 2ª chamada
// atualiza a mesma linha pelo id que a 1ª devolveu. Grava com service_role —
// a tabela tem RLS sem política, ninguém de fora lê contato de cliente.

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
const ANSWER_KEYS = new Set([
  'status_cliente', 'origem', 'freq_anuncios', 'impedimentos', 'seguranca', 'percepcao_preco',
  'preco_max', 'oferta_preferida', 'segundo_oculos', 'lente_preferida', 'resposta_aberta', 'esporte', 'freq_treino',
])

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : null) || null

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  // Só as chaves conhecidas do quiz, com tamanho limitado — o corpo vem do navegador.
  const raw = (body.respostas ?? {}) as Record<string, unknown>
  const respostas: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!ANSWER_KEYS.has(k)) continue
    respostas[k] = Array.isArray(v) ? v.slice(0, 12).map(x => String(x).slice(0, 40)) : String(v).slice(0, 1000)
  }

  const completo = body.completo === true
  const row: Record<string, unknown> = {
    respostas,
    completo,
    session_id: str(body.session_id, 64),
    visitor_id: str(body.visitor_id, 64),
    updated_at: new Date().toISOString(),
  }
  for (const k of UTM_KEYS) row[k] = str(body[k])

  if (completo) {
    const whatsapp = String(body.whatsapp ?? '').replace(/\D/g, '').slice(0, 13)
    const email = str(body.email, 160)?.toLowerCase() ?? null
    if (!str(body.nome) || whatsapp.length < 10 || !email || !/^\S+@\S+\.\S+$/.test(email) || body.consentimento !== true) {
      return NextResponse.json({ ok: false, error: 'dados incompletos' }, { status: 400 })
    }
    Object.assign(row, {
      nome: str(body.nome, 120), whatsapp, email,
      cidade: str(body.cidade, 120), estado: str(body.estado, 2), faixa_idade: str(body.faixa_idade, 20),
      consentimento: true,
    })
  }

  const db = getAdminSupabase()
  const id = str(body.id, 40)
  if (id && /^[0-9a-f-]{36}$/i.test(id)) {
    // Resposta que já gerou cupom fica congelada (o cupom é a prova do bônus).
    const { data, error } = await db.from('quiz_respostas').update(row).eq('id', id).is('cupom', null).select('id')
    if (!error && data && data.length > 0) return NextResponse.json({ ok: true, id })
    if (error) console.error('[quiz/lead] update falhou:', error)
  }
  const { data, error } = await db.from('quiz_respostas').insert(row).select('id').single()
  if (error || !data) {
    console.error('[quiz/lead] insert falhou:', error)
    return NextResponse.json({ ok: false, error: 'não foi possível salvar' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: data.id })
}
