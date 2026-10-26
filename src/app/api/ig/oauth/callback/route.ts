import { NextResponse } from 'next/server'
import { exchangeCodeForShortToken, exchangeForLongLivedToken, getProfile, subscribeWebhooks, IG_REDIRECT_URI } from '@/lib/ig/instagram'
import { getAdminSupabase } from '@/lib/admin-client'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = url.origin
  const code = url.searchParams.get('code')
  const errorParam = url.searchParams.get('error')

  if (errorParam || !code) {
    // mostra tudo o que a Meta mandou (error_reason/error_description etc.):
    // em 26/10/2026 a volta chegou sem code e sem error, e só "sem_code" não dizia nada
    const veio = [...url.searchParams].map(([k, v]) => `${k}=${v}`).join(' · ')
    const motivo = errorParam ? `${errorParam}${veio ? ` (${veio})` : ''}` : `sem_code${veio ? ` (${veio})` : ' (a volta não trouxe nenhum parâmetro)'}`
    return NextResponse.redirect(`${origin}/admin/instagram?erro=${encodeURIComponent(motivo)}`)
  }

  try {
    const short = await exchangeCodeForShortToken(code, IG_REDIRECT_URI)
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
