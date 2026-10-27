import Link from 'next/link'
import { getStories, resumoStories, type Story, type StoryStatus, type StoryTema } from '@/lib/ig/stories'
import { addStoryAction, setStatusAction, aprovarDiaAction, reagendarAction, excluirStoryAction } from './actions'
import '../../_components/dashboard/dashboard.css'
import './stories.css'

export const metadata = { title: 'Stories · Instagram · Just Runner' }
export const dynamic = 'force-dynamic'

const TZ = 'America/Sao_Paulo'
const PATH = '/admin/instagram/stories'

const TEMAS: Record<StoryTema, string> = {
  produto: 'Produto', video_rosto: 'No rosto', promo: 'Promoção', prova_social: 'Prova social', bastidor: 'Bastidor', cta: 'Chamada',
}
// Cor + texto sempre juntos: o status nunca depende só da cor.
const STATUS: Record<StoryStatus, { label: string; cor: string; curto?: string }> = {
  rascunho: { label: 'Aguardando aprovação', curto: 'Aguardando', cor: '#71717a' },
  aprovado: { label: 'Aprovado', cor: '#2563eb' },
  publicando: { label: 'Publicando', cor: '#d97706' },
  publicado: { label: 'Publicado', cor: '#059669' },
  erro: { label: 'Erro', cor: '#dc2626' },
  cancelado: { label: 'Cancelado', cor: '#52525b' },
}
const ORDEM_STATUS: StoryStatus[] = ['publicado', 'publicando', 'aprovado', 'rascunho', 'erro', 'cancelado']

type Filtro = 'todos' | 'pendentes' | 'fila' | 'publicados' | 'erros'
const FILTROS: { id: Filtro; label: string; ok: (s: Story) => boolean }[] = [
  { id: 'todos', label: 'Todos', ok: () => true },
  { id: 'pendentes', label: 'Aguardando', ok: s => s.status === 'rascunho' },
  { id: 'fila', label: 'Na fila', ok: s => s.status === 'aprovado' || s.status === 'publicando' },
  { id: 'publicados', label: 'Publicados', ok: s => s.status === 'publicado' },
  { id: 'erros', label: 'Erros', ok: s => s.status === 'erro' },
]
const PERIODOS = [
  { label: 'Madrugada', de: 0, ate: 8 },
  { label: 'Manhã', de: 8, ate: 12 },
  { label: 'Tarde', de: 12, ate: 18 },
  { label: 'Noite', de: 18, ate: 24 },
]

// ── formatação ───────────────────────────────────────────────────────────────
const diaKey = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso))
const hora = (iso: string) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(iso))
const horaNum = (iso: string) => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }).format(new Date(iso))) % 24
const num = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toLocaleString('pt-BR'))
const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`)
const nomeDia = (d: string, opt: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { ...opt, timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`))
const somaDia = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const paraInput = (iso: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date(iso)).map(x => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}`
}
const href = (dia: string, f: Filtro) => `${PATH}?dia=${dia}${f === 'todos' ? '' : `&f=${f}`}`

/** Agora (fora do componente: Date.now() não pode rodar no render). */
function agoraMs(): number { return Date.now() }

/** Soma uma métrica só dos stories que já têm o número; nenhum → null ('—'), nunca 0 inventado. */
function soma(lista: Story[], campo: 'alcance' | 'views' | 'respostas' | 'saiu' | 'pulou' | 'avancou' | 'respostasDm'): number | null {
  const v = lista.map(s => s.metricas?.[campo]).filter((x): x is number => typeof x === 'number')
  return v.length ? v.reduce((a, b) => a + b, 0) : null
}
const temMetrica = (s: Story) => !!s.metricas && (s.metricas.alcance !== null || s.metricas.views !== null)

// ── peças ───────────────────────────────────────────────────────────────────
function Midia({ s, lazy = true }: { s: Story; lazy?: boolean }) {
  if (s.tipo === 'video') {
    // #t=0.1 faz o Safari do iPhone mostrar o primeiro quadro em vez de tela preta.
    // eslint-disable-next-line @next/next/no-img-element
    if (s.capaUrl) return <img src={s.capaUrl} alt={s.modelo ? `Story ${s.modelo}` : 'Story'} loading={lazy ? 'lazy' : undefined} decoding="async" />
    const src = s.mediaUrl.includes('#') ? s.mediaUrl : `${s.mediaUrl}#t=0.1`
    return <video src={src} muted playsInline preload="metadata" />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={s.mediaUrl} alt={s.modelo ? `Story ${s.modelo}` : 'Story'} loading={lazy ? 'lazy' : undefined} decoding="async" />
}

function IconeTipo({ tipo }: { tipo: Story['tipo'] }) {
  return tipo === 'video' ? (
    <span className="sty-kind" title="Vídeo">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
      Vídeo
    </span>
  ) : (
    <span className="sty-kind" title="Imagem">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="1.8" /><path d="m21 15-4.5-4.5L6 21" /></svg>
      Imagem
    </span>
  )
}

function Status({ st }: { st: StoryStatus }) {
  return <span className={`sty-st sty-st-${st}`} style={{ ['--st' as string]: STATUS[st].cor }} title={STATUS[st].label}>{STATUS[st].curto ?? STATUS[st].label}</span>
}

function Kpi({ label, valor, sub, tom }: { label: string; valor: string; sub?: React.ReactNode; tom?: 'bad' }) {
  return (
    <div className="dsh-kpi">
      <div className="dsh-kpi-l">{label}</div>
      <div className="dsh-kpi-v num" style={tom === 'bad' ? { color: 'var(--bad)' } : undefined}>
        {valor === '—' ? <span className="dsh-kpi-na">—</span> : valor}
      </div>
      {sub && <div className="dsh-kpi-sub">{sub}</div>}
    </div>
  )
}

function StoryCard({ s, agora }: { s: Story; agora: number }) {
  const editavel = !['publicado', 'publicando'].includes(s.status)
  const m = s.metricas
  const publicadoMs = s.publicadoEm ? new Date(s.publicadoEm).getTime() : null
  const noAr = s.status === 'publicado' && publicadoMs !== null && agora - publicadoMs < 24 * 3_600_000
  const saida = m && typeof m.saiu === 'number' && m.views ? m.saiu / m.views : null
  return (
    <article className="sty-card" data-status={s.status}>
      <div className="sty-media">
        <Midia s={s} />
        <div className="sty-ov sty-ov-t">
          <span className="sty-time">{hora(s.publicadoEm ?? s.agendadoPara)}</span>
          <IconeTipo tipo={s.tipo} />
        </div>
        <div className="sty-ov sty-ov-b">
          <Status st={s.status} />
          {noAr && publicadoMs !== null && <span className="sty-live" title="No ar: fica 24h, sai neste horário">até {hora(new Date(publicadoMs + 24 * 3_600_000).toISOString())}</span>}
        </div>
      </div>

      <div className="sty-body">
        <div className="sty-title">
          <b>{s.modelo || 'Sem modelo'}</b>
          <small>{TEMAS[s.tema] ?? s.tema}</small>
        </div>
        {s.cta && <div className="sty-cta">“{s.cta}”</div>}
        {s.status === 'erro' && <div className="sty-err" role="alert">{s.erro || 'Falhou sem mensagem do Instagram.'}</div>}

        {s.status === 'publicado' && (
          <>
            <div className="sty-met">
              <div><small>Alcance</small><b className={m?.alcance == null ? 'na' : ''}>{num(m?.alcance)}</b></div>
              <div><small>Views</small><b className={m?.views == null ? 'na' : ''}>{num(m?.views)}</b></div>
              <div>
                <small>Respostas</small>
                <b className={m?.respostas == null ? 'na' : ''}>{num(m?.respostas)}{m?.respostasDm ? <span style={{ color: 'var(--muted)', fontWeight: 500 }}> · {m.respostasDm} DM</span> : null}</b>
              </div>
              <div><small>Saída</small><b className={saida === null ? 'na' : ''}>{pct(saida)}</b></div>
            </div>
            {temMetrica(s) ? (
              <div className="sty-nav">avançou <b>{num(m?.avancou)}</b> · voltou <b>{num(m?.voltou)}</b> · saiu <b>{num(m?.saiu)}</b> · pulou <b>{num(m?.pulou)}</b></div>
            ) : (
              <div className="sty-nav">{m ? 'Instagram ainda não liberou os números' : 'Métricas em até 30 min'}</div>
            )}
          </>
        )}

        {editavel && (
          <div className="sty-act">
            {s.status === 'aprovado'
              ? <form action={setStatusAction.bind(null, s.id, 'rascunho')}><button className="dsh-btn" title="Volta para aguardando aprovação">Segurar</button></form>
              : <form action={setStatusAction.bind(null, s.id, 'aprovado')}><button className="dsh-btn sty-btn-pri">{s.status === 'cancelado' ? 'Reativar' : 'Aprovar'}</button></form>}
            <details className="sty-more">
              <summary className="dsh-btn" aria-label="Mais ações">•••</summary>
              <div className="sty-more-p">
                <form action={reagendarAction.bind(null, s.id)}>
                  <input type="datetime-local" name="agendadoPara" defaultValue={paraInput(s.agendadoPara)} aria-label="Novo horário" required />
                  <button className="dsh-btn">Reagendar</button>
                </form>
                <form>
                  {s.status !== 'cancelado' && <button className="dsh-btn" formAction={setStatusAction.bind(null, s.id, 'cancelado')}>Cancelar</button>}
                  <button className="dsh-btn sty-btn-bad" formAction={excluirStoryAction.bind(null, s.id)}>Excluir</button>
                </form>
              </div>
            </details>
          </div>
        )}
      </div>
    </article>
  )
}

function Barra({ label, valor, max, extra }: { label: string; valor: number; max: number; extra: string }) {
  return (
    <div className="sty-bar">
      <span>{label}</span>
      <div><i style={{ width: `${max ? Math.max(2, (valor / max) * 100) : 0}%` }} /></div>
      <span>{extra}</span>
    </div>
  )
}

// ── página ──────────────────────────────────────────────────────────────────
export default async function StoriesPage({ searchParams }: { searchParams: Promise<{ dia?: string; f?: string }> }) {
  const sp = await searchParams
  const itens = await getStories()
  const agora = agoraMs()
  const hoje = diaKey(new Date(agora).toISOString())
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(sp.dia ?? '') ? sp.dia! : hoje
  const filtro: Filtro = FILTROS.some(f => f.id === sp.f) ? (sp.f as Filtro) : 'todos'

  // Dias com story (últimos 7 + todos os futuros), sempre com hoje e o dia escolhido.
  const porDia = new Map<string, Story[]>()
  for (const s of itens) {
    const d = diaKey(s.agendadoPara)
    porDia.set(d, [...(porDia.get(d) ?? []), s])
  }
  const limitePassado = somaDia(hoje, -7)
  const dias = [...new Set([hoje, dia, ...[...porDia.keys()].filter(d => d >= limitePassado)])].sort()
  const idx = dias.indexOf(dia)
  const anterior = idx > 0 ? dias[idx - 1] : null
  const proximo = idx < dias.length - 1 ? dias[idx + 1] : null

  const doDia = (porDia.get(dia) ?? []).sort((a, b) => a.agendadoPara.localeCompare(b.agendadoPara))
  const ativos = doDia.filter(s => s.status !== 'cancelado')
  const cont = Object.fromEntries(ORDEM_STATUS.map(st => [st, doDia.filter(s => s.status === st).length])) as Record<StoryStatus, number>
  const publicadosDia = doDia.filter(s => s.status === 'publicado')
  const comMetrica = publicadosDia.filter(temMetrica)
  const alcance = soma(publicadosDia, 'alcance')
  const views = soma(publicadosDia, 'views')
  const respostas = soma(publicadosDia, 'respostas')
  const respostasDm = soma(publicadosDia, 'respostasDm')
  const saiu = soma(publicadosDia, 'saiu')
  const pulou = soma(publicadosDia, 'pulou')
  const taxaSaida = saiu !== null && views ? saiu / views : null
  const proxNaFila = doDia.find(s => s.status === 'aprovado' && new Date(s.agendadoPara).getTime() > agora)

  const visiveis = doDia.filter(FILTROS.find(f => f.id === filtro)!.ok)
  const grupos = PERIODOS.map(p => ({ ...p, lista: visiveis.filter(s => { const h = horaNum(s.publicadoEm ?? s.agendadoPara); return h >= p.de && h < p.ate }) }))
    .filter(g => g.lista.length)

  // Ranking: todos os publicados com número, por respostas e depois alcance.
  const ranking = itens.filter(s => s.status === 'publicado' && s.metricas && (s.metricas.alcance ?? 0) > 0)
    .sort((a, b) => (b.metricas!.respostas ?? 0) - (a.metricas!.respostas ?? 0) || (b.metricas!.alcance ?? 0) - (a.metricas!.alcance ?? 0))
    .slice(0, 5)
  const r = resumoStories(itens)
  const maxTema = Math.max(0, ...r.porTema.map(t => t.taxaResposta))
  const maxHora = Math.max(0, ...r.porHorario.map(t => t.taxaResposta))
  const rotuloDia = dia === hoje ? 'Hoje' : dia === somaDia(hoje, 1) ? 'Amanhã' : dia === somaDia(hoje, -1) ? 'Ontem' : nomeDia(dia, { weekday: 'long' })

  return (
    <div className="dsh sty">
      <header className="sty-head">
        <Link href="/admin/instagram" className="sty-back">← Instagram</Link>
        <div className="dsh-ttl">
          <span>Instagram · agenda e resultado</span>
          <h1>Stories</h1>
        </div>
      </header>

      {/* ── dias ── */}
      <nav className="sty-days" aria-label="Escolher dia">
        <Link className="sty-days-nav" href={anterior ? href(anterior, filtro) : '#'} aria-disabled={!anterior} aria-label="Dia anterior">‹</Link>
        <div className="sty-days-list">
          {dias.map(d => {
            const l = porDia.get(d) ?? []
            const pend = l.filter(s => s.status === 'rascunho').length
            const err = l.filter(s => s.status === 'erro').length
            const pub = l.filter(s => s.status === 'publicado').length
            const total = l.filter(s => s.status !== 'cancelado').length
            return (
              <Link key={d} href={href(d, filtro)} className="sty-day" aria-current={d === dia ? 'date' : undefined}>
                <b>
                  {d === hoje ? 'Hoje' : nomeDia(d, { weekday: 'short' }).replace('.', '')}
                  {err > 0 ? <i className="sty-dot bad" title={`${err} com erro`} /> : pend > 0 ? <i className="sty-dot" title={`${pend} aguardando aprovação`} /> : null}
                </b>
                <small><span>{nomeDia(d, { day: '2-digit', month: '2-digit' })}</span><span>{total ? `${pub}/${total}` : '0'}</span></small>
              </Link>
            )
          })}
        </div>
        <Link className="sty-days-nav" href={proximo ? href(proximo, filtro) : '#'} aria-disabled={!proximo} aria-label="Próximo dia">›</Link>
      </nav>

      {/* ── KPIs do dia ── */}
      <section className="dsh-card dsh-sum" aria-label={`Resumo de ${rotuloDia}`}>
        <div className="dsh-card-h">
          <div>
            <div className="dsh-eyebrow">{nomeDia(dia, { day: '2-digit', month: 'long' })}</div>
            <h2 className="dsh-card-t" style={{ textTransform: 'capitalize' }}>{rotuloDia}</h2>
          </div>
          <div className="dsh-per-note">
            {proxNaFila
              ? <>Próximo: <b>{hora(proxNaFila.agendadoPara)}</b>{proxNaFila.modelo ? ` · ${proxNaFila.modelo}` : ''}</>
              : cont.rascunho > 0 ? <>Nada aprovado: <b>{cont.rascunho}</b> aguardando, só sai o que for aprovado</>
                : dia === hoje && ativos.length ? 'Nada mais na fila hoje' : ''}
          </div>
        </div>
        {doDia.length > 0 && (
          <>
            <div className="sty-prog" role="img" aria-label={ORDEM_STATUS.filter(st => cont[st]).map(st => `${cont[st]} ${STATUS[st].label}`).join(', ')}>
              {ORDEM_STATUS.filter(st => cont[st]).map(st => <i key={st} style={{ width: `${(cont[st] / doDia.length) * 100}%`, background: STATUS[st].cor }} />)}
            </div>
            <div className="sty-legend">
              {ORDEM_STATUS.filter(st => cont[st]).map(st => <span key={st}><i style={{ background: STATUS[st].cor }} />{STATUS[st].label} <b>{cont[st]}</b></span>)}
            </div>
          </>
        )}
      </section>

      <div className="dsh-kpis">
        <Kpi label="Publicados" valor={`${cont.publicado}/${ativos.length}`} sub={ativos.length ? `${cont.publicando ? `${cont.publicando} publicando · ` : ''}${Math.round((cont.publicado / ativos.length) * 100)}% do dia` : 'Nada agendado'} />
        <Kpi label="Agendados" valor={String(cont.aprovado + cont.rascunho)} sub={`${cont.aprovado} aprovados · ${cont.rascunho} aguardando`} />
        <Kpi label="Erros" valor={String(cont.erro)} tom={cont.erro ? 'bad' : undefined} sub={cont.cancelado ? `${cont.cancelado} cancelados` : 'Nenhum cancelado'} />
        <Kpi label="Alcance total" valor={num(alcance)} sub={views !== null ? `${num(views)} views` : publicadosDia.length ? `${comMetrica.length} de ${publicadosDia.length} com números` : 'Sem publicados'} />
        <Kpi label="Respostas" valor={num(respostas)} sub={respostasDm !== null ? `${num(respostasDm)} chegaram na DM` : 'Resposta vai pro assistente'} />
        <Kpi label="Taxa de saída" valor={pct(taxaSaida)} sub={taxaSaida !== null ? `saiu ${num(saiu)} de ${num(views)} views${pulou !== null ? ` · pulou ${num(pulou)}` : ''}` : 'Saiu ÷ views'} />
      </div>

      {/* ── grade do dia ── */}
      <section className="dsh-card" aria-label="Stories do dia">
        <div className="sty-tools">
          <div className="dsh-seg sty-seg" role="tablist">
            {FILTROS.map(f => {
              const n = doDia.filter(f.ok).length
              if (f.id !== 'todos' && f.id !== filtro && n === 0) return null
              return <Link key={f.id} href={href(dia, f.id)} aria-current={f.id === filtro ? 'page' : undefined}>{f.label} <em>{n}</em></Link>
            })}
          </div>
          {cont.rascunho > 0 && (
            <form action={aprovarDiaAction.bind(null, dia)}>
              <button className="dsh-btn sty-btn-pri">Aprovar {cont.rascunho} do dia</button>
            </form>
          )}
        </div>

        {grupos.length === 0 ? (
          <div className="sty-empty">{doDia.length ? 'Nenhum story neste filtro.' : 'Nenhum story agendado para este dia.'}</div>
        ) : grupos.map(g => (
          <div key={g.label} className="sty-period">
            <h3>{g.label} <small>{String(g.de).padStart(2, '0')}h–{String(g.ate).padStart(2, '0')}h · {g.lista.length}</small></h3>
            <div className="sty-grid">
              {g.lista.map(s => <StoryCard key={s.id} s={s} agora={agora} />)}
            </div>
          </div>
        ))}
      </section>

      {/* ── ranking + estratégia ── */}
      <div className="sty-cols">
        <section className="dsh-card">
          <div className="dsh-card-h">
            <h2 className="dsh-card-t">Melhores stories</h2>
            <span className="dsh-per-note">por respostas, depois alcance</span>
          </div>
          {ranking.length === 0 ? (
            <div className="sty-empty">Aparece quando o Instagram liberar os números dos publicados (até 24h).</div>
          ) : (
            <div className="sty-rank">
              {ranking.map((s, i) => (
                <Link key={s.id} href={href(diaKey(s.agendadoPara), 'publicados')} className="sty-rank-i" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <span>{i + 1}</span>
                  <div className="sty-th"><Midia s={s} /></div>
                  <div style={{ minWidth: 0 }}>
                    <b>{s.modelo || 'Sem modelo'}</b>
                    <small>{nomeDia(diaKey(s.agendadoPara), { day: '2-digit', month: '2-digit' })} {hora(s.publicadoEm ?? s.agendadoPara)} · {s.tipo === 'video' ? 'vídeo' : 'imagem'} · {TEMAS[s.tema] ?? s.tema}</small>
                  </div>
                  <div className="sty-rank-v">
                    <b>{num(s.metricas!.respostas)}</b> <small>resp.</small>
                    <small>{num(s.metricas!.alcance)} alcance</small>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="dsh-card">
          <div className="dsh-card-h">
            <h2 className="dsh-card-t">O que mais gera resposta</h2>
            <span className="dsh-per-note">respostas ÷ alcance · {r.publicados} stories</span>
          </div>
          {r.porTema.length === 0 ? (
            <div className="sty-empty">Aparece depois dos primeiros stories com números.</div>
          ) : (
            <div className="sty-bars">
              <b>Por tema</b>
              {r.porTema.map(t => <Barra key={t.chave} label={TEMAS[t.chave as StoryTema] ?? t.chave} valor={t.taxaResposta} max={maxTema} extra={`${pct(t.taxaResposta)} · ${t.n}`} />)}
              <b>Por horário</b>
              {r.porHorario.map(t => <Barra key={t.chave} label={t.chave} valor={t.taxaResposta} max={maxHora} extra={`${pct(t.taxaResposta)} · alc. ${num(t.alcanceMedio)}`} />)}
            </div>
          )}
        </section>
      </div>

      {/* ── adicionar ── */}
      <details className="dsh-card sty-add">
        <summary><h2 className="dsh-card-t">Adicionar story</h2></summary>
        <form action={addStoryAction} className="sty-form">
          <label className="wide">Link da mídia (9:16, .jpg, .png ou .mp4)
            <input name="mediaUrl" placeholder="https://…" required inputMode="url" />
          </label>
          <label>Horário (Brasília)<input name="agendadoPara" type="datetime-local" required /></label>
          <label>Tema
            <select name="tema" defaultValue="produto">
              {Object.entries(TEMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>Modelo<input name="modelo" placeholder="ex.: Juliet" /></label>
          <label>Chamada<input name="cta" placeholder='ex.: "responde 🔥"' /></label>
          <label className="wide">Observação<input name="nota" placeholder="opcional" /></label>
          <div className="sty-form-f">
            <label className="chk"><input type="checkbox" name="aprovar" /> Já aprovar</label>
            <button className="dsh-btn sty-btn-pri">Agendar</button>
          </div>
        </form>
        <p className="dsh-per-note" style={{ margin: 0 }}>
          Só story aprovado é publicado. A API não aceita figurinhas (link, enquete, música): a chamada vai na arte, e quem responde cai no assistente da DM.
        </p>
      </details>
    </div>
  )
}
