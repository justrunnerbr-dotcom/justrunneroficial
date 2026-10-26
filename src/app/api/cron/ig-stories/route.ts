import { NextResponse } from 'next/server'
import { rodarStories } from '@/lib/ig/stories'
import { getAdminSupabase } from '@/lib/admin-client'
import { marcarRotina } from '@/lib/admin/rotinas'

export const runtime = 'nodejs'
// vídeo pode levar alguns segundos para o Instagram processar (60 s é o teto do
// plano Hobby; vídeo que não terminar volta 'publicando' e o próximo ciclo segue)
export const maxDuration = 60

/** A cada 5 min: publica os stories aprovados que venceram e atualiza as métricas dos que estão no ar. */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  try {
    const r = await rodarStories()
    await marcarRotina(getAdminSupabase(), 'ig-stories', `${r.publicados} publicados, ${r.erros} erros`)
    return NextResponse.json({ ok: true, ...r })
  } catch (err) {
    console.error('[cron ig-stories]', err)
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
