import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// In-memory rate limit: 5 attempts per IP per 15 minutes
const attempts = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

function checkRateLimit(ip: string): { ok: boolean; remaining: number } {
  const now  = Date.now()
  const WINDOW = 15 * 60 * 1000 // 15 min
  const MAX    = 10

  const entry = attempts.get(ip)
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW })
    return { ok: true, remaining: MAX - 1 }
  }
  entry.count++
  if (entry.count > MAX) return { ok: false, remaining: 0 }
  return { ok: true, remaining: MAX - entry.count }
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rate = checkRateLimit(ip)

  if (!rate.ok) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde 15 minutos.' },
      { status: 429 },
    )
  }

  const { password }    = await request.json()
  const adminPassword   = process.env.ADMIN_PASSWORD
  const adminSecret     = process.env.ADMIN_SECRET

  if (!adminPassword || !adminSecret) {
    return NextResponse.json(
      { error: 'Admin não configurado. Defina ADMIN_PASSWORD e ADMIN_SECRET no Vercel.' },
      { status: 503 },
    )
  }

  if (password !== adminPassword) {
    return NextResponse.json(
      { error: `Senha incorreta. ${rate.remaining} tentativas restantes.` },
      { status: 401 },
    )
  }

  // Reset rate limit on successful login
  attempts.delete(ip)

  const cookieStore = await cookies()
  cookieStore.set('jhf_admin', adminSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('jhf_admin')
  return NextResponse.json({ ok: true })
}
