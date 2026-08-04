import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { authenticate } from '@/lib/admin/users'
import { signSession, verifySession, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/admin/session'
import { logAudit, countRecentLoginFailures } from '@/lib/admin/audit'
import { clientIp } from '@/lib/admin/auth'

const JANELA_MINUTOS = 15
const MAX_TENTATIVAS = 10

export async function POST(request: Request) {
  const ip = clientIp(request)

  // O limitador antigo vivia num Map em memória: em serverless cada instância
  // tem o próprio Map e cold start zera a contagem — na prática quase não
  // limitava. Agora a contagem vem do log de auditoria, que é compartilhado.
  const falhas = await countRecentLoginFailures(ip, JANELA_MINUTOS)
  if (falhas >= MAX_TENTATIVAS) {
    return NextResponse.json(
      { error: `Muitas tentativas. Aguarde ${JANELA_MINUTOS} minutos.` },
      { status: 429 },
    )
  }

  const body     = await request.json().catch(() => ({})) as { user?: string; password?: string }
  const password = String(body.password ?? '')
  // Sem ADMIN_USERS configurada existe só o usuário "admin" (senha antiga),
  // então o campo de usuário é opcional e assume esse valor.
  const user     = String(body.user ?? 'admin').trim() || 'admin'

  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json(
      { error: 'Admin não configurado. Defina ADMIN_SECRET e ADMIN_USERS (ou ADMIN_PASSWORD).' },
      { status: 503 },
    )
  }

  const authenticated = authenticate(user, password)

  if (!authenticated) {
    await logAudit({
      actor:   user || 'anonimo',
      action:  'login_falhou',
      ip,
      summary: `Tentativa de login falhou para "${user}"`,
    })
    const restantes = Math.max(0, MAX_TENTATIVAS - (falhas + 1))
    return NextResponse.json(
      { error: `Credenciais incorretas. ${restantes} tentativa(s) restante(s).` },
      { status: 401 },
    )
  }

  const token = await signSession(authenticated, adminSecret)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   SESSION_TTL_SECONDS,
    path:     '/',
  })

  await logAudit({
    actor:   authenticated,
    action:  'login_ok',
    ip,
    summary: `${authenticated} entrou no admin`,
  })

  return NextResponse.json({ ok: true, user: authenticated })
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies()

  const session = await verifySession(
    cookieStore.get(SESSION_COOKIE)?.value,
    process.env.ADMIN_SECRET,
  )

  cookieStore.delete(SESSION_COOKIE)

  if (session) {
    await logAudit({
      actor:   session.u,
      action:  'logout',
      ip:      clientIp(request),
      summary: `${session.u} saiu do admin`,
    })
  }

  return NextResponse.json({ ok: true })
}
