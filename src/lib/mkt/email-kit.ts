// Kit de e-mail da Just Runner: blocos prontos → HTML de e-mail (porte do kit da JHF).
//
// Feito para funcionar nos clientes que importam (Gmail app/web, Apple Mail/iOS,
// Outlook app e Outlook desktop):
// - layout em <table>, 600px no desktop e 100% no celular;
// - grade de produtos "híbrida": colunas em inline-block que caem sozinhas uma
//   embaixo da outra no celular, sem depender de @media (o Gmail de contas
//   não-Google ignora <style>), com tabela-fantasma [if mso] para o Outlook;
// - Poppins/Montserrat onde o cliente aceita (Apple Mail, iOS), Helvetica/Arial no resto;
// - `color-scheme: light` para o modo escuro não inverter a marca.
//
// Marca: preto do site (#0a0b0d) + verde (--green de public/tema/assets/style.css).
// O documento sai COMPLETO (<!DOCTYPE>, <head>, rodapé de descadastro com {{email}}).
// `prepararHtmlEmail` (optout.ts) reconhece isso e não embrulha de novo.
// Links: caminhos do site ("/colecao") ou URLs de justrunner.com.br. A UTM da
// campanha (utm_source=email, utm_medium=email, utm_campaign=<slug>) entra na
// montagem da fila (aplicarUtm em utm.ts), então o mesmo modelo serve a várias campanhas.

import { formatPrice } from '@/lib/utils'
import { SITE_URL, linkEmail } from '@/lib/mkt/utm'

const SITE = SITE_URL
// Logo preto com fundo transparente (public/tema/fotos/logo.png), numa célula
// branca. No modo escuro forçado do Gmail pode perder contraste — se acontecer,
// trocar por uma versão com fundo branco chapado (a JHF teve o mesmo problema).
export const LOGO_EMAIL = `${SITE}/tema/fotos/logo.png`
export const MARCADOR_KIT = '<!-- jr-email-kit -->'

const COR = {
  fundo: '#f3f4f5',
  card: '#ffffff',
  texto: '#2a2e34',
  titulo: '#0d0f12',
  suave: '#4a5058',
  borda: '#e3e5e8',
  preto: '#0a0b0d',
  verde: '#14532d',
  verdeTexto: '#1c6b3b',
  laranja: '#ff8a2a',
  destaque: '#ecf8f0',
  destaqueBorda: '#cfe9d8',
}
const FONTE_TITULO = "'Poppins', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const FONTE_TEXTO = "'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif"

export interface ProdutoEmail {
  nome: string
  variante?: string | null
  preco: number
  precoDe?: number | null
  imagem: string | null
  url: string
  selo?: string | null
}

export interface AvaliacaoEmail {
  imagem: string
  usuario: string
  link: string
  parceiro?: boolean
}

export type BlocoEmail =
  | { tipo: 'faixa'; texto: string; cor?: 'preto' | 'verde' | 'laranja' }
  | { tipo: 'topo' }
  | { tipo: 'hero'; imagem?: string | null; link?: string; sobretitulo?: string; titulo: string; texto?: string; botao?: { texto: string; url: string } }
  | { tipo: 'titulo'; texto: string; sobretitulo?: string; centralizado?: boolean }
  | { tipo: 'texto'; texto: string; centralizado?: boolean }
  | { tipo: 'botao'; texto: string; url: string; estilo?: 'preto' | 'contorno' }
  | { tipo: 'produtos'; itens: ProdutoEmail[]; colunas?: 1 | 2 | 3; titulo?: string; botaoTexto?: string; /** vitrine de brinde/bônus: sem preço */ ocultarPreco?: boolean }
  | { tipo: 'oferta'; titulo: string; linhas: { rotulo: string; valor: string; destaque?: boolean }[]; nota?: string; botao?: { texto: string; url: string } }
  | { tipo: 'cupom'; codigo: string; texto: string; validade?: string }
  | { tipo: 'avaliacoes'; titulo?: string; itens: AvaliacaoEmail[]; link?: string }
  | { tipo: 'beneficios'; itens?: { titulo: string; texto: string }[] }
  /** depoimentos em texto com 5 estrelas (os mesmos do carrinho do site / checkout da Yampi) */
  | { tipo: 'depoimentos'; titulo?: string; itens: { texto: string; nome: string }[] }
  | { tipo: 'imagem'; src: string; alt: string; link?: string; /** versão do celular (troca por @media; sem <style>, fica a de computador) */ srcMobile?: string; semMargem?: boolean }
  | { tipo: 'divisor' }
  | { tipo: 'espaco'; altura?: number }

export interface EmailDoc {
  assunto: string
  /** Texto que aparece ao lado do assunto na caixa de entrada (40–90 caracteres). */
  preheader: string
  blocos: BlocoEmail[]
}

// ── utilitários ──────────────────────────────────────────────────────────
export function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Caminho do site ("/colecao") vira URL absoluta; escapa para atributo. */
function escUrl(u: string): string {
  return esc(u.startsWith('/') ? `${SITE}${u}` : u)
}

/** Texto simples → HTML: **negrito**, quebras de linha e parágrafos. Variáveis {{x}} passam intactas. */
function textoRico(s: string, estilo: string): string {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:' + COR.titulo + ';">$1</strong>')
    .split(/\n{2,}/).map(p => p.replace(/\n/g, '<br>'))
    // cada parágrafo novo repete o estilo: <p> sem fonte cai no Times do cliente
    .join(`</p><p style="${estilo}margin:14px 0 0;">`)
}

const linha = (conteudo: string, padding = '0 32px', fundo = COR.card) =>
  `<tr><td class="jr-pad" style="padding:${padding};background:${fundo};">${conteudo}</td></tr>`

function botaoHtml(texto: string, url: string, estilo: 'preto' | 'contorno' = 'preto', largura = '100%'): string {
  const fundo = estilo === 'preto' ? COR.preto : '#ffffff'
  const cor = estilo === 'preto' ? '#ffffff' : COR.preto
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;width:${largura};max-width:360px;">
  <tr><td align="center" style="border-radius:12px;background:${fundo};${estilo === 'contorno' ? `border:2px solid ${COR.preto};` : ''}">
    <a href="${escUrl(url)}" target="_blank" style="display:block;padding:15px 24px;font-family:${FONTE_TITULO};font-size:15px;font-weight:700;letter-spacing:.02em;color:${cor};text-decoration:none;border-radius:12px;">${esc(texto)}</a>
  </td></tr></table>`
}

// ── blocos ───────────────────────────────────────────────────────────────
function faixa(b: Extract<BlocoEmail, { tipo: 'faixa' }>): string {
  const fundo = b.cor === 'verde' ? COR.verde : b.cor === 'laranja' ? COR.laranja : COR.preto
  return `<tr><td align="center" style="background:${fundo};padding:10px 16px;font-family:${FONTE_TITULO};font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#ffffff;">${esc(b.texto)}</td></tr>`
}

function topo(): string {
  return `<tr><td align="center" style="background:${COR.card};padding:22px 32px 6px;">
  <a href="${SITE}" target="_blank"><img src="${LOGO_EMAIL}" width="120" alt="Just Runner" style="display:block;width:120px;max-width:120px;height:auto;border:0;"></a>
</td></tr>`
}

function hero(b: Extract<BlocoEmail, { tipo: 'hero' }>): string {
  const img = b.imagem
    ? `<tr><td style="background:${COR.card};padding:16px 16px 0;">${b.link ? `<a href="${escUrl(b.link)}" target="_blank">` : ''}<img src="${esc(b.imagem)}" width="568" alt="${esc(b.titulo)}" style="display:block;width:100%;max-width:568px;height:auto;border:0;border-radius:14px;">${b.link ? '</a>' : ''}</td></tr>`
    : ''
  return `${img}
${linha(`${b.sobretitulo ? `<p style="margin:0 0 8px;font-family:${FONTE_TITULO};font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${COR.verdeTexto};">${esc(b.sobretitulo)}</p>` : ''}
<h1 class="jr-h1" style="margin:0;font-family:${FONTE_TITULO};font-size:30px;line-height:1.15;font-weight:800;color:${COR.titulo};">${esc(b.titulo)}</h1>
${b.texto ? `<p style="margin:14px 0 0;font-family:${FONTE_TEXTO};font-size:16px;line-height:1.6;color:${COR.texto};">${textoRico(b.texto, `font-family:${FONTE_TEXTO};font-size:16px;line-height:1.6;color:${COR.texto};`)}</p>` : ''}
${b.botao ? `<div style="height:22px;line-height:22px;">&nbsp;</div>${botaoHtml(b.botao.texto, b.botao.url)}` : ''}`, '26px 32px 8px')}`
}

function titulo(b: Extract<BlocoEmail, { tipo: 'titulo' }>): string {
  const al = b.centralizado === false ? 'left' : 'center'
  return linha(`${b.sobretitulo ? `<p style="margin:0 0 6px;text-align:${al};font-family:${FONTE_TITULO};font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${COR.verdeTexto};">${esc(b.sobretitulo)}</p>` : ''}
<h2 style="margin:0;text-align:${al};font-family:${FONTE_TITULO};font-size:22px;line-height:1.25;font-weight:800;color:${COR.titulo};">${esc(b.texto)}</h2>`, '26px 32px 4px')
}

function texto(b: Extract<BlocoEmail, { tipo: 'texto' }>): string {
  const estilo = `text-align:${b.centralizado ? 'center' : 'left'};font-family:${FONTE_TEXTO};font-size:15px;line-height:1.65;color:${COR.texto};`
  return linha(`<p style="margin:0;${estilo}">${textoRico(b.texto, estilo)}</p>`, '12px 32px')
}

function botao(b: Extract<BlocoEmail, { tipo: 'botao' }>): string {
  return linha(botaoHtml(b.texto, b.url, b.estilo), '18px 32px')
}

/** Grade híbrida: cada card é um inline-block de largura máxima fixa; no celular
 *  a largura disponível não comporta 2 lado a lado e eles empilham sozinhos. */
function produtos(b: Extract<BlocoEmail, { tipo: 'produtos' }>): string {
  if (!b.itens.length) return ''
  const cols = b.colunas ?? 2
  const larguraCard = cols === 1 ? 536 : cols === 2 ? 268 : 178
  const imgAltura = cols === 1 ? 300 : cols === 2 ? 220 : 150
  const card = (p: ProdutoEmail) => `<div class="jr-card${cols >= 2 ? ' jr-meio' : ''}" style="display:inline-block;vertical-align:top;width:100%;max-width:${larguraCard}px;font-size:14px;line-height:1.4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:8px;">
    <a href="${escUrl(p.url)}" target="_blank" style="text-decoration:none;color:${COR.texto};display:block;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${COR.borda};border-radius:14px;background:#ffffff;">
        <tr><td class="jr-imgcel" align="center" valign="middle" style="height:${imgAltura}px;padding:10px;background:#f6f6f6;border-radius:14px 14px 0 0;">
          ${p.imagem ? `<img src="${esc(p.imagem)}" alt="${esc(p.nome)}" width="${larguraCard - 36}" style="display:block;width:100%;max-width:${larguraCard - 36}px;height:auto;max-height:${imgAltura}px;border:0;margin:0 auto;">` : '&nbsp;'}
        </td></tr>
        <tr><td style="padding:12px 14px 4px;text-align:left;">
          ${p.selo ? `<span style="display:inline-block;margin-bottom:6px;padding:3px 8px;border-radius:6px;background:${COR.preto};color:#ffffff;font-family:${FONTE_TITULO};font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;line-height:1.2;">${esc(p.selo)}</span><br>` : ''}
          <span class="jr-nome" style="font-family:${FONTE_TITULO};font-size:15px;font-weight:700;line-height:1.3;color:${COR.titulo};">${esc(p.nome)}</span>
          ${p.variante ? `<br><span style="font-family:${FONTE_TEXTO};font-size:12px;line-height:1.4;color:${COR.suave};">${esc(p.variante)}</span>` : ''}
        </td></tr>
        ${b.ocultarPreco ? '<tr><td style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>' : `<tr><td style="padding:4px 14px 14px;text-align:left;font-family:${FONTE_TITULO};">
          ${p.precoDe && p.precoDe > p.preco ? `<span style="font-size:12px;color:${COR.suave};text-decoration:line-through;">${formatPrice(p.precoDe)}</span>&nbsp;&nbsp;` : ''}
          <span class="jr-preco" style="font-size:17px;font-weight:800;color:${COR.titulo};">${formatPrice(p.preco)}</span>
        </td></tr>`}
        <tr><td style="padding:0 14px 16px;">
          <div style="background:${COR.preto};border-radius:10px;padding:11px 8px;text-align:center;font-family:${FONTE_TITULO};font-size:13px;font-weight:700;color:#ffffff;">${esc(b.botaoTexto ?? 'Ver na loja')}</div>
        </td></tr>
      </table>
    </a>
  </td></tr></table>
</div>`
  // Outlook desktop não entende inline-block: tabela-fantasma com colunas fixas.
  const linhas: string[] = []
  for (let i = 0; i < b.itens.length; i += cols) {
    const grupo = b.itens.slice(i, i + cols)
    linhas.push(`<!--[if mso]><table role="presentation" width="${larguraCard * cols}" cellpadding="0" cellspacing="0" border="0" align="center"><tr><![endif]-->
${grupo.map(p => `<!--[if mso]><td width="${larguraCard}" valign="top"><![endif]-->${card(p)}<!--[if mso]></td><![endif]-->`).join('\n')}
<!--[if mso]></tr></table><![endif]-->`)
  }
  return `${b.titulo ? titulo({ tipo: 'titulo', texto: b.titulo }) : ''}
<tr><td class="jr-grade" align="center" style="background:${COR.card};padding:10px 24px 8px;font-size:0;line-height:0;text-align:center;">
${linhas.join('\n')}
</td></tr>`
}

function oferta(b: Extract<BlocoEmail, { tipo: 'oferta' }>): string {
  const linhas = b.linhas.map(l => `<tr>
    <td style="padding:12px 16px;border-top:1px solid ${COR.destaqueBorda};font-family:${FONTE_TEXTO};font-size:15px;color:${COR.texto};${l.destaque ? 'font-weight:700;' : ''}">${esc(l.rotulo)}</td>
    <td align="right" style="padding:12px 16px;border-top:1px solid ${COR.destaqueBorda};font-family:${FONTE_TITULO};font-size:17px;font-weight:800;color:${l.destaque ? COR.verdeTexto : COR.titulo};white-space:nowrap;">${esc(l.valor)}</td>
  </tr>`).join('')
  return linha(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COR.destaque};border-radius:16px;">
  <tr><td colspan="2" align="center" style="padding:18px 16px 10px;font-family:${FONTE_TITULO};font-size:18px;font-weight:800;color:${COR.titulo};">${esc(b.titulo)}</td></tr>
  ${linhas}
  ${b.nota ? `<tr><td colspan="2" align="center" style="padding:10px 16px 16px;font-family:${FONTE_TEXTO};font-size:12px;line-height:1.5;color:${COR.suave};">${esc(b.nota)}</td></tr>` : ''}
</table>${b.botao ? `<div style="height:18px;line-height:18px;">&nbsp;</div>${botaoHtml(b.botao.texto, b.botao.url)}` : ''}`, '18px 32px')
}

function cupom(b: Extract<BlocoEmail, { tipo: 'cupom' }>): string {
  return linha(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px dashed ${COR.preto};border-radius:16px;">
  <tr><td align="center" style="padding:20px 16px;">
    <p style="margin:0;font-family:${FONTE_TEXTO};font-size:14px;color:${COR.texto};">${esc(b.texto)}</p>
    <p style="margin:10px 0 0;font-family:${FONTE_TITULO};font-size:28px;font-weight:800;letter-spacing:.12em;color:${COR.titulo};">${esc(b.codigo)}</p>
    ${b.validade ? `<p style="margin:8px 0 0;font-family:${FONTE_TEXTO};font-size:12px;color:${COR.suave};">${esc(b.validade)}</p>` : ''}
  </td></tr></table>`, '18px 32px')
}

/** Fotos reais de clientes (Instagram). Selo "Parceiro · publi" quando é permuta (CONAR). */
function avaliacoes(b: Extract<BlocoEmail, { tipo: 'avaliacoes' }>): string {
  const itens = b.itens.slice(0, 3)
  if (!itens.length) return ''
  const card = (a: AvaliacaoEmail) => `<div class="jr-terco" style="display:inline-block;vertical-align:top;width:100%;max-width:178px;font-size:14px;line-height:1.4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:6px;">
    <a href="${escUrl(a.link)}" target="_blank" style="text-decoration:none;display:block;">
      <img src="${esc(a.imagem)}" width="166" alt="Foto de @${esc(a.usuario)}" style="display:block;width:100%;max-width:166px;height:auto;border:0;border-radius:12px;">
      <p style="margin:6px 0 0;font-family:${FONTE_TEXTO};font-size:12px;line-height:1.3;color:${COR.suave};text-align:center;">@${esc(a.usuario)}${a.parceiro ? ' · parceiro' : ''}</p>
    </a>
  </td></tr></table>
</div>`
  return `${titulo({ tipo: 'titulo', sobretitulo: 'quem usa', texto: b.titulo ?? 'Nossos clientes usando' })}
<tr><td align="center" style="background:${COR.card};padding:10px 24px 4px;font-size:0;line-height:0;text-align:center;">
<!--[if mso]><table role="presentation" width="534" cellpadding="0" cellspacing="0" border="0" align="center"><tr><![endif]-->
${itens.map(a => `<!--[if mso]><td width="178" valign="top"><![endif]-->${card(a)}<!--[if mso]></td><![endif]-->`).join('\n')}
<!--[if mso]></tr></table><![endif]-->
</td></tr>
${b.link ? linha(`<p style="margin:0;text-align:center;font-family:${FONTE_TEXTO};font-size:13px;"><a href="${escUrl(b.link)}" target="_blank" style="color:${COR.titulo};font-weight:700;">Ver mais avaliações</a></p>`, '6px 32px 10px') : ''}`
}

function depoimentos(b: Extract<BlocoEmail, { tipo: 'depoimentos' }>): string {
  const itens = b.itens.slice(0, 3)
  if (!itens.length) return ''
  const card = (d: { texto: string; nome: string }) => linha(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${COR.borda};border-radius:14px;background:#ffffff;">
  <tr><td style="padding:16px 18px;">
    <p style="margin:0 0 6px;font-size:15px;line-height:1;color:#f5a623;letter-spacing:2px;" aria-label="5 de 5 estrelas">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
    <p style="margin:0;font-family:${FONTE_TEXTO};font-size:14px;line-height:1.5;color:${COR.texto};">&ldquo;${esc(d.texto)}&rdquo;</p>
    <p style="margin:8px 0 0;font-family:${FONTE_TITULO};font-size:13px;font-weight:700;color:${COR.titulo};">${esc(d.nome)}</p>
  </td></tr>
</table>`, '6px 32px')
  return `${titulo({ tipo: 'titulo', sobretitulo: 'avaliações de clientes', texto: b.titulo ?? 'Quem corre de Just Runner' })}
${itens.map(card).join('\n')}`
}

const BENEFICIOS_PADRAO = [
  // mesmos fatos da barra do site (public/tema/assets/app.js)
  { titulo: 'Frete grátis', texto: 'acima de R$ 200' },
  { titulo: 'Até 3x sem juros', texto: 'no cartão, ou Pix' },
  { titulo: 'Troca fácil', texto: 'em até 7 dias' },
]

function beneficios(b: Extract<BlocoEmail, { tipo: 'beneficios' }>): string {
  const itens = (b.itens ?? BENEFICIOS_PADRAO).slice(0, 3)
  const card = (i: { titulo: string; texto: string }) => `<div class="jr-terco" style="display:inline-block;vertical-align:top;width:100%;max-width:178px;font-size:14px;line-height:1.4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:10px 6px;">
    <p style="margin:0;font-family:${FONTE_TITULO};font-size:14px;font-weight:800;color:${COR.titulo};">${esc(i.titulo)}</p>
    <p style="margin:3px 0 0;font-family:${FONTE_TEXTO};font-size:12px;color:${COR.suave};">${esc(i.texto)}</p>
  </td></tr></table>
</div>`
  return `<tr><td align="center" style="background:${COR.card};padding:14px 24px;border-top:1px solid ${COR.borda};font-size:0;line-height:0;text-align:center;">
<!--[if mso]><table role="presentation" width="534" cellpadding="0" cellspacing="0" border="0" align="center"><tr><![endif]-->
${itens.map(i => `<!--[if mso]><td width="178" valign="top"><![endif]-->${card(i)}<!--[if mso]></td><![endif]-->`).join('\n')}
<!--[if mso]></tr></table><![endif]-->
</td></tr>`
}

function imagem(b: Extract<BlocoEmail, { tipo: 'imagem' }>): string {
  const largura = b.semMargem ? 600 : 568
  const raio = b.semMargem ? 0 : 14
  const desk = `<img src="${esc(b.src)}" width="${largura}" alt="${esc(b.alt)}"${b.srcMobile ? ' class="jr-desk"' : ''} style="display:block;width:100%;max-width:${largura}px;height:auto;border:0;border-radius:${raio}px;">`
  const mob = b.srcMobile
    ? `<!--[if !mso]><!--><div class="jr-mob" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="${esc(b.srcMobile)}" width="${largura}" alt="${esc(b.alt)}" style="display:block;width:100%;max-width:${largura}px;height:auto;border:0;border-radius:${raio}px;"></div><!--<![endif]-->`
    : ''
  const img = desk + mob
  return `<tr><td style="background:${COR.card};padding:${b.semMargem ? '0' : '12px 16px'};">${b.link ? `<a href="${escUrl(b.link)}" target="_blank">${img}</a>` : img}</td></tr>`
}

function rodape(): string {
  return `<tr><td align="center" style="padding:26px 32px 34px;background:${COR.fundo};font-family:${FONTE_TEXTO};font-size:12px;line-height:1.6;color:${COR.suave};">
  <p style="margin:0 0 10px;">
    <a href="https://www.instagram.com/justrunner.br1/" target="_blank" style="color:${COR.titulo};font-weight:700;text-decoration:none;">Instagram</a>
    &nbsp;·&nbsp;<a href="${SITE}" target="_blank" style="color:${COR.titulo};font-weight:700;text-decoration:none;">Loja</a>
    &nbsp;·&nbsp;<a href="${SITE}/trocas-e-devolucoes" target="_blank" style="color:${COR.titulo};font-weight:700;text-decoration:none;">Trocas</a>
  </p>
  <p style="margin:0;">Just Runner · justrunner.com.br · CNPJ 62.880.024/0001-30</p>
  <p style="margin:4px 0 0;">Você recebe este e-mail porque é cliente da loja.</p>
  <p style="margin:6px 0 0;"><a href="${SITE}/descadastro-email-marketing?email={{email}}" target="_blank" style="color:${COR.suave};text-decoration:underline;">Não quero mais receber e-mails</a></p>
</td></tr>`
}

function bloco(b: BlocoEmail): string {
  switch (b.tipo) {
    case 'faixa': return faixa(b)
    case 'topo': return topo()
    case 'hero': return hero(b)
    case 'titulo': return titulo(b)
    case 'texto': return texto(b)
    case 'botao': return botao(b)
    case 'produtos': return produtos(b)
    case 'oferta': return oferta(b)
    case 'cupom': return cupom(b)
    case 'avaliacoes': return avaliacoes(b)
    case 'beneficios': return beneficios(b)
    case 'depoimentos': return depoimentos(b)
    case 'imagem': return imagem(b)
    case 'divisor': return linha(`<div style="height:1px;line-height:1px;background:${COR.borda};">&nbsp;</div>`, '14px 32px')
    case 'espaco': return `<tr><td style="background:${COR.card};height:${b.altura ?? 16}px;line-height:${b.altura ?? 16}px;font-size:0;">&nbsp;</td></tr>`
  }
}

/** Documento completo, pronto para envio (o {{email}} do rodapé é preenchido no envio). */
export function renderEmail(doc: EmailDoc): string {
  // preheader + espaçadores: impede que o cliente puxe texto do corpo para a prévia
  const preheader = `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${COR.fundo};opacity:0;">${esc(doc.preheader)}${'&#847;&zwnj;&nbsp;'.repeat(60)}</div>`
  return `<!DOCTYPE html>
${MARCADOR_KIT}
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(doc.assunto)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&family=Poppins:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  body { margin:0 !important; padding:0 !important; width:100% !important; background:${COR.fundo}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; }
  img { -ms-interpolation-mode:bicubic; }
  a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
  @media (max-width: 620px) {
    .jr-pad { padding-left:20px !important; padding-right:20px !important; }
    .jr-h1 { font-size:26px !important; }
    .jr-grade { padding-left:12px !important; padding-right:12px !important; }
    .jr-card { max-width:100% !important; }
    /* onde o cliente aceita <style> (Apple Mail, iOS, Gmail com conta Google): 2 produtos e 3 fotos por linha */
    .jr-meio { max-width:50% !important; }
    .jr-terco { max-width:33.33% !important; }
    .jr-imgcel { height:150px !important; padding:6px !important; }
    .jr-meio td { padding-left:4px !important; padding-right:4px !important; }
    .jr-nome { font-size:13px !important; }
    .jr-preco { font-size:15px !important; }
    /* banner com versão de celular */
    .jr-desk { display:none !important; }
    .jr-mob { display:block !important; max-height:none !important; overflow:visible !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COR.fundo};">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COR.fundo};">
<tr><td align="center" style="padding:24px 10px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:${COR.card};border-radius:18px;overflow:hidden;">
${doc.blocos.map(bloco).join('\n')}
<tr><td style="background:${COR.card};height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;">
${rodape()}
</table>
</td></tr>
</table>
</body>
</html>`
}

export { linkEmail }

/** Ponto de partida de um modelo novo do kit (o dono edita o JSON no admin). */
export const DOC_EXEMPLO: EmailDoc = {
  assunto: 'Novidades da Just Runner para o seu treino',
  preheader: 'Óculos de performance para quem está em movimento. Veja o que chegou.',
  blocos: [
    { tipo: 'topo' },
    {
      tipo: 'hero',
      sobretitulo: 'just runner',
      titulo: 'Feito para acompanhar você',
      texto: 'Oi, {{primeiro_nome}}! Óculos de performance para o treino, a rua e o resto do dia.\n\nEscolha o seu na loja.',
      botao: { texto: 'Ver na loja', url: '/colecao' },
    },
    { tipo: 'beneficios' },
  ],
}

/** Valida o JSON colado no admin antes de salvar (mensagem clara em vez de HTML quebrado). */
export function lerDoc(json: string): EmailDoc {
  let doc: unknown
  try {
    doc = JSON.parse(json)
  } catch (e) {
    throw new Error(`JSON inválido: ${e instanceof Error ? e.message : String(e)}`)
  }
  const d = doc as Partial<EmailDoc>
  if (!d || typeof d !== 'object') throw new Error('o modelo precisa ser um objeto { assunto, preheader, blocos }')
  if (typeof d.assunto !== 'string' || !d.assunto.trim()) throw new Error('falta "assunto"')
  if (typeof d.preheader !== 'string') throw new Error('falta "preheader"')
  if (!Array.isArray(d.blocos) || d.blocos.length === 0) throw new Error('"blocos" precisa ser uma lista com pelo menos 1 bloco')
  const tipos = new Set(['faixa', 'topo', 'hero', 'titulo', 'texto', 'botao', 'produtos', 'oferta', 'cupom', 'avaliacoes', 'beneficios', 'imagem', 'divisor', 'espaco'])
  d.blocos.forEach((b, i) => {
    if (!b || typeof b !== 'object' || !tipos.has((b as { tipo?: string }).tipo ?? '')) throw new Error(`bloco ${i + 1}: "tipo" desconhecido`)
  })
  return d as EmailDoc
}
