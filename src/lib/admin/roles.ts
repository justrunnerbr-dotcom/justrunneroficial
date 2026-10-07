// Áreas de acesso do admin.
//
// Até 2026-08-25 todo mundo que logava via o painel inteiro: `checkAuth()` só
// perguntava "existe sessão válida?". Isso passou a não servir quando entrou um
// colaborador para trabalhar SÓ a recuperação de vendas — ele não deve ver
// custo, margem, faturamento nem as contas de anúncio.
//
// Configuração em `ADMIN_ROLES`, no formato `usuario:area,outro:area`:
//
//     ADMIN_ROLES=Marujo:recuperacao
//
// Quem não estiver listado é `full` — assim os sócios seguem com acesso total
// sem precisar de configuração nenhuma, e um deploy sem a variável não tranca
// ninguém do lado de fora.
//
// Por que fica FORA de `ADMIN_USERS`: lá o separador é `:` e a senha é tudo que
// vem depois do primeiro deles, então uma senha com `:` tornaria o papel
// ambíguo. Variável separada não tem esse problema.
//
// Roda também no Edge (o middleware importa daqui): nada de `node:*`.

export type AdminArea = 'full' | 'recuperacao'

export const DEFAULT_AREA: AdminArea = 'full'

const AREAS: readonly AdminArea[] = ['full', 'recuperacao']

function isArea(value: string): value is AdminArea {
  return (AREAS as readonly string[]).includes(value)
}

/** Área do usuário. Nome desconhecido ou área ilegível cai em `full`. */
export function getUserArea(user: string): AdminArea {
  const raw = process.env.ADMIN_ROLES?.trim()
  if (!raw) return DEFAULT_AREA

  for (const entry of raw.split(',')) {
    const sep = entry.indexOf(':')
    if (sep <= 0) continue
    const name = entry.slice(0, sep).trim()
    const area = entry.slice(sep + 1).trim()
    if (name !== user) continue
    if (isArea(area)) return area
    console.error(`[admin-roles] área "${area}" desconhecida para "${user}" — tratando como ${DEFAULT_AREA}.`)
    return DEFAULT_AREA
  }

  return DEFAULT_AREA
}

/**
 * A sessão de `area` pode acessar um recurso que exige `required`?
 *
 * `full` abre tudo. Qualquer outra área só abre o que exige exatamente ela —
 * ou seja, **nega por padrão**: como `required` vale `full` quando não é
 * informado, toda rota nova nasce fechada para o usuário restrito, e só passa a
 * aceitá-lo quando alguém declarar isso de propósito.
 */
export function canAccess(area: AdminArea, required: AdminArea = DEFAULT_AREA): boolean {
  if (area === 'full') return true
  return area === required
}

/** Para onde mandar o usuário restrito que tentar abrir outra parte do painel. */
export const AREA_HOME: Record<AdminArea, string> = {
  full:        '/admin',
  recuperacao: '/admin/recuperar-vendas',
}

/**
 * Páginas do painel que cada área enxerga. `full` não aparece aqui porque não
 * tem restrição. Prefixos: qualquer subrota abaixo deles também vale.
 */
const AREA_PAGES: Record<Exclude<AdminArea, 'full'>, readonly string[]> = {
  recuperacao: ['/admin/recuperar-vendas', '/admin/clientes-sumidos'],
}

/** A área pode abrir esta página do painel? */
export function canOpenPage(area: AdminArea, pathname: string): boolean {
  if (area === 'full') return true
  return AREA_PAGES[area].some(p => pathname === p || pathname.startsWith(`${p}/`))
}
