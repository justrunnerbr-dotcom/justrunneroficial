'use client'

import { useMemo, useState } from 'react'
import { Download, Lightbulb, ListChecks, LayoutGrid, FlaskConical } from 'lucide-react'
import {
  bars, fieldBars, cross, insights, toCsv, sampleRows, answersOf, bonusNome, SEGMENTS, UNICAS_DESDE, diaSP,
  type QuizRow, type Bar, type Cross,
} from '@/lib/quiz/analise'
import { labelOf } from '@/lib/quiz/perguntas'
import { QUIZ_VALIDADE_LABEL } from '@/lib/quiz/bonus'

const card: React.CSSProperties = { background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '16px 18px' }
const small: React.CSSProperties = { fontSize: '11px', color: 'var(--admin-text-muted)' }
const fmtPct = (v: number) => `${Math.round(v * 100)}%`
const fmtInt = (n: number) => n.toLocaleString('pt-BR')
const fmtDia = (d: string) => { const [, m, dd] = d.split('-'); return `${dd}/${m}` }
const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

type Tab = 'geral' | 'insights' | 'respostas'

function baixar(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function BarList({ title, data, note }: { title: string; data: { bars: Bar[]; base: number }; note?: string }) {
  const max = Math.max(...data.bars.map(b => b.pct), 0.0001)
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--admin-text-main)' }}>{title}</h3>
        <span style={small}>{fmtInt(data.base)} {data.base === 1 ? 'pessoa' : 'pessoas'}</span>
      </div>
      {data.base === 0 ? <p style={{ ...small, margin: 0 }}>Sem respostas ainda.</p> : (
        <div style={{ display: 'grid', gap: 7 }}>
          {data.bars.map(b => (
            <div key={b.value} title={`${b.label}: ${fmtInt(b.count)} (${fmtPct(b.pct)})`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--admin-text-sec)', marginBottom: 3 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
                <span style={{ fontFamily: 'monospace', whiteSpace: 'nowrap', color: 'var(--admin-text-main)' }}>{fmtPct(b.pct)} <span style={small}>· {fmtInt(b.count)}</span></span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'var(--admin-border)', overflow: 'hidden' }}>
                <div style={{ width: `${(b.pct / max) * 100}%`, height: '100%', borderRadius: 99, background: 'var(--admin-accent)' }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {note && <p style={{ ...small, margin: '10px 0 0' }}>{note}</p>}
    </div>
  )
}

function CrossTable({ title, data, note }: { title: string; data: Cross; note?: string }) {
  const vals = data.cells.flatMap((row, i) => row.map(c => data.pct ? c / (data.rowTotals[i] || 1) : c))
  const max = Math.max(...vals, 0.0001)
  return (
    <div style={{ ...card, overflowX: 'auto' }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: 'var(--admin-text-main)' }}>{title}</h3>
      {data.rows.length === 0 ? <p style={{ ...small, margin: 0 }}>Sem respostas suficientes ainda.</p> : (
        <table style={{ borderCollapse: 'separate', borderSpacing: 3, fontSize: 11, minWidth: '100%' }}>
          <thead>
            <tr>
              <th />
              {data.colLabels.map(c => <th key={c} style={{ ...small, fontWeight: 600, padding: '2px 4px', textAlign: 'center', minWidth: 54 }}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={r}>
                <td style={{ fontSize: 12, color: 'var(--admin-text-sec)', whiteSpace: 'nowrap', paddingRight: 8 }}>{data.rowLabels[i]} <span style={small}>({fmtInt(data.rowTotals[i])})</span></td>
                {data.cells[i].map((c, j) => {
                  const v = data.pct ? c / (data.rowTotals[i] || 1) : c
                  return (
                    <td key={j} title={`${data.rowLabels[i]} × ${data.colLabels[j]}: ${fmtInt(c)}`} style={{
                      textAlign: 'center', padding: '6px 4px', borderRadius: 6, fontFamily: 'monospace',
                      background: `rgba(var(--admin-accent-rgb), ${0.06 + (v / max) * 0.6})`, color: 'var(--admin-text-main)',
                    }}>{data.pct ? fmtPct(v) : c || '·'}</td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {note && <p style={{ ...small, margin: '10px 0 0' }}>{note}</p>}
    </div>
  )
}

function Section({ title, sub, wide, children }: { title: string; sub?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--admin-text-main)' }}>{title}</h2>
      {sub && <p style={{ ...small, fontSize: 12, margin: '3px 0 0' }}>{sub}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: wide ? '1fr' : 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 12, marginTop: 12 }}>{children}</div>
    </section>
  )
}

export function QuizAdminClient({ rows: reais, erro }: { rows: QuizRow[]; erro: string | null }) {
  const [exemplo, setExemplo] = useState(false)
  const [tab, setTab] = useState<Tab>('geral')
  // Filtros da tela inteira (gráficos, insights, lista e CSV): só respostas no
  // formato de resposta única (desde 12/10) e/ou um dia específico.
  const [soUnicas, setSoUnicas] = useState(false)
  const [dia, setDia] = useState<string | null>(null)
  const exemplos = useMemo(() => sampleRows(), [])
  const todas = exemplo ? exemplos : reais
  const doPeriodo = useMemo(() => soUnicas ? todas.filter(r => r.created_at >= UNICAS_DESDE) : todas, [todas, soUnicas])
  const rows = useMemo(() => dia ? doPeriodo.filter(r => diaSP(r.created_at) === dia) : doPeriodo, [doPeriodo, dia])
  const porDia = useMemo(() => {
    const m = new Map<string, { total: number; completos: number; cupons: number }>()
    for (const r of doPeriodo) {
      const d = diaSP(r.created_at), x = m.get(d) ?? { total: 0, completos: 0, cupons: 0 }
      x.total++; if (r.completo) x.completos++; if (r.cupom) x.cupons++
      m.set(d, x)
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [doPeriodo])
  const comResposta = useMemo(() => rows.filter(r => Object.keys(r.respostas ?? {}).length > 0), [rows])
  const ins = useMemo(() => insights(comResposta), [comResposta])

  const completos = rows.filter(r => r.completo).length
  const cupons = rows.filter(r => r.cupom).length

  const tabs: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
    { key: 'geral', label: 'Visão geral', icon: LayoutGrid },
    { key: 'insights', label: 'Insights', icon: Lightbulb },
    { key: 'respostas', label: `Respostas (${fmtInt(rows.length)})`, icon: ListChecks },
  ]

  const b = (qid: string, keep = false) => bars(comResposta, qid, keep)

  return (
    <div style={{ padding: '24px clamp(14px, 3vw, 28px) 48px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--admin-text-main)' }}>Quiz do cliente</h1>
          <p style={{ ...small, fontSize: 12, margin: '4px 0 0' }}>Respostas de justrunner.com.br/quiz · bônus válido até {QUIZ_VALIDADE_LABEL}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setExemplo(e => !e)} aria-pressed={exemplo} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${exemplo ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
            background: exemplo ? 'rgba(var(--admin-accent-rgb), 0.12)' : 'var(--admin-card)', color: exemplo ? 'var(--admin-accent)' : 'var(--admin-text-sec)',
          }}><FlaskConical size={14} /> {exemplo ? 'Vendo dados de exemplo' : 'Ver com dados de exemplo'}</button>
          <button type="button" onClick={() => baixar(exemplo ? 'quiz-exemplo.csv' : `quiz-respostas${soUnicas ? '-unicas' : ''}${dia ? `-${dia}` : ''}.csv`, toCsv(rows))} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: 'var(--admin-text-sec)',
          }}><Download size={14} /> CSV</button>
        </div>
      </div>

      {erro && <div role="alert" style={{ ...card, marginTop: 16, borderColor: 'var(--admin-red)', fontSize: 13 }}>{erro}</div>}
      {exemplo && <div style={{ ...card, marginTop: 16, fontSize: 12, borderColor: 'var(--admin-accent)', color: 'var(--admin-text-sec)' }}>Dados de exemplo gerados aqui ({fmtInt(rows.length)} respostas fictícias) — não são clientes reais. Clique de novo pra voltar às respostas reais.</div>}


      <div style={{ ...card, marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <span style={{ ...small, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', fontSize: 10 }}>Período</span>
        {([[false, 'Todas as respostas'], [true, 'Só resposta única (desde 12/10 20h)']] as const).map(([v, t]) => (
          <button key={t} type="button" onClick={() => setSoUnicas(v)} aria-pressed={soUnicas === v} style={{
            padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${soUnicas === v ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
            background: soUnicas === v ? 'rgba(var(--admin-accent-rgb), 0.12)' : 'var(--admin-card)', color: soUnicas === v ? 'var(--admin-accent)' : 'var(--admin-text-sec)',
          }}>{t}</button>
        ))}
        <span style={{ ...small, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', fontSize: 10, marginLeft: 8 }}>Dia</span>
        <input type="date" value={dia ?? ''} onChange={e => setDia(e.target.value || null)} style={{
          padding: '5px 10px', borderRadius: 8, fontSize: 12, border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: 'var(--admin-text-main)',
        }} />
        {dia && <button type="button" onClick={() => setDia(null)} style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'none', border: 0, color: 'var(--admin-accent)' }}>Ver todos os dias</button>}
        <span style={{ ...small, marginLeft: 'auto' }}>{fmtInt(rows.length)} de {fmtInt(todas.length)} respostas{dia ? ` · ${fmtDia(dia)}` : ''}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 16 }}>
        {[
          ['Responderam', fmtInt(comResposta.length), 'chegaram ao fim das perguntas'],
          ['Com contato', fmtInt(completos), comResposta.length ? `${fmtPct(completos / comResposta.length)} de quem respondeu` : '—'],
          ['Bônus escolhido', fmtInt(cupons), completos ? `${fmtPct(cupons / completos)} de quem deixou contato` : '—'],
          ['Já clientes', fmtPct(b('status_cliente').bars.find(x => x.value === 'cliente')?.pct ?? 0), 'responderam "Já comprei"'],
        ].map(([t, v, s]) => (
          <div key={t} style={card}>
            <div style={{ ...small, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', fontSize: 10 }}>{t}</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: 'var(--admin-text-main)', marginTop: 4 }}>{v}</div>
            <div style={small}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20, borderBottom: '1px solid var(--admin-border)', flexWrap: 'wrap' }}>
        {tabs.map(t => {
          const Icon = t.icon, on = tab === t.key
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: 'none', border: 0, borderBottom: `2px solid ${on ? 'var(--admin-accent)' : 'transparent'}`,
              color: on ? 'var(--admin-accent)' : 'var(--admin-text-sec)', marginBottom: -1,
            }}><Icon size={14} /> {t.label}</button>
          )
        })}
      </div>

      {tab === 'geral' && (
        <>
          <Section wide title="Por dia" sub={`${soUnicas ? 'Desde 12/10 20h (resposta única)' : 'Todas as respostas'} · clique num dia pra ver só ele.`}>
            <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--admin-text-muted)' }}>
                    {['Dia', 'Respostas', 'Com contato', 'Bônus escolhido'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', fontWeight: 600, borderBottom: '1px solid var(--admin-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {porDia.map(([d, x]) => (
                    <tr key={d} onClick={() => setDia(dia === d ? null : d)} style={{
                      cursor: 'pointer', borderBottom: '1px solid var(--admin-border)', color: 'var(--admin-text-sec)',
                      background: dia === d ? 'rgba(var(--admin-accent-rgb), 0.10)' : undefined,
                    }}>
                      <td style={{ padding: '7px 12px', fontWeight: 600, color: 'var(--admin-text-main)' }}>{fmtDia(d)}</td>
                      <td style={{ padding: '7px 12px', fontFamily: 'monospace' }}>{fmtInt(x.total)}</td>
                      <td style={{ padding: '7px 12px', fontFamily: 'monospace' }}>{fmtInt(x.completos)}</td>
                      <td style={{ padding: '7px 12px', fontFamily: 'monospace' }}>{fmtInt(x.cupons)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {porDia.length === 0 && <p style={{ ...small, padding: 14, margin: 0 }}>Nenhuma resposta no período.</p>}
            </div>
          </Section>

          <Section title="Quem respondeu">
            <BarList title="Já comprou na Just Runner?" data={b('status_cliente', true)} />
            <BarList title="Como conheceu a loja" data={b('origem')} />
            <BarList title="Esporte que mais pratica" data={b('esporte')} />
            <BarList title="Treinos por semana" data={b('freq_treino', true)} />
            <BarList title="Frequência dos anúncios" data={b('freq_anuncios', true)} />
            <BarList title="Faixa de idade" data={fieldBars(comResposta, r => r.faixa_idade)} />
            <BarList title="Estado" data={fieldBars(comResposta, r => r.estado, v => v, 10)} note="Top 10." />
          </Section>

          <Section title="Por que não compram">
            <BarList title="O que impediu (ou quase impediu)" data={b('impedimentos')} note={soUnicas ? 'Uma por pessoa: só respostas desde 12/10 20h.' : 'Antes de 12/10 20h eram até 3 por pessoa; filtre "Só resposta única" pra comparar.'} />
            <BarList title="O que daria segurança" data={b('seguranca')} note="Só aparece pra quem marcou confiança, qualidade, troca, firmeza ou lente." />
          </Section>

          <Section title="Preço, oferta e produto">
            <BarList title="Percepção do preço (R$ 148,50 cada)" data={b('percepcao_preco', true)} />
            <BarList title="Pagaria até" data={b('preco_max', true)} />
            <BarList title="Oferta preferida" data={b('oferta_preferida', true)} />
            <BarList title="Segundo óculos seria pra" data={b('segundo_oculos')} />
            <BarList title="Lente que mais usa" data={b('lente_preferida')} />
            <BarList title="Bônus escolhido" data={fieldBars(comResposta, r => r.modelo_brinde, bonusNome)} />
          </Section>

          <Section wide title="Cruzamentos" sub="Pessoas em cada combinação (multi conta em todas as opções marcadas).">
            <CrossTable title="Esporte × lente que mais usa (% do esporte)"
              data={cross(comResposta, r => answersOf(r, 'esporte'), r => answersOf(r, 'lente_preferida'), v => labelOf('esporte', v), v => labelOf('lente_preferida', v), { pct: true })} />
            <CrossTable title="Esporte × modelo de bônus escolhido"
              data={cross(comResposta, r => answersOf(r, 'esporte'), r => r.modelo_brinde ? [r.modelo_brinde] : [], v => labelOf('esporte', v), bonusNome)} />
            <CrossTable title="Esporte × o que impediu a compra (% do esporte)"
              data={cross(comResposta, r => answersOf(r, 'esporte'), r => answersOf(r, 'impedimentos'), v => labelOf('esporte', v), v => labelOf('impedimentos', v), { topCols: 8, pct: true })} />
            <CrossTable title="Status de cliente × oferta preferida (% da linha)"
              data={cross(comResposta, r => answersOf(r, 'status_cliente'), r => answersOf(r, 'oferta_preferida'), v => labelOf('status_cliente', v), v => labelOf('oferta_preferida', v), { pct: true })} />
          </Section>

          <Section title="Segmentos de remarketing" sub="Contatos de quem autorizou receber o bônus. CSV pronto pra subir como público ou disparar no WhatsApp.">
            {SEGMENTS.map(s => {
              const lista = comResposta.filter(s.match)
              const contato = lista.filter(r => r.completo)
              return (
                <div key={s.id} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--admin-text-main)' }}>{s.nome}</h3>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--admin-text-main)' }}>{fmtInt(lista.length)}</span>
                  </div>
                  <p style={{ ...small, margin: '4px 0 0' }}>{s.regra} · {comResposta.length ? fmtPct(lista.length / comResposta.length) : '—'} das respostas · {fmtInt(contato.length)} com contato</p>
                  <p style={{ fontSize: 12, color: 'var(--admin-text-sec)', margin: '8px 0 10px' }}><b>Ação:</b> {s.acao}</p>
                  <button type="button" disabled={!contato.length} onClick={() => baixar(`quiz-segmento-${s.id}.csv`, toCsv(contato))} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: contato.length ? 'pointer' : 'not-allowed', opacity: contato.length ? 1 : 0.5,
                    border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: 'var(--admin-text-sec)',
                  }}><Download size={13} /> Contatos (CSV)</button>
                </div>
              )
            })}
          </Section>
        </>
      )}

      {tab === 'insights' && (
        <>
          <div style={{ ...card, marginTop: 20 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800, color: 'var(--admin-text-main)' }}>Resumo</h2>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4, fontSize: 13, color: 'var(--admin-text-sec)' }}>
              {ins.resumo.map(l => <li key={l}>{l}</li>)}
            </ul>
          </div>
          {comResposta.length > 0 && comResposta.length < 30 && (
            <p style={{ ...small, fontSize: 12, margin: '10px 0 0' }}>Com menos de 30 respostas os percentuais ainda oscilam muito — leia como tendência.</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: 12, marginTop: 12 }}>
            {ins.cards.map(c => (
              <div key={c.titulo} style={card}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--admin-text-main)' }}>{c.titulo}</h3>
                <p style={{ fontSize: 13, color: 'var(--admin-text-sec)', margin: '6px 0 0', lineHeight: 1.5 }}>{c.texto}</p>
                {c.acao && <p style={{ fontSize: 13, margin: '8px 0 0', lineHeight: 1.5, color: 'var(--admin-text-main)' }}><b>Ação:</b> {c.acao}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'respostas' && (
        <div style={{ ...card, marginTop: 20, padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--admin-text-muted)' }}>
                {['Data', 'Nome', 'WhatsApp', 'Estado', 'Status', 'Esporte', 'Impedimentos', 'Oferta', 'Bônus', 'Cupom'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 500).map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--admin-border)', color: 'var(--admin-text-sec)' }}>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--admin-text-main)' }}>{r.nome ?? <span style={small}>sem contato</span>}</td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{r.whatsapp ?? '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{r.estado ?? '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{answersOf(r, 'status_cliente').map(v => labelOf('status_cliente', v)).join(', ') || '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{answersOf(r, 'esporte').map(v => labelOf('esporte', v)).join(', ') || '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{answersOf(r, 'impedimentos').map(v => labelOf('impedimentos', v)).join(', ') || '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{answersOf(r, 'oferta_preferida').map(v => labelOf('oferta_preferida', v)).join(', ') || '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{r.modelo_brinde ? bonusNome(r.modelo_brinde) : '—'}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{r.cupom ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p style={{ ...small, padding: 16, margin: 0 }}>Nenhuma resposta ainda.</p>}
          {rows.length > 500 && <p style={{ ...small, padding: 12, margin: 0 }}>Mostrando as 500 mais recentes — o CSV traz todas.</p>}
        </div>
      )}
    </div>
  )
}
