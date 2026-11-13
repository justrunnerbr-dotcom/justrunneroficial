import { checkAuth, unauthorized } from '@/lib/admin/auth'
import { getTemplate } from '@/lib/mkt/templates'
import { prepararHtmlEmail } from '@/lib/mkt/optout'
import { renderTemplate, varsExemplo } from '@/lib/mkt/template'
import { aplicarUtm, linkEmail, SITE_URL } from '@/lib/mkt/utm'

// Prévia de um modelo no admin, pelo mesmo preparo do envio real (rodapé + UTM),
// com valores de exemplo nas variáveis.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth())) return unauthorized()
  const { id } = await params
  const tpl = await getTemplate(id)
  if (!tpl) return new Response('Modelo não encontrado', { status: 404 })
  const html = renderTemplate(aplicarUtm(prepararHtmlEmail(tpl.body), 'previa'), varsExemplo('cliente@exemplo.com', linkEmail(SITE_URL, 'previa')))
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Frame-Options': 'SAMEORIGIN' },
  })
}
