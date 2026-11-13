import Link from 'next/link'
import { listCampaigns, type MktCampaign, type CampaignStatus } from '@/lib/mkt/campaigns'
import { listTemplates, getTemplate } from '@/lib/mkt/templates'
import { listSegments, contarSegmentos, SEGMENT_LABEL, type MktSegment } from '@/lib/mkt/segments'
import { lerEstadoSync } from '@/lib/mkt/contatos'
import { getAdminSupabase } from '@/lib/admin-client'
import { remetente } from '@/lib/mkt/resend'
import {
  criarCampanhaAction, aprovarCampanhaAction, pausarCampanhaAction, retomarCampanhaAction, excluirCampanhaAction,
  novoModeloAction, salvarModeloAction, excluirModeloAction, enviarTesteAction,
  criarPublicoAction, excluirPublicoAction, sincronizarContatosAction,
} from './actions'
import { BotaoConfirmar } from './confirmar'
import '../_components/dashboard/dashboard.css'
import '../instagram/stories/stories.css'
import './email.css'

export const metadata = { title: 'E-mail marketing · Just Runner' }
export const dynamic = 'force-dynamic'
// a sincronização de contatos roda dentro da Server Action (até ~40 s)
export const maxDuration = 60

// E-mail marketing pela Resend (porte do módulo da JHF). Portão de aprovação:
// campanha nasce rascunho e só sai depois do clique em "Aprovar e agendar".

const PATH = '/admin/email-marketing'
const TZ = 'America/Sao_Paulo'
type Aba = 'campanhas' | 'modelos' | 'publicos' | 'contatos'
const ABAS: { id: Aba; label: string }[] = [
  { id: 'campanhas', label: 'Campanhas' },
  { id: 'modelos', label: 'Modelos' },
  { id: 'publicos', label: 'Públicos' },
  { id: 'contatos', label: 'Contatos' },
]

// Cor + texto sempre juntos: o status nunca depende só da cor.
const STATUS: Record<CampaignStatus, { label: string; cor: string }> = {
  draft: { label: 'Rascunho · aguardando aprovação', cor: '#71717a' },
  scheduled: { label: 'Aprovada · agendada', cor: '#2563eb' },
  sending: { label: 'Enviando', cor: '#d97706' },
  completed: { label: 'Concluída', cor: '#059669' },
  paused: { label: 'Pausada', cor: '#52525b' },
}

const num = (n: number) => n.toLocaleString('pt-BR')
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—')
const quando = (iso: string | null) => (iso ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: TZ }).format(new Date(iso)) : '—')

function Kpi({ label, valor, sub }: { label: string; valor: string; sub?: React.ReactNode }) {
  return (
    <div className="dsh-kpi">
      <div className="dsh-kpi-l">{label}</div>
      <div className="dsh-kpi-v num">{valor}</div>
      {sub && <div className="dsh-kpi-sub">{sub}</div>}
    </div>
  )
}

// ── campanhas ───────────────────────────────────────────────────────────────
function CampanhaCard({ c, estimativa }: { c: MktCampaign; estimativa?: number }) {
  const s = c.stats
  const st = STATUS[c.status]
  return (
    <article className="dsh-card eml-camp">
      <div className="eml-camp-h">
        <div>
          <h3 className="dsh-card-t">{c.name}</h3>
          <div className="eml-meta">
            Modelo <b>{c.template_name ?? '—'}</b> · Público <b>{c.segment_name ?? '—'}</b> · Envio <b>{c.scheduled_for ? quando(c.scheduled_for) : 'ao aprovar'}</b>
            {c.status === 'draft' && estimativa != null && <> · ≈ <b>{num(estimativa)}</b> destinatários hoje</>}
          </div>
        </div>
        <span className="sty-st" style={{ ['--st' as string]: st.cor }}>{st.label}</span>
      </div>

      {s.total > 0 && (
        <div className="eml-stats">
          <div><small>Na fila</small><b>{num(s.total)}</b></div>
          <div><small>Enviados</small><b>{num(s.enviados)}</b></div>
          <div><small>Pendentes</small><b>{num(s.pendentes)}</b></div>
          <div><small>Falhas</small><b className={s.falhas ? 'bad' : ''}>{num(s.falhas)}</b></div>
          <div><small>Voltaram</small><b className={s.voltaram ? 'bad' : ''}>{num(s.voltaram)}</b><i>{pct(s.voltaram, s.enviados)}</i></div>
          <div><small>Entregues</small><b>{num(s.entregues)}</b></div>
          <div><small>Abriram</small><b>{num(s.abertos)}</b><i>{pct(s.abertos, s.entregues || s.enviados)}</i></div>
          <div><small>Clicaram</small><b>{num(s.clicados)}</b><i>{pct(s.clicados, s.entregues || s.enviados)}</i></div>
        </div>
      )}
      {c.status === 'sending' && !c.materialized_at && <div className="eml-note">Montando a fila em partes (500 por minuto) enquanto envia.</div>}

      <form className="sty-act">
        {c.status === 'draft' && (
          <>
            <BotaoConfirmar className="dsh-btn sty-btn-pri" formAction={aprovarCampanhaAction.bind(null, c.id)}
              pergunta={`Aprovar "${c.name}"? ${estimativa != null ? `Cerca de ${estimativa} pessoas vão receber` : 'O público inteiro vai receber'} ${c.scheduled_for ? `a partir de ${quando(c.scheduled_for)}` : 'a partir de agora'}.`}>
              Aprovar e agendar
            </BotaoConfirmar>
            <a className="dsh-btn" href={`/api/admin/mkt/preview/${c.template_id}`} target="_blank" rel="noopener noreferrer">Ver e-mail ↗</a>
            <BotaoConfirmar className="dsh-btn sty-btn-bad" formAction={excluirCampanhaAction.bind(null, c.id)} pergunta="Excluir este rascunho?">Excluir</BotaoConfirmar>
          </>
        )}
        {(c.status === 'scheduled' || c.status === 'sending') && (
          <button className="dsh-btn" formAction={pausarCampanhaAction.bind(null, c.id)}>Pausar</button>
        )}
        {c.status === 'paused' && (
          <BotaoConfirmar className="dsh-btn sty-btn-pri" formAction={retomarCampanhaAction.bind(null, c.id)} pergunta="Retomar o envio de onde parou?">Retomar</BotaoConfirmar>
        )}
      </form>
    </article>
  )
}

async function AbaCampanhas() {
  const [campanhas, modelos, publicos] = await Promise.all([listCampaigns(), listTemplates(), listSegments()])
  const rascunhos = campanhas.filter(c => c.status === 'draft' && c.segment_id)
  const usados = publicos.filter(p => rascunhos.some(c => c.segment_id === p.id))
  const contagem = await contarSegmentos(usados)
  return (
    <>
      <details className="dsh-card eml-new" open={campanhas.length === 0}>
        <summary className="dsh-card-t">+ Nova campanha</summary>
        {modelos.length === 0 || publicos.length === 0 ? (
          <p className="dsh-desc">Antes, crie pelo menos 1 <Link href={`${PATH}?aba=modelos`}>modelo</Link> e 1 <Link href={`${PATH}?aba=publicos`}>público</Link>.</p>
        ) : (
          <form action={criarCampanhaAction} className="eml-form">
            <label>Nome<input name="name" required placeholder="Ex.: Reconquista novembro — sumidos 60+" /></label>
            <label>Modelo
              <select name="template_id" required>{modelos.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </label>
            <label>Público
              <select name="segment_id" required>{publicos.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </label>
            <label>Enviar em (horário de Brasília; vazio = assim que aprovar)<input type="datetime-local" name="scheduled_for" /></label>
            <div><button className="dsh-btn sty-btn-pri">Criar rascunho</button></div>
          </form>
        )}
      </details>
      {campanhas.length === 0
        ? <p className="dsh-desc">Nenhuma campanha ainda.</p>
        : campanhas.map(c => <CampanhaCard key={c.id} c={c} estimativa={c.segment_id ? contagem[c.segment_id] : undefined} />)}
    </>
  )
}

// ── modelos ─────────────────────────────────────────────────────────────────
async function AbaModelos({ id }: { id?: string }) {
  const modelos = await listTemplates()
  const atual = id ? await getTemplate(id) : null
  const modo = atual?.blocks ? 'kit' : 'html'
  return (
    <div className="eml-split">
      <section className="dsh-card">
        <div className="dsh-card-h"><h2 className="dsh-card-t">Modelos</h2></div>
        <form className="sty-act">
          <button className="dsh-btn sty-btn-pri" formAction={novoModeloAction.bind(null, 'kit')}>+ Kit da marca</button>
          <button className="dsh-btn" formAction={novoModeloAction.bind(null, 'html')}>+ HTML</button>
        </form>
        <ul className="eml-list">
          {modelos.map(t => (
            <li key={t.id} aria-current={t.id === atual?.id ? 'true' : undefined}>
              <Link href={`${PATH}?aba=modelos&id=${t.id}`}>
                <b>{t.name}</b>
                <small>{t.blocks ? 'Kit' : 'HTML'} · {t.subject ?? 'sem assunto'}</small>
              </Link>
            </li>
          ))}
          {modelos.length === 0 && <li className="dsh-desc">Nenhum modelo ainda.</li>}
        </ul>
      </section>

      {atual ? (
        <section className="dsh-card">
          <form action={salvarModeloAction.bind(null, atual.id)} className="eml-form">
            <input type="hidden" name="modo" value={modo} />
            <label>Nome interno<input name="name" defaultValue={atual.name} required /></label>
            {modo === 'html' && <label>Assunto<input name="subject" defaultValue={atual.subject ?? ''} required /></label>}
            <label>
              {modo === 'kit'
                ? <>Blocos do kit (JSON: assunto, preheader, blocos). Tipos: topo, faixa, hero, titulo, texto, botao, produtos, oferta, cupom, avaliacoes, beneficios, imagem, divisor, espaco. Links podem ser caminhos do site (&quot;/colecao&quot;); a UTM entra sozinha no envio.</>
                : <>HTML do e-mail. Links para justrunner.com.br ganham UTM no envio; o rodapé de descadastro é colocado se faltar.</>}
              <textarea name="conteudo" rows={22} className="eml-code" defaultValue={modo === 'kit' ? JSON.stringify(atual.blocks, null, 2) : atual.body} spellCheck={false} />
            </label>
            <p className="eml-note">Variáveis: {'{{primeiro_nome}} {{nome}} {{email}} {{dias_sumido}} {{ultima_compra_data}} {{link_site}}'}</p>
            <div className="sty-act">
              <button className="dsh-btn sty-btn-pri">Salvar</button>
              <a className="dsh-btn" href={`/api/admin/mkt/preview/${atual.id}`} target="_blank" rel="noopener noreferrer">Abrir prévia ↗</a>
              <BotaoConfirmar className="dsh-btn sty-btn-bad" formAction={excluirModeloAction.bind(null, atual.id)} pergunta="Excluir este modelo?">Excluir</BotaoConfirmar>
            </div>
          </form>
          <form action={enviarTesteAction.bind(null, atual.id)} className="eml-inline">
            <label>Enviar teste para…<input type="email" name="email" required placeholder="voce@exemplo.com" /></label>
            <button className="dsh-btn">Enviar teste</button>
          </form>
          <div className="eml-previews">
            <figure><figcaption>Celular</figcaption><iframe title="Prévia no celular" src={`/api/admin/mkt/preview/${atual.id}?v=${encodeURIComponent(atual.updated_at)}`} className="eml-frame eml-frame-m" /></figure>
            <figure><figcaption>Computador</figcaption><iframe title="Prévia no computador" src={`/api/admin/mkt/preview/${atual.id}?v=${encodeURIComponent(atual.updated_at)}`} className="eml-frame" /></figure>
          </div>
        </section>
      ) : (
        <section className="dsh-card"><p className="dsh-desc">Escolha um modelo para editar, ver a prévia e mandar um teste.</p></section>
      )}
    </div>
  )
}

// ── públicos ────────────────────────────────────────────────────────────────
function descricaoPublico(s: MktSegment): string {
  const c = s.criteria ?? {}
  const partes: string[] = [SEGMENT_LABEL[s.type] ?? s.type]
  if (s.type === 'cliente_sumido') partes.push(`há ${c.dias_minimo ?? '?'}${c.dias_maximo ? `–${c.dias_maximo}` : '+'} dias`)
  if (s.type === 'lista_customizada') partes.push(`${(c.emails as string[] | undefined)?.length ?? 0} e-mails colados`)
  if (c.somente_newsletter) partes.push('só quem aceitou newsletter')
  return partes.join(' · ')
}

async function AbaPublicos() {
  const publicos = await listSegments()
  const contagem = await contarSegmentos(publicos)
  return (
    <>
      <details className="dsh-card eml-new" open={publicos.length === 0}>
        <summary className="dsh-card-t">+ Novo público</summary>
        <form action={criarPublicoAction} className="eml-form">
          <label>Nome<input name="name" required placeholder="Ex.: Sumidos 60 a 180 dias" /></label>
          <label>Tipo
            <select name="type" defaultValue="todos_clientes">
              {Object.entries(SEGMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div className="eml-row2">
            <label>Sumido há pelo menos (dias) — só para &quot;sumidos&quot;<input type="number" name="dias_minimo" min={1} placeholder="60" /></label>
            <label>No máximo (dias, opcional)<input type="number" name="dias_maximo" min={1} placeholder="180" /></label>
          </div>
          <label>E-mails — só para &quot;lista&quot; (um por linha, vírgula ou espaço)<textarea name="emails" rows={4} /></label>
          <label className="eml-check"><input type="checkbox" name="somente_newsletter" /> Só quem aceitou newsletter na Yampi</label>
          <div><button className="dsh-btn sty-btn-pri">Criar público</button></div>
        </form>
      </details>
      <section className="dsh-card">
        <div className="dsh-card-h"><h2 className="dsh-card-t">Públicos</h2><div className="dsh-per-note">Contagem de hoje, já sem descadastrados e e-mails que voltaram</div></div>
        <ul className="eml-list eml-list-wide">
          {publicos.map(s => (
            <li key={s.id}>
              <div><b>{s.name}</b><small>{descricaoPublico(s)}</small></div>
              <span className="eml-count num">{num(contagem[s.id] ?? 0)}</span>
              <form><BotaoConfirmar className="dsh-btn sty-btn-bad" formAction={excluirPublicoAction.bind(null, s.id)} pergunta="Excluir este público?">Excluir</BotaoConfirmar></form>
            </li>
          ))}
          {publicos.length === 0 && <li className="dsh-desc">Nenhum público ainda.</li>}
        </ul>
      </section>
    </>
  )
}

// ── contatos ────────────────────────────────────────────────────────────────
async function AbaContatos() {
  const db = getAdminSupabase()
  const cont = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then(r => r.count ?? 0)
  const [total, compradores, newsletter, descadastros, voltaram, estado] = await Promise.all([
    cont(db.from('mkt_contacts').select('id', { count: 'exact', head: true })),
    cont(db.from('mkt_contacts').select('id', { count: 'exact', head: true }).gte('orders_count', 1)),
    cont(db.from('mkt_contacts').select('id', { count: 'exact', head: true }).eq('newsletter', true)),
    cont(db.from('mkt_optouts').select('id', { count: 'exact', head: true })),
    cont(db.from('mkt_sends').select('id', { count: 'exact', head: true }).eq('status', 'bounced')),
    lerEstadoSync(db),
  ])
  return (
    <>
      <div className="dsh-kpis">
        <Kpi label="Contatos" valor={num(total)} sub="clientes da Yampi + compradores" />
        <Kpi label="Já compraram" valor={num(compradores)} sub="1+ pedido pago" />
        <Kpi label="Aceitaram newsletter" valor={num(newsletter)} sub="campo da Yampi" />
        <Kpi label="Descadastrados" valor={num(descadastros)} sub="nunca recebem" />
        <Kpi label="Voltaram (bounce)" valor={num(voltaram)} sub="nunca recebem de novo" />
      </div>
      <section className="dsh-card">
        <div className="dsh-card-h">
          <div>
            <div className="dsh-eyebrow">Sincronização com a Yampi</div>
            <h2 className="dsh-card-t">Última completa: {quando(estado.ultimoCompleto)}</h2>
          </div>
          <form><button className="dsh-btn sty-btn-pri" formAction={sincronizarContatosAction}>Sincronizar com a Yampi</button></form>
        </div>
        {estado.pagina != null && <div className="eml-note">Em andamento: próxima página {estado.pagina} de {estado.totalPaginas ?? '?'}. Clique de novo para continuar.</div>}
        {estado.ultimoResultado && <p className="dsh-desc">{estado.ultimoResultado}</p>}
        <p className="dsh-desc">Roda sozinha todo dia às 06h. Puxa todos os clientes (nome, telefone, newsletter), pula anonimizados e quem pediu exclusão, e soma pedidos pagos, total gasto e última compra a partir da estatística de clientes.</p>
      </section>
    </>
  )
}

// ── página ──────────────────────────────────────────────────────────────────
export default async function EmailMarketingPage({ searchParams }: { searchParams: Promise<{ aba?: string; id?: string; msg?: string; erro?: string }> }) {
  const sp = await searchParams
  const aba: Aba = ABAS.some(a => a.id === sp.aba) ? (sp.aba as Aba) : 'campanhas'

  let conteudo: React.ReactNode
  try {
    conteudo = aba === 'modelos' ? await AbaModelos({ id: sp.id })
      : aba === 'publicos' ? await AbaPublicos()
        : aba === 'contatos' ? await AbaContatos()
          : await AbaCampanhas()
  } catch (e) {
    conteudo = (
      <div className="dsh-banner" role="alert">
        Não deu para carregar: {e instanceof Error ? e.message : String(e)}. Se as tabelas mkt_* ainda não existem, rode a migration supabase/migrations/20261112000001_mkt_email.sql.
      </div>
    )
  }

  return (
    <div className="dsh sty eml">
      <header className="sty-head">
        <div className="dsh-ttl">
          <span>Marketing · Resend · remetente {remetente()}</span>
          <h1>E-mail marketing</h1>
        </div>
      </header>
      <nav className="eml-tabs" aria-label="Seções">
        {ABAS.map(a => <Link key={a.id} href={`${PATH}?aba=${a.id}`} aria-current={a.id === aba ? 'page' : undefined}>{a.label}</Link>)}
      </nav>
      {sp.erro && <div className="dsh-banner" role="alert">{sp.erro}</div>}
      {sp.msg && !sp.erro && <div className="eml-ok" role="status">{sp.msg}</div>}
      {conteudo}
    </div>
  )
}
