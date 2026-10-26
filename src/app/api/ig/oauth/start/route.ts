import { NextResponse } from 'next/server'
import { buildAuthorizeUrl } from '@/lib/ig/instagram'

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  try {
    return NextResponse.redirect(buildAuthorizeUrl(`${origin}/api/ig/oauth/callback`))
  } catch (err) {
    // sem IG_APP_ID na Vercel: volta pro admin com o motivo em vez de tela 500
    return NextResponse.redirect(`${origin}/admin/instagram?erro=${encodeURIComponent(String(err))}`)
  }
}
