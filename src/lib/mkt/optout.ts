import { getAdminSupabase } from '@/lib/admin-client'
import { SITE_URL } from '@/lib/mkt/utm'

type Db = ReturnType<typeof getAdminSupabase>

export const normalizarEmail = (e: string) => e.trim().toLowerCase()
export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

/** Registra o descadastro (sem duplicar a linha se a pessoa clicar 2x). */
export async function recordOptout(params: { email: string; reason?: string }): Promise<void> {
  const email = normalizarEmail(params.email)
  if (!emailValido(email)) throw new Error('e-mail inválido')
  const db = getAdminSupabase()
  const { data: existe } = await db.from('mkt_optouts').select('id').eq('email', email).limit(1)
  if (existe && existe.length) return
  const { error } = await db.from('mkt_optouts').insert({ email, reason: params.reason ?? null })
  if (error) throw new Error(error.message)
}

/** Lê uma coluna inteira de e-mails paginando por id (o PostgREST corta em 1000). */
async function lerEmails(db: Db, tabela: 'mkt_optouts' | 'mkt_sends'): Promise<Set<string>> {
  const coluna = tabela === 'mkt_optouts' ? 'email' : 'contact_email'
  const out = new Set<string>()
  for (let de = 0; ; de += 1000) {
    let q = db.from(tabela).select(coluna).not(coluna, 'is', null)
    if (tabela === 'mkt_sends') q = q.eq('status', 'bounced')
    const { data, error } = await q.order('id').range(de, de + 999)
    if (error) throw new Error(error.message)
    const pagina = (data ?? []) as unknown as Record<string, string>[]
    for (const r of pagina) out.add(normalizarEmail(r[coluna]))
    if (pagina.length < 1000) break
  }
  return out
}

/** Quem não pode receber: descadastrou OU já deu bounce (insistir derruba a
 *  reputação do domínio e manda os próximos e-mails para o spam). */
export async function emailsBloqueados(db: Db = getAdminSupabase()): Promise<Set<string>> {
  const [optouts, bounces] = await Promise.all([
    lerEmails(db, 'mkt_optouts'),
    lerEmails(db, 'mkt_sends'), // só status = 'bounced'
  ])
  for (const e of bounces) optouts.add(e)
  return optouts
}

/** Rodapé obrigatório (LGPD) para HTML colado à mão que não trouxe o link. */
export function rodapeDescadastro(): string {
  return `
<table role="presentation" width="100%" style="margin-top:24px;border-top:1px solid #e3e5e8;padding-top:16px;">
  <tr><td style="text-align:center;font-family:Arial,sans-serif;font-size:11px;color:#7d838d;">
    Just Runner · justrunner.com.br — você recebe este e-mail porque é cliente da loja.<br/>
    <a href="${SITE_URL}/descadastro-email-marketing?email={{email}}" style="color:#7d838d;text-decoration:underline;">Não quero mais receber e-mails</a>
  </td></tr>
</table>`
}

function documento(corpo: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="format-detection" content="telephone=no">
<style>body { margin:0; padding:0; }</style>
</head>
<body style="margin:0;padding:0;">
${corpo}
</body>
</html>`
}

/** Ponto único que deixa o corpo de um modelo pronto para envio.
 *  - Documento completo (kit): não embrulha de novo, só garante o descadastro.
 *  - Fragmento (HTML à mão): rodapé + documento com meta viewport. */
export function prepararHtmlEmail(body: string): string {
  if (/<html[\s>]/i.test(body)) {
    if (body.includes('descadastro-email-marketing')) return body
    return /<\/body>/i.test(body) ? body.replace(/<\/body>/i, `${rodapeDescadastro()}\n</body>`) : body + rodapeDescadastro()
  }
  return documento(body + rodapeDescadastro())
}
