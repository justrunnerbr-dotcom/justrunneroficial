// UTMs de e-mail. A atribuição de venda por campanha usa utm_campaign = slug do
// nome da campanha (utm_source=email, utm_medium=email).

export const SITE_URL = 'https://justrunner.com.br'

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'email'
}

/** Link da loja com UTM de e-mail. Aceita caminho ("/colecao") ou URL completa. */
export function linkEmail(caminho: string, campanha: string, conteudo?: string): string {
  const u = new URL(caminho.startsWith('http') ? caminho : `${SITE_URL}${caminho.startsWith('/') ? '' : '/'}${caminho}`)
  u.searchParams.set('utm_source', 'email')
  u.searchParams.set('utm_medium', 'email')
  u.searchParams.set('utm_campaign', campanha)
  if (conteudo) u.searchParams.set('utm_content', conteudo)
  return u.toString()
}

/** Põe UTM em todo href que aponta para justrunner.com.br e ainda não tem
 *  utm_campaign. Vale para HTML do kit e HTML colado à mão. Não mexe no link de
 *  descadastro nem em href com {{variavel}} (a variável já vem pronta). */
export function aplicarUtm(html: string, campanha: string): string {
  return html.replace(/href="(https?:\/\/(?:www\.)?justrunner\.com\.br[^"]*)"/gi, (inteiro, url: string) => {
    if (url.includes('descadastro-email-marketing') || url.includes('{{') || /[?&]utm_campaign=/.test(url)) return inteiro
    try {
      return `href="${linkEmail(url.replace(/&amp;/g, '&'), campanha).replace(/&/g, '&amp;')}"`
    } catch {
      return inteiro
    }
  })
}
