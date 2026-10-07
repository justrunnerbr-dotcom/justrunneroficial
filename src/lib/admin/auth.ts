import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/admin/session'
import { canAccess, getUserArea, type AdminArea } from '@/lib/admin/roles'

// Guarda única de autenticação do admin.
//
// Antes desta função cada rota em /api/admin declarava a própria cópia de
// checkAuth(). Eram 32 cópias idênticas — e a de /api/admin/meta-analysis
// simplesmente não foi feita, deixando aberto um endpoint que lê faturamento e
// dispara a API paga da Anthropic. Guarda duplicada é guarda que uma hora falta:
// centralizar aqui é o que impede o mesmo buraco de voltar na próxima rota.
//
// A validação em si mora em session.ts — aqui só se lê o cookie e se traduz o
// resultado pro formato que as rotas usam.

export { SESSION_COOKIE }

export interface AdminSession {
  /** Quem está autenticado. Vem do token assinado, não de um valor fixo. */
  user: string
  /** O que essa pessoa pode acessar. Lido do ambiente a cada chamada, não do
   *  token — assim tirar ou mudar o acesso de alguém vale na hora, sem esperar
   *  a sessão de 7 dias expirar. */
  area: AdminArea
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const payload = await verifySession(
    cookieStore.get(SESSION_COOKIE)?.value,
    process.env.ADMIN_SECRET,
  )

  return payload ? { user: payload.u, area: getUserArea(payload.u) } : null
}

/**
 * Tem sessão válida E permissão para esta área?
 *
 * `required` vale `full` quando não é informado — de propósito. Isso faz toda
 * rota existente e toda rota futura nascerem fechadas para usuário restrito;
 * abrir uma delas exige passar a área explicitamente, o que é uma decisão
 * visível na revisão em vez de um esquecimento silencioso.
 */
export async function checkAuth(required: AdminArea = 'full'): Promise<boolean> {
  const session = await getAdminSession()
  return session !== null && canAccess(session.area, required)
}

/** Nome de quem está agindo, pra gravar no log de auditoria. */
export async function currentActor(): Promise<string> {
  return (await getAdminSession())?.user ?? 'desconhecido'
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}

/** IP de quem chamou, pra auditoria e limite de tentativas. */
export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}
