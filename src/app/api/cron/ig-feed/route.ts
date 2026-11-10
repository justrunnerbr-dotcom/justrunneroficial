import { NextResponse } from 'next/server'
import { rodarFeed } from '@/lib/ig/feed'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Sob demanda: publica os reels/posts aprovados que venceram. O ciclo de 5 min roda dentro do ig-stories (pg_cron). */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json({ ok: true, ...(await rodarFeed()) })
  } catch (err) {
    console.error('[cron ig-feed]', err)
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
