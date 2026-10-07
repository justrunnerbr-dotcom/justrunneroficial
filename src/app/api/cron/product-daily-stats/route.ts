import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'

/**
 * Recalcula o rollup de comportamento por produto.
 *
 * Roda para ontem e hoje: hoje ainda está recebendo evento, e ontem pode ter
 * recebido evento atrasado depois da última execução.
 *
 * Falha ruidosamente de propósito. O sync da Meta ficou dias gravando zero
 * registro e reportando sucesso — ninguém viu porque nada reclamava. Aqui,
 * dia com sessão e zero produto agregado devolve 500.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )

  const hoje = new Date()
  const ontem = new Date(hoje.getTime() - 86_400_000)
  const dias = [ontem, hoje].map(d => d.toISOString().slice(0, 10))

  const resultados: Array<{ date: string; products: number; error?: string }> = []

  for (const date of dias) {
    const { data, error } = await db.rpc('refresh_product_daily_stats', {
      p_store_id: STORE_ID,
      p_date: date,
    })
    resultados.push({
      date,
      products: typeof data === 'number' ? data : 0,
      ...(error ? { error: error.message } : {}),
    })
  }

  const comErro = resultados.filter(r => r.error)
  if (comErro.length > 0) {
    return NextResponse.json(
      { ok: false, error: 'Falha ao atualizar o rollup', resultados },
      { status: 500 },
    )
  }

  // Zero produto em ontem é suspeito: um dia inteiro sem nenhuma visualização
  // de produto significa que a coleta parou, não que ninguém entrou na loja.
  const ontemResultado = resultados[0]
  if (ontemResultado.products === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Nenhum produto agregado em ${ontemResultado.date} — provável parada na coleta de eventos`,
        resultados,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, resultados })
}
