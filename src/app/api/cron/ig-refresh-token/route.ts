import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'
import { refreshLongLivedToken } from '@/lib/ig/instagram'

export const runtime = 'nodejs'

// Renova o token 1x por semana (ele dura 60 dias). Na JHF o token venceu em
// 02/10/2026 sem ninguém perceber quando só o pg_cron chamava; aqui é o cron da Vercel.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const db = getAdminSupabase()
  const { data } = await db.from('ig_config').select('access_token').eq('id', 1).single()
  if (!data?.access_token) return NextResponse.json({ ok: false, error: 'sem token pra renovar' })

  try {
    const refreshed = await refreshLongLivedToken(data.access_token)
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    await db.from('ig_config').update({
      access_token: refreshed.access_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }).eq('id', 1)
    return NextResponse.json({ ok: true, expiresAt })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 })
  }
}
