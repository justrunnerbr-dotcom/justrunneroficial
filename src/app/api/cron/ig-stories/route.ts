import { NextResponse } from 'next/server'
import { rodarStories } from '@/lib/ig/stories'
import { rodarFeed } from '@/lib/ig/feed'
import { getAdminSupabase } from '@/lib/admin-client'
import { marcarRotina } from '@/lib/admin/rotinas'

export const runtime = 'nodejs'
// vídeo pode levar alguns segundos para o Instagram processar (60 s é o teto do
// plano Hobby; vídeo que não terminar volta 'publicando' e o próximo ciclo segue)
export const maxDuration = 60

/** A cada 5 min: publica os stories e os reels aprovados que venceram e atualiza as métricas dos que estão no ar. */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  try {
    const r = await rodarStories()
    // Reels/feed no mesmo ciclo de 5 min (sem job novo no pg_cron). Falha do
    // feed não derruba os stories.
    const feed = await rodarFeed().catch(err => ({ erro: err instanceof Error ? err.message : String(err) }))
    const f = 'erro' in feed ? `reels: ${feed.erro}` : `reels: ${feed.publicados} publicados, ${feed.erros} erros`
    await marcarRotina(getAdminSupabase(), 'ig-stories', `${r.publicados} publicados, ${r.erros} erros · ${f}`)
    return NextResponse.json({ ok: true, ...r, feed })
  } catch (err) {
    console.error('[cron ig-stories]', err)
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
