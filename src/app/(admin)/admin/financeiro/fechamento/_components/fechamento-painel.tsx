'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { CAMPOS, calcularFechamento, type CampoFechamento, type DefinicaoCampo, type Rastreado, type Valores } from '@/lib/admin/fechamento'
import { salvarFechamento } from '../actions'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const num2 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** "1.234,56" / "1234.56" / "R$ 1.234" → número; vazio → null. */
function lerNumero(texto: string): number | null {
  let s = texto.replace(/[R$\s]/g, '').trim()
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

const GRUPOS: { id: DefinicaoCampo['grupo']; titulo: string; nota: string }[] = [
  { id: 'receita', titulo: 'Receita', nota: 'Do bruto da Yampi até a receita líquida pós-perdas.' },
  { id: 'variaveis', titulo: 'Custos variáveis', nota: 'Crescem com o número de pedidos.' },
  { id: 'marketing', titulo: 'Marketing', nota: 'Meta pelo valor da fatura, que já tem o tributo de 13,8%.' },
  { id: 'fixos', titulo: 'Custos fixos', nota: 'Estrutura do mês, inclusive a mensalidade da Yampi.' },
  { id: 'info', titulo: 'Informativo', nota: 'Não entra no lucro.' },
]

const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px' } as const
const muted = { color: 'var(--admin-text-muted)' } as const

interface Props {
  mes: string
  sistema: Valores
  digitados: Valores
  usarSistemaInicial: boolean
  observacoesIniciais: string
  atualizadoEm: string | null
  atualizadoPor: string | null
  tabelaExiste: boolean
  fontesFaltando: string[]
}

type Status = { tipo: 'ok' | 'salvando' | 'erro' | 'pendente' | 'inicial'; texto: string }

export function FechamentoPainel(p: Props) {
  const [valores, setValores] = useState<Valores>(p.digitados)
  const [textos, setTextos] = useState<Partial<Record<CampoFechamento, string>>>(() =>
    Object.fromEntries(Object.entries(p.digitados).map(([k, v]) => [k, CAMPOS.find(c => c.campo === k)?.quantidade ? String(v) : num2(v as number)])))
  const [usarSistema, setUsarSistema] = useState(p.usarSistemaInicial)
  const [obs, setObs] = useState(p.observacoesIniciais)
  const [status, setStatus] = useState<Status>(
    !p.tabelaExiste ? { tipo: 'erro', texto: 'A tabela do fechamento ainda não existe no banco: dá para simular, mas nada é salvo.' }
    : p.atualizadoEm ? { tipo: 'inicial', texto: `Salvo em ${new Date(p.atualizadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}${p.atualizadoPor ? ` por ${p.atualizadoPor}` : ''}` }
    : { tipo: 'inicial', texto: 'Nada digitado neste mês ainda.' })

  const f = useMemo(() => calcularFechamento(valores, p.sistema, usarSistema), [valores, p.sistema, usarSistema])

  // ── gravação: espera uma pausa na digitação e manda tudo de uma vez ──
  const pendente = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ultimo = useRef(JSON.stringify({ v: p.digitados, u: p.usarSistemaInicial, o: p.observacoesIniciais }))
  useEffect(() => {
    if (!p.tabelaExiste) return
    const atual = JSON.stringify({ v: valores, u: usarSistema, o: obs })
    if (atual === ultimo.current) return
    setStatus({ tipo: 'pendente', texto: 'Alterações não salvas…' })
    if (pendente.current) clearTimeout(pendente.current)
    pendente.current = setTimeout(async () => {
      setStatus({ tipo: 'salvando', texto: 'Salvando…' })
      const r = await salvarFechamento(p.mes, valores, usarSistema, obs)
      if (r.ok) {
        ultimo.current = atual
        setStatus({ tipo: 'ok', texto: `Salvo às ${new Date(r.atualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` })
      } else {
        const msg = { nao_autorizado: 'Sua sessão não permite salvar o fechamento.', mes_invalido: 'Mês inválido.', tabela_ausente: 'A tabela do fechamento ainda não existe no banco.', falhou: 'Não salvou. Tente de novo em instantes.' }[r.erro]
        setStatus({ tipo: 'erro', texto: msg })
      }
    }, 900)
    return () => { if (pendente.current) clearTimeout(pendente.current) }
  }, [valores, usarSistema, obs, p.mes, p.tabelaExiste])

  function digitar(campo: CampoFechamento, texto: string) {
    setTextos(t => ({ ...t, [campo]: texto }))
    const n = lerNumero(texto)
    setValores(v => { const nv = { ...v }; if (n === null) delete nv[campo]; else nv[campo] = n; return nv })
  }
  function usarSugestao(campo: CampoFechamento) {
    const s = p.sistema[campo]; if (s === undefined) return
    digitar(campo, CAMPOS.find(c => c.campo === campo)?.quantidade ? String(s) : num2(s))
  }

  const corStatus = { ok: 'var(--admin-green)', salvando: 'var(--admin-alert)', pendente: 'var(--admin-alert)', erro: 'var(--admin-red)', inicial: 'var(--admin-text-muted)' }[status.tipo]

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '13px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: corStatus }}>
          {status.tipo === 'salvando' ? <Loader2 size={14} className="animate-spin" /> : status.tipo === 'erro' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          {status.texto}
        </span>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--admin-text-sec)', cursor: 'pointer' }}>
          <input type="checkbox" checked={usarSistema} onChange={e => setUsarSistema(e.target.checked)} />
          Onde estiver vazio, usar a sugestão do sistema
        </label>
      </div>

      {!p.tabelaExiste && (
        <div style={{ ...card, borderColor: 'var(--admin-alert)', background: 'var(--admin-alert-soft)', padding: '12px 16px', fontSize: '13px', color: 'var(--admin-text-main)' }}>
          <b>Falta criar a tabela <code>fechamento_mensal</code> no Supabase.</b> Até lá a tela calcula com o que você digitar, mas não guarda.
        </div>
      )}
      {p.fontesFaltando.length > 0 && (
        <div style={{ ...card, borderColor: 'var(--admin-alert)', padding: '10px 16px', fontSize: '12.5px', color: 'var(--admin-text-sec)' }}>
          Sugestões incompletas: {p.fontesFaltando.join(', ')} não entraram no cálculo do sistema.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '16px', alignItems: 'start' }} className="fechamento-grid">
        <div style={{ display: 'grid', gap: '14px', minWidth: 0 }}>
          {GRUPOS.map(g => (
            <section key={g.id} style={card}>
              <header style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--admin-border)' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)' }}>{g.titulo}</h2>
                <p style={{ fontSize: '12px', ...muted }}>{g.nota}</p>
              </header>
              {CAMPOS.filter(c => c.grupo === g.id).map(c => {
                const s = p.sistema[c.campo], e = f.efetivos[c.campo]
                return (
                  <div key={c.campo} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 170px 170px', gap: '12px', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid var(--admin-border)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--admin-text-main)' }}>{c.nome}</div>
                      <div style={{ fontSize: '11.5px', ...muted }}>{c.dica}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--admin-info)' }}>
                      {s !== undefined ? (
                        <>
                          <span style={{ fontFamily: 'monospace' }}>sistema {c.quantidade ? s : brl(s)}</span>{' '}
                          <button type="button" onClick={() => usarSugestao(c.campo)} style={{ fontSize: '11px', border: '1px solid var(--admin-border)', borderRadius: '6px', padding: '1px 7px', background: 'transparent', color: 'var(--admin-info)', cursor: 'pointer' }}>usar</button>
                        </>
                      ) : c.campo === 'pedidos_base_appmax' ? <span style={muted}>vazio = pedidos pagos</span> : <span style={muted}>só na fatura/extrato</span>}
                    </div>
                    <div style={{ position: 'relative' }}>
                      {!c.quantidade && <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', ...muted }}>R$</span>}
                      <input
                        inputMode={c.quantidade ? 'numeric' : 'decimal'}
                        value={textos[c.campo] ?? ''}
                        placeholder={e.fonte === 'sistema' || e.fonte === 'padrao' ? (c.quantidade ? String(e.valor) : num2(e.valor)) : c.quantidade ? '0' : '0,00'}
                        onChange={ev => digitar(c.campo, ev.target.value)}
                        onBlur={() => { const n = valores[c.campo]; if (n !== undefined) setTextos(t => ({ ...t, [c.campo]: c.quantidade ? String(n) : num2(n) })) }}
                        aria-label={c.nome}
                        style={{
                          width: '100%', padding: c.quantidade ? '7px 10px' : '7px 10px 7px 30px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px',
                          borderRadius: '8px', border: `1px solid ${e.fonte === 'digitado' ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                          background: e.fonte === 'digitado' ? 'var(--admin-card)' : 'var(--admin-bg)', color: 'var(--admin-text-main)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </section>
          ))}
          <section style={{ ...card, padding: '12px 16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '6px' }}>Observações</h2>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={4} placeholder="De onde saiu cada número, o que ficou pendente…"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text-main)', fontSize: '13px', resize: 'vertical' }} />
          </section>
        </div>

        <aside style={{ ...card, position: 'sticky', top: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--admin-border)' }}>
            <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', ...muted }}>Lucro operacional</p>
            <p style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', color: f.lucro < 0 ? 'var(--admin-red)' : 'var(--admin-text-main)', lineHeight: 1.15 }}>{brl(f.lucro)}</p>
            <p style={{ fontSize: '12.5px', color: 'var(--admin-text-sec)' }}>margem de {f.margem.valor === null ? '—' : `${f.margem.valor.toLocaleString('pt-BR')}%`} sobre a receita líquida</p>
          </div>
          <div style={{ padding: '8px 0' }}>
            <Linha k="Vendas brutas" v={f.efetivos.receita_bruta.valor} />
            <Linha k="(−) Taxas AppMax antes do recebimento" v={-f.efetivos.taxas_pre_recebimento.valor} />
            <Linha k="Líquido AppMax" v={f.receitaProcessador} forte />
            <Linha k="(−) Estornos e chargebacks" v={-f.efetivos.perdas.valor} />
            <Linha k="Receita líquida pós-perdas" v={f.receitaLiquida} forte />
            <Linha k="(−) Custos variáveis" v={-f.variaveis} />
            <Linha k="Margem de contribuição" v={f.contribuicao} forte />
            <Linha k="(−) Marketing" v={-f.marketing} />
            <Linha k="Resultado antes dos fixos" v={f.antesDosFixos} forte />
            <Linha k="(−) Custos fixos" v={-f.efetivos.fixos.valor} />
            <Linha k="Lucro operacional" v={f.lucro} forte />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--admin-border)' }}>
            <Kpi rotulo="Ticket médio" t={f.ticket} dinheiro />
            <Kpi rotulo="CPA" t={f.cpa} dinheiro />
            <Kpi rotulo="Lucro por pedido" t={f.lucroPorPedido} dinheiro />
            <Kpi rotulo="CPA de equilíbrio" t={f.cpaEquilibrio} dinheiro />
          </div>
          <div style={{ padding: '10px 16px 14px', borderTop: '1px solid var(--admin-border)', fontSize: '12px', color: 'var(--admin-text-sec)' }}>
            Frete líquido (pago − cobrado): <b style={{ fontFamily: 'monospace' }}>{brl(f.freteLiquido)}</b>
            {f.usandoSistema.length > 0 && (
              <p style={{ marginTop: '6px', color: 'var(--admin-alert)' }}>
                {f.usandoSistema.length} {f.usandoSistema.length === 1 ? 'linha usa' : 'linhas usam'} a sugestão do sistema, não um valor de fatura ou extrato.
              </p>
            )}
          </div>
        </aside>
      </div>
      <style>{`@media (max-width: 980px) { .fechamento-grid { grid-template-columns: 1fr !important; } .fechamento-grid aside { position: static !important; order: -1; } }`}</style>
    </div>
  )
}

function Linha({ k, v, forte }: { k: string; v: number; forte?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: forte ? '6px 16px' : '3px 16px', fontSize: '12.5px', borderTop: forte ? '1px solid var(--admin-border)' : undefined, fontWeight: forte ? 700 : 400, color: forte ? 'var(--admin-text-main)' : 'var(--admin-text-sec)' }}>
      <span>{k}</span><span style={{ fontFamily: 'monospace' }}>{brl(v)}</span>
    </div>
  )
}

function Kpi({ rotulo, t, dinheiro }: { rotulo: string; t: Rastreado; dinheiro?: boolean }) {
  return (
    <div style={{ padding: '10px 16px', borderRight: '1px solid var(--admin-border)', borderBottom: '1px solid var(--admin-border)' }}>
      <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', ...muted }}>{rotulo}</p>
      <p style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--admin-text-main)' }}>{t.valor === null ? '—' : dinheiro ? brl(t.valor) : t.valor}</p>
      <details style={{ fontSize: '11px', ...muted }}>
        <summary style={{ cursor: 'pointer' }}>Como foi calculado?</summary>
        <p style={{ marginTop: '4px' }}>{t.formula}</p>
        <ul style={{ margin: '4px 0 0', paddingLeft: '14px' }}>{t.entradas.map(e => <li key={e.rotulo}>{e.rotulo}: {e.valor}</li>)}</ul>
      </details>
    </div>
  )
}
