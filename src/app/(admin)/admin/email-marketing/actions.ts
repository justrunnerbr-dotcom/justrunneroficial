'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { checkAuth } from '@/lib/admin/auth'
import { createCampaign, aprovarCampanha, pausarCampanha, retomarCampanha, deleteCampaign } from '@/lib/mkt/campaigns'
import { createTemplate, updateTemplate, deleteTemplate, getTemplate } from '@/lib/mkt/templates'
import { createSegment, deleteSegment, type SegmentType } from '@/lib/mkt/segments'
import { renderEmail, lerDoc, DOC_EXEMPLO } from '@/lib/mkt/email-kit'
import { sendEmail } from '@/lib/mkt/resend'
import { prepararHtmlEmail, emailValido, normalizarEmail } from '@/lib/mkt/optout'
import { renderTemplate, varsExemplo } from '@/lib/mkt/template'
import { aplicarUtm, linkEmail, SITE_URL } from '@/lib/mkt/utm'
import { sincronizarContatos } from '@/lib/mkt/contatos'

// Ações da página /admin/email-marketing. Cada uma confere a sessão, faz o
// trabalho e volta para a aba com a mensagem (?msg= ou ?erro=) — redirect fica
// FORA do try (ele funciona lançando uma exceção do Next).

const PATH = '/admin/email-marketing'
type Aba = 'campanhas' | 'modelos' | 'publicos' | 'contatos'

async function exigirAdmin() {
  if (!(await checkAuth())) throw new Error('Não autorizado')
}

const msgErro = (e: unknown) => (e instanceof Error ? e.message : String(e))

function voltar(aba: Aba, r: { msg?: string; erro?: string; id?: string }): never {
  revalidatePath(PATH)
  const q = new URLSearchParams({ aba })
  if (r.id) q.set('id', r.id)
  if (r.erro) q.set('erro', r.erro)
  else if (r.msg) q.set('msg', r.msg)
  redirect(`${PATH}?${q}`)
}

async function rodar(aba: Aba, fn: () => Promise<{ msg: string; id?: string }>, idErro?: string): Promise<never> {
  let r: { msg?: string; erro?: string; id?: string }
  try {
    await exigirAdmin()
    r = await fn()
  } catch (e) {
    r = { erro: msgErro(e), id: idErro }
  }
  voltar(aba, r)
}

/** "2026-11-14T10:00" digitado no admin é horário de Brasília. */
function deBrasilia(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null
  return new Date(`${local}:00-03:00`).toISOString()
}

const txt = (f: FormData, k: string) => String(f.get(k) ?? '').trim()

// ── campanhas ───────────────────────────────────────────────────────────────
export async function criarCampanhaAction(f: FormData) {
  await rodar('campanhas', async () => {
    const name = txt(f, 'name'), template_id = txt(f, 'template_id'), segment_id = txt(f, 'segment_id')
    if (!name || !template_id || !segment_id) throw new Error('preencha nome, modelo e público')
    const quando = txt(f, 'scheduled_for')
    const scheduled_for = quando ? deBrasilia(quando) : null
    if (quando && !scheduled_for) throw new Error('data/hora inválida')
    await createCampaign({ name, template_id, segment_id, scheduled_for })
    return { msg: 'Campanha criada como rascunho. Nada sai até você clicar em "Aprovar e agendar".' }
  })
}

export async function aprovarCampanhaAction(id: string) {
  await rodar('campanhas', async () => {
    await aprovarCampanha(id)
    return { msg: 'Aprovada. Na hora marcada o envio começa sozinho (~40 e-mails por minuto).' }
  })
}

export async function pausarCampanhaAction(id: string) {
  await rodar('campanhas', async () => { await pausarCampanha(id); return { msg: 'Campanha pausada. O que ainda não saiu fica esperando.' } })
}

export async function retomarCampanhaAction(id: string) {
  await rodar('campanhas', async () => { await retomarCampanha(id); return { msg: 'Campanha retomada: continua de onde parou, sem repetir ninguém.' } })
}

export async function excluirCampanhaAction(id: string) {
  await rodar('campanhas', async () => { await deleteCampaign(id); return { msg: 'Rascunho excluído.' } })
}

// ── modelos ─────────────────────────────────────────────────────────────────
export async function novoModeloAction(modo: 'kit' | 'html') {
  await rodar('modelos', async () => {
    const id = modo === 'kit'
      ? await createTemplate({ name: 'Novo modelo (kit)', subject: DOC_EXEMPLO.assunto, body: renderEmail(DOC_EXEMPLO), blocks: DOC_EXEMPLO })
      : await createTemplate({ name: 'Novo modelo (HTML)', subject: 'Assunto do e-mail', body: '<p>Oi, {{primeiro_nome}}!</p>\n<p><a href="https://justrunner.com.br/colecao">Ver na loja</a></p>', blocks: null })
    return { msg: 'Modelo criado. Edite e salve.', id }
  })
}

export async function salvarModeloAction(id: string, f: FormData) {
  await rodar('modelos', async () => {
    const name = txt(f, 'name') || 'Sem nome'
    const conteudo = String(f.get('conteudo') ?? '')
    if (txt(f, 'modo') === 'kit') {
      const doc = lerDoc(conteudo)
      await updateTemplate(id, { name, subject: doc.assunto, body: renderEmail(doc), blocks: doc })
    } else {
      if (!conteudo.trim()) throw new Error('o HTML está vazio')
      const subject = txt(f, 'subject')
      if (!subject) throw new Error('falta o assunto')
      await updateTemplate(id, { name, subject, body: conteudo, blocks: null })
    }
    return { msg: 'Modelo salvo.', id }
  }, id)
}

export async function excluirModeloAction(id: string) {
  await rodar('modelos', async () => { await deleteTemplate(id); return { msg: 'Modelo excluído.' } }, id)
}

/** Envio de teste direto pela Resend (sem fila, sem campanha), com variáveis de exemplo. */
export async function enviarTesteAction(id: string, f: FormData) {
  await rodar('modelos', async () => {
    const para = normalizarEmail(txt(f, 'email'))
    if (!emailValido(para)) throw new Error('e-mail de teste inválido')
    const tpl = await getTemplate(id)
    if (!tpl) throw new Error('modelo não encontrado')
    const vars = varsExemplo(para, linkEmail(SITE_URL, 'teste'))
    await sendEmail({
      to: para,
      subject: `[TESTE] ${renderTemplate(tpl.subject ?? '(sem assunto)', vars)}`,
      html: renderTemplate(aplicarUtm(prepararHtmlEmail(tpl.body), 'teste'), vars),
    })
    return { msg: `Teste enviado para ${para}.`, id }
  }, id)
}

// ── públicos ────────────────────────────────────────────────────────────────
export async function criarPublicoAction(f: FormData) {
  await rodar('publicos', async () => {
    const name = txt(f, 'name')
    const type = txt(f, 'type') as SegmentType
    if (!name) throw new Error('dê um nome ao público')
    if (!['todos_clientes', 'cliente_sumido', 'compradores', 'lista_customizada'].includes(type)) throw new Error('tipo inválido')
    const criteria: Record<string, unknown> = {}
    if (f.get('somente_newsletter') === 'on') criteria.somente_newsletter = true
    if (type === 'cliente_sumido') {
      const min = Number(txt(f, 'dias_minimo'))
      if (!Number.isFinite(min) || min <= 0) throw new Error('informe "sumido há pelo menos N dias"')
      criteria.dias_minimo = min
      const max = txt(f, 'dias_maximo')
      if (max) criteria.dias_maximo = Number(max)
    }
    if (type === 'lista_customizada') {
      const emails = [...new Set(String(f.get('emails') ?? '').split(/[\s,;]+/).map(normalizarEmail).filter(emailValido))]
      if (!emails.length) throw new Error('cole pelo menos 1 e-mail válido')
      criteria.emails = emails
    }
    await createSegment({ name, type, criteria })
    return { msg: 'Público criado.' }
  })
}

export async function excluirPublicoAction(id: string) {
  await rodar('publicos', async () => { await deleteSegment(id); return { msg: 'Público excluído.' } })
}

// ── contatos ────────────────────────────────────────────────────────────────
export async function sincronizarContatosAction() {
  await rodar('contatos', async () => {
    const r = await sincronizarContatos({ prazoMs: 40_000 })
    return {
      msg: r.concluido
        ? `Sincronizado: ${r.gravados} clientes da Yampi gravados nesta rodada (${r.pulados} pulados: sem e-mail, anonimizados ou com exclusão pedida).`
        : `Parcial: página ${(r.proximaPagina ?? 1) - 1} de ${r.totalPaginas ?? '?'}. Clique de novo para continuar de onde parou.`,
    }
  })
}
