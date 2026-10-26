import { NextResponse } from 'next/server'
import { exchangeCodeForShortToken, exchangeForLongLivedToken, getProfile, subscribeWebhooks } from '@/lib/ig/instagram'
import { getAdminSupabase } from '@/lib/admin-client'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = url.origin
  const code = url.searchParams.get('code')
  const errorParam = url.searchParams.get('error')

  if (errorParam || !code) {
    return NextResponse.redirect(`${origin}/admin/instagram?erro=${encodeURIComponent(errorParam ?? 'sem_code')}`)
  }

  try {
    const redirectUri = `${origin}/api/ig/oauth/callback`
    const short = await exchangeCodeForShortToken(code, redirectUri)
    const long = await exchangeForLongLivedToken(short.access_token)
    const profile = await getProfile(long.access_token)

    // grava o token antes de inscrever o webhook: se a inscrição falhar
    // (webhook ainda não configurado no app), a conexão não se perde
    const db = getAdminSupabase()
    const { error } = await db.from('ig_config').upsert({
      id: 1,
      ig_user_id: profile.user_id,
      ig_username: profile.username,
      profile_picture_url: profile.profile_picture_url ?? null,
      access_token: long.access_token,
      token_expires_at: new Date(Date.now() + long.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    if (error) throw new Error(`gravar ig_config falhou: ${error.message}`)

    try {
      await subscribeWebhooks(profile.user_id, long.access_token)
    } catch (err) {
      return NextResponse.redirect(`${origin}/admin/instagram?conectado=1&webhook=${encodeURIComponent(String(err))}`)
    }

    return NextResponse.redirect(`${origin}/admin/instagram?conectado=1`)
  } catch (err) {
    return NextResponse.redirect(`${origin}/admin/instagram?erro=${encodeURIComponent(String(err))}`)
  }
}
