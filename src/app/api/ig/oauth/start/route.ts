import { NextResponse } from 'next/server'
import { buildAuthorizeUrl } from '@/lib/ig/instagram'

export async function GET(request: Request) {
  const redirectUri = `${new URL(request.url).origin}/api/ig/oauth/callback`
  return NextResponse.redirect(buildAuthorizeUrl(redirectUri))
}
