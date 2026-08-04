import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/admin/session'

// Roda no Edge runtime — por isso a verificação da sessão usa Web Crypto
// (`crypto.subtle`) e não `node:crypto`, que não existe aqui.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/admin/login') return NextResponse.next()

  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
    process.env.ADMIN_SECRET,
  )

  if (!session) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    const res = NextResponse.redirect(loginUrl)
    // Cookie vencido ou adulterado não deve ficar para trás gerando um novo
    // redirecionamento a cada navegação.
    res.cookies.delete(SESSION_COOKIE)
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
