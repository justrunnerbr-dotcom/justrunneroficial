// Usuários do admin.
//
// Até agora havia uma senha única, o que tornava impossível qualquer auditoria
// por pessoa: toda ação no painel era simplesmente "alguém".
//
// Configuração em `ADMIN_USERS`, no formato `usuario:senha,outro:senha`:
//
//     ADMIN_USERS=rafael:umaSenhaLonga,socio:outraSenhaLonga
//
// Se `ADMIN_USERS` não existir, cai no `ADMIN_PASSWORD` antigo como usuário
// "admin". Esse fallback é deliberado: sem ele, um deploy antes de configurar a
// variável nova trancaria o dono do lado de fora do painel de produção.

export interface AdminUser {
  name:     string
  password: string
}

export function getAdminUsers(): AdminUser[] {
  const raw = process.env.ADMIN_USERS?.trim()

  if (raw) {
    const users = raw
      .split(',')
      .map(entry => entry.trim())
      .filter(Boolean)
      .map(entry => {
        const sep = entry.indexOf(':')
        if (sep <= 0) return null
        const name     = entry.slice(0, sep).trim()
        const password = entry.slice(sep + 1).trim()
        if (!name || !password) return null
        return { name, password }
      })
      .filter((u): u is AdminUser => u !== null)

    if (users.length > 0) return users
    console.error('[admin-users] ADMIN_USERS definida mas ilegível — esperado "usuario:senha,outro:senha". Usando ADMIN_PASSWORD.')
  }

  const legacy = process.env.ADMIN_PASSWORD
  return legacy ? [{ name: 'admin', password: legacy }] : []
}

/**
 * Confere as credenciais e devolve o nome do usuário, ou null.
 *
 * A comparação percorre TODOS os usuários mesmo depois de achar o certo, pra
 * que o tempo de resposta não revele quantos usuários existem nem qual nome é
 * válido.
 */
export function authenticate(name: string, password: string): string | null {
  let matched: string | null = null

  for (const u of getAdminUsers()) {
    if (u.name === name && u.password === password) matched = u.name
  }

  return matched
}

/** Só pra UI: informa se o login deve pedir usuário ou só a senha antiga. */
export function isMultiUser(): boolean {
  return !!process.env.ADMIN_USERS?.trim()
}
