import Link from 'next/link'
import { getFila, type ItemFila, type RepostStatus } from '@/lib/ig/feed'
import { addReelAction, setStatusAction, aprovarDiaAction, legendaAction, reagendarAction, soReelsAction, excluirAction } from './actions'
import '../../_components/dashboard/dashboard.css'
import '../stories/stories.css'
import './reels.css'

export const metadata = { title: 'Reels · Instagram · Just Runner' }
export const dynamic = 'force-dynamic'

// Agenda e resultado dos Reels — mesma cara da página de Stories. Os itens
// vêm da fila do feed (formato 'reels'); o cron (ig-stories/ig-feed) publica e, por 7 dias,
// atualiza os números de cada reel a cada hora.

const TZ = 'America/Sao_Paulo'
const PATH = '/admin/instagram/reels'

// Cor + texto sempre juntos: o status nunca depende só da cor.
const STATUS: Record<RepostStatus, { label: string; cor: string; curto?: string }> = {
  rascunho: { label: 'Aguardando aprovação', curto: 'Aguardando', cor: '#71717a' },
  aprovado: { label: 'Aprovado', cor: '#2563eb' },
  publicando: { label: 'Publicando', cor: '#d97706' },
  publicado: { label: 'Publicado', cor: '#059669' },
  erro: { label: 'Erro', cor: '#dc2626' },
  cancelado: { label: 'Cancelado', cor: '#52525b' },
}
const ORDEM_STATUS: RepostStatus[] = ['publicado', 'publicando', 'aprovado', 'rascunho', 'erro', 'cancelado']

type Filtro = 'todos' | 'pendentes' | 'fila' | 'publicados' | 'erros'
const FILTROS: { id: Filtro; label: string; ok: (i: ItemFila) => boolean }[] = [
  { id: 'todos', label: 'Todos', ok: () => true },
  { id: 'pendentes', label: 'Aguardando', ok: i => i.status === 'rascunho' },
  { id: 'fila', label: 'Na fila', ok: i => i.status === 'aprovado' || i.status === 'publicando' },
  { id: 'publicados', label: 'Publicados', ok: i => i.status === 'publicado' },
  { id: 'erros', label: 'Erros', ok: i => i.status === 'erro' },
]

// ── formatação ───────────────────────────────────────────────────────────────
const diaKey = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso))
const hora = (iso: string) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(iso))
const num = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toLocaleString('pt-BR'))
const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`)
const seg = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}s`)
const nomeDia = (d: string, opt: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { ...opt, timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`))
const somaDia = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const paraInput = (iso: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date(iso)).map(x => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}`
}
const href = (dia: string, f: Filtro) => `${PATH}?dia=${dia}${f === 'todos' ? '' : `&f=${f}`}`
const primeiraLinha = (l: string) => l.split('\n').find(x => x.trim()) ?? ''

/** Agora (fora do componente: Date.now() não pode rodar no render). */
function agoraMs(): number { return Date.now() }

type Campo = 'alcance' | 'views' | 'curtidas' | 'comentarios' | 'salvos' | 'compartilhamentos' | 'interacoes'
/** Soma uma métrica só dos reels que já têm o número; nenhum → null ('—'), nunca 0 inventado. */
function soma(lista: ItemFila[], campo: Campo): number | null {
  const v = lista.map(i => i.metricas?.[campo]).filter((x): x is number => typeof x === 'number')
  return v.length ? v.reduce((a, b) => a + b, 0) : null
}

// ── peças ───────────────────────────────────────────────────────────────────
function Video({ i }: { i: ItemFila }) {
  const url = i.midias[0]
  if (!url) return null
  // #t=0.1 faz o Safari do iPhone mostrar o primeiro quadro em vez de tela preta.
  return <video src={url.includes("#") ? url : `${url}#t=0.1`} poster={i.thumb ?? undefined} muted playsInline controls={!!i.thumb} preload={i.thumb ? 'none' : 'metadata'} />
}

function Status({ st }: { st: RepostStatus }) {
  return <span className="sty-st" style={{ ['--st' as string]: STATUS[st].cor }} title={STATUS[st].label}>{STATUS[st].curto ?? STATUS[st].label}</span>
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

function ReelCard({ i }: { i: ItemFila }) {
  const editavel = !['publicado', 'publicando'].includes(i.status)
  const m = i.metricas
  const taxa = m && m.interacoes !== null && m.alcance ? m.interacoes / m.alcance : null
  return (
    <article className="sty-card" data-status={i.status}>
      <div className="sty-media">
        <Video i={i} />
        <div className="sty-ov sty-ov-t">
          <span className="sty-time">{hora(i.publicadoEm ?? i.agendadoPara)}</span>
          <span className="sty-kind" title={i.soReels ? 'Só na aba Reels, fora do grid' : 'Aparece no grid e nos Reels'}>{i.soReels ? 'Só Reels' : 'Reels + feed'}</span>
        </div>
        <div className="sty-ov sty-ov-b">
          <Status st={i.status} />
          {i.status === 'publicado' && i.igMediaId && <span className="sty-live rls-live">no ar</span>}
        </div>
      </div>

      <div className="sty-body">
        <div className="rls-cap" title={i.legenda}>{primeiraLinha(i.legenda) || <em>Sem legenda</em>}</div>
        {i.status === 'erro' && <div className="sty-err" role="alert">{i.erro || 'Falhou sem mensagem do Instagram.'}</div>}

        {i.status === 'publicado' && (
          <>
            <div className="sty-met">
              <div><small>Views</small><b className={m?.views == null ? 'na' : ''}>{num(m?.views)}</b></div>
              <div><small>Alcance</small><b className={m?.alcance == null ? 'na' : ''}>{num(m?.alcance)}</b></div>
              <div><small>Interações</small><b className={m?.interacoes == null ? 'na' : ''}>{num(m?.interacoes)}</b></div>
              <div><small>Tempo</small><b className={m?.tempoMedio == null ? 'na' : ''}>{seg(m?.tempoMedio)}</b></div>
            </div>
            <div className="sty-nav">
              {m
                ? <>curtidas <b>{num(m.curtidas)}</b> · coment. <b>{num(m.comentarios)}</b> · salvos <b>{num(m.salvos)}</b> · compart. <b>{num(m.compartilhamentos)}</b>{taxa !== null && <> · engaj. <b>{pct(taxa)}</b></>}</>
                : 'Números em até 1h'}
            </div>
            {i.permalink && <a className="rls-link" href={i.permalink} target="_blank" rel="noopener noreferrer">Ver no Instagram ↗</a>}
          </>
        )}

        {editavel && (
          <div className="sty-act">
            {i.status === 'aprovado'
              ? <form action={setStatusAction.bind(null, i.id, 'rascunho')}><button className="dsh-btn" title="Volta para aguardando aprovação">Segurar</button></form>
              : <form action={setStatusAction.bind(null, i.id, 'aprovado')}><button className="dsh-btn sty-btn-pri">{i.status === 'cancelado' ? 'Reativar' : 'Aprovar'}</button></form>}
            <details className="sty-more">
              <summary className="dsh-btn" aria-label="Mais ações">•••</summary>
              <div className="sty-more-p">
                <form action={legendaAction.bind(null, i.id)} className="rls-leg">
                  <textarea name="legenda" defaultValue={i.legenda} rows={6} aria-label="Legenda" />
                  <button className="dsh-btn">Salvar legenda</button>
                </form>
                <form action={reagendarAction.bind(null, i.id)}>
                  <input type="datetime-local" name="agendadoPara" defaultValue={paraInput(i.agendadoPara)} aria-label="Novo horário" required />
                  <button className="dsh-btn">Reagendar</button>
                </form>
                <form>
                  <button className="dsh-btn" formAction={soReelsAction.bind(null, i.id, !i.soReels)}>{i.soReels ? 'Mostrar no feed também' : 'Só na aba Reels'}</button>
                  {i.status !== 'cancelado' && <button className="dsh-btn" formAction={setStatusAction.bind(null, i.id, 'cancelado')}>Cancelar</button>}
                  <button className="dsh-btn sty-btn-bad" formAction={excluirAction.bind(null, i.id)}>Excluir</button>
                </form>
              </div>
            </details>
          </div>
        )}
      </div>
    </article>
  )
}

// ── página ──────────────────────────────────────────────────────────────────
export default async function ReelsPage({ searchParams }: { searchParams: Promise<{ dia?: string; f?: string }> }) {
  const sp = await searchParams
  const itens = (await getFila()).filter(i => i.formato === 'reels')
  const agora = agoraMs()
  const hoje = diaKey(new Date(agora).toISOString())
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(sp.dia ?? '') ? sp.dia! : hoje
  const filtro: Filtro = FILTROS.some(f => f.id === sp.f) ? (sp.f as Filtro) : 'todos'

  const porDia = new Map<string, ItemFila[]>()
  for (const i of itens) {
    const d = diaKey(i.agendadoPara)
    porDia.set(d, [...(porDia.get(d) ?? []), i])
  }
  const limitePassado = somaDia(hoje, -14)
  const dias = [...new Set([hoje, dia, ...[...porDia.keys()].filter(d => d >= limitePassado)])].sort()
  const idx = dias.indexOf(dia)
  const anterior = idx > 0 ? dias[idx - 1] : null
  const proximo = idx < dias.length - 1 ? dias[idx + 1] : null

  const doDia = (porDia.get(dia) ?? []).sort((a, b) => a.agendadoPara.localeCompare(b.agendadoPara))
  const ativos = doDia.filter(i => i.status !== 'cancelado')
  const cont = Object.fromEntries(ORDEM_STATUS.map(st => [st, doDia.filter(i => i.status === st).length])) as Record<RepostStatus, number>
  const publicadosDia = doDia.filter(i => i.status === 'publicado')
  const views = soma(publicadosDia, 'views')
  const alcance = soma(publicadosDia, 'alcance')
  const interacoes = soma(publicadosDia, 'interacoes')
  const comTempo = publicadosDia.filter(i => typeof i.metricas?.tempoMedio === 'number')
  const tempoMedio = comTempo.length ? comTempo.reduce((t, i) => t + i.metricas!.tempoMedio!, 0) / comTempo.length : null
  const proxNaFila = doDia.find(i => i.status === 'aprovado' && new Date(i.agendadoPara).getTime() > agora)
  const visiveis = doDia.filter(FILTROS.find(f => f.id === filtro)!.ok)

  const ranking = itens.filter(i => i.status === 'publicado' && (i.metricas?.views ?? 0) > 0)
    .sort((a, b) => (b.metricas!.views ?? 0) - (a.metricas!.views ?? 0))
    .slice(0, 5)
  const rotuloDia = dia === hoje ? 'Hoje' : dia === somaDia(hoje, 1) ? 'Amanhã' : dia === somaDia(hoje, -1) ? 'Ontem' : nomeDia(dia, { weekday: 'long' })

  return (
    <div className="dsh sty">
      <header className="sty-head">
        <Link href="/admin/instagram" className="sty-back">← Instagram</Link>
        <div className="dsh-ttl">
          <span>Instagram · agenda e resultado</span>
          <h1>Reels</h1>
        </div>
      </header>

      {/* ── dias ── */}
      <nav className="sty-days" aria-label="Escolher dia">
        <Link className="sty-days-nav" href={anterior ? href(anterior, filtro) : '#'} aria-disabled={!anterior} aria-label="Dia anterior">‹</Link>
        <div className="sty-days-list">
          {dias.map(d => {
            const l = porDia.get(d) ?? []
            const pend = l.filter(i => i.status === 'rascunho').length
            const err = l.filter(i => i.status === 'erro').length
            const pub = l.filter(i => i.status === 'publicado').length
            const total = l.filter(i => i.status !== 'cancelado').length
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

      {/* ── resumo do dia ── */}
      <section className="dsh-card dsh-sum" aria-label={`Resumo de ${rotuloDia}`}>
        <div className="dsh-card-h">
          <div>
            <div className="dsh-eyebrow">{nomeDia(dia, { day: '2-digit', month: 'long' })}</div>
            <h2 className="dsh-card-t" style={{ textTransform: 'capitalize' }}>{rotuloDia}</h2>
          </div>
          <div className="dsh-per-note">
            {proxNaFila
              ? <>Próximo: <b>{hora(proxNaFila.agendadoPara)}</b> · {primeiraLinha(proxNaFila.legenda).slice(0, 40)}</>
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
        <Kpi label="Views" valor={num(views)} sub={alcance !== null ? `${num(alcance)} contas alcançadas` : publicadosDia.length ? 'Números em até 1h' : 'Sem publicados'} />
        <Kpi label="Interações" valor={num(interacoes)} sub={interacoes !== null && alcance ? `${pct(interacoes / alcance)} do alcance` : 'Curtidas, coment., salvos, compart.'} />
        <Kpi label="Tempo médio" valor={seg(tempoMedio)} sub="assistido por view" />
      </div>

      {/* ── reels do dia ── */}
      <section className="dsh-card" aria-label="Reels do dia">
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
        {visiveis.length === 0
          ? <div className="sty-empty">{doDia.length ? 'Nenhum reel neste filtro.' : 'Nenhum reel agendado para este dia.'}</div>
          : <div className="sty-grid">{visiveis.map(i => <ReelCard key={i.id} i={i} />)}</div>}
      </section>

      {/* ── ranking ── */}
      <section className="dsh-card">
        <div className="dsh-card-h">
          <h2 className="dsh-card-t">Melhores reels</h2>
          <span className="dsh-per-note">por views · números atualizados por 7 dias</span>
        </div>
        {ranking.length === 0 ? (
          <div className="sty-empty">Aparece quando o Instagram liberar os números dos publicados.</div>
        ) : (
          <div className="sty-rank">
            {ranking.map((i, n) => (
              <Link key={i.id} href={href(diaKey(i.agendadoPara), 'publicados')} className="sty-rank-i" style={{ color: 'inherit', textDecoration: 'none' }}>
                <span>{n + 1}</span>
                <div className="sty-th"><Video i={i} /></div>
                <div style={{ minWidth: 0 }}>
                  <b style={{ textTransform: 'none' }}>{primeiraLinha(i.legenda) || 'Sem legenda'}</b>
                  <small>{nomeDia(diaKey(i.agendadoPara), { day: '2-digit', month: '2-digit' })} {hora(i.publicadoEm ?? i.agendadoPara)} · {i.soReels ? 'só Reels' : 'Reels + feed'} · {seg(i.metricas!.tempoMedio)} médio</small>
                </div>
                <div className="sty-rank-v">
                  <b>{num(i.metricas!.views)}</b> <small>views</small>
                  <small>{num(i.metricas!.interacoes)} interações</small>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── adicionar ── */}
      <details className="dsh-card sty-add">
        <summary><h2 className="dsh-card-t">Agendar reel</h2></summary>
        <form action={addReelAction} className="sty-form">
          <label className="wide">Link do vídeo (9:16, .mp4 ou arquivo do Drive público)
            <input name="url" placeholder="https://drive.google.com/file/d/…" required inputMode="url" />
          </label>
          <label>Horário (Brasília)<input name="agendadoPara" type="datetime-local" required /></label>
          <label className="wide">Legenda
            <textarea name="legenda" rows={5} className="rls-ta" placeholder="Texto do post, com hashtags" />
          </label>
          <div className="sty-form-f">
            <label className="chk"><input type="checkbox" name="soReels" defaultChecked /> Só na aba Reels (fora do grid)</label>
            <label className="chk"><input type="checkbox" name="aprovar" /> Já aprovar</label>
            <button className="dsh-btn sty-btn-pri">Agendar</button>
          </div>
        </form>
        <p className="dsh-per-note" style={{ margin: 0 }}>
          Só reel aprovado é publicado. A API não apaga post: para tirar um reel do ar, apague no app.
        </p>
      </details>
    </div>
  )
}
