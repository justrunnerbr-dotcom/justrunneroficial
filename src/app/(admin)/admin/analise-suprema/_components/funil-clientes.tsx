'use client'

import { AlertTriangle, MessageCircle } from 'lucide-react'
import { Card, MiniStat, ResponsiveTable, type Column } from './shared'
import type { FunnelWindow } from '@/lib/admin/analise-suprema-funil'
import type { CustomerStats, AtRiskCustomer } from '@/lib/admin/analise-suprema-clientes'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const int = (v: number) => v.toLocaleString('pt-BR')

export function FunilCard({ funil }: { funil: FunnelWindow }) {
  const porSessao = funil.countedBy === 'session'
  // A barra representa a mesma unidade que sustenta a taxa ao lado dela.
  const medida = (s: FunnelWindow['steps'][number]) => (porSessao ? s.uniqueValue ?? s.value : s.value)
  const max = Math.max(1, ...funil.steps.map(medida))

  return (
    <Card
      title="Funil de conversão"
      desc={porSessao
        ? 'Barras e taxas contam SESSÃO ÚNICA — a mesma unidade do Commerce Brain, então os dois painéis devem bater. O número menor em cinza é o volume por evento: maior porque o Compre 1 Leve 2 dispara cerca de dois add_to_cart na mesma sessão.'
        : 'Contagem por eventos. Uma sessão pode gerar mais de um evento, especialmente no Compre 1 Leve 2. Use os volumes como referência; as taxas entre etapas ainda não permitem identificar o principal gargalo com precisão.'}
    >
      <style>{`
        @media (max-width: 600px) {
          .as-funnel-row { display: grid !important; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px !important; }
          .as-funnel-row > span { min-width: 0 !important; }
          .as-funnel-row > span:first-child { grid-column: 1 / -1; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {funil.steps.map((s) => {
          const gargalo = funil.bottleneck?.key === s.key
          return (
            <div className="as-funnel-row" key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <span style={{ minWidth: '150px', fontSize: 'var(--fs-sm)', color: 'var(--admin-text-sec)' }}>
                {s.label}
              </span>
              <span style={{
                flex: 1, height: '20px', borderRadius: 'var(--r-sm)', background: 'var(--admin-bg)',
                overflow: 'hidden', minWidth: '60px',
              }}>
                <span style={{
                  display: 'block', height: '100%', borderRadius: 'var(--r-sm)',
                  background: gargalo ? 'var(--admin-alert)' : 'var(--admin-info)',
                  width: `${Math.max(1, (medida(s) / max) * 100)}%`,
                }} />
              </span>
              <span style={{ minWidth: '78px', textAlign: 'right', fontFamily: 'monospace', fontSize: 'var(--fs-sm)' }}>
                {int(medida(s))}
                {porSessao && s.uniqueValue !== null && s.value !== s.uniqueValue && (
                  <span style={{ color: 'var(--admin-text-muted)', fontSize: 'var(--fs-xs)' }}>
                    {' '}/ {int(s.value)}
                  </span>
                )}
              </span>
              <span style={{
                minWidth: '76px', textAlign: 'right', fontFamily: 'monospace', fontSize: 'var(--fs-xs)',
                color: gargalo ? 'var(--admin-alert)' : 'var(--admin-text-muted)',
                fontWeight: gargalo ? 700 : 400,
              }}>
                {s.rateFromPrev === null ? '—' : `${s.rateFromPrev.toFixed(1)}%`}
              </span>
            </div>
          )
        })}
      </div>

      {porSessao && funil.bottleneck && (
        <div style={{
          marginTop: 'var(--sp-4)', fontSize: 'var(--fs-sm)', color: 'var(--admin-text-sec)',
          lineHeight: 'var(--lh-normal)', display: 'flex', gap: 'var(--sp-2)', alignItems: 'flex-start',
        }}>
          <AlertTriangle size={13} color="var(--admin-alert)" style={{ flexShrink: 0, marginTop: 'var(--sp-1)' }} />
          <span>
            Maior vazamento em <strong>{funil.bottleneck.label.toLowerCase()}</strong>:{' '}
            apenas {funil.bottleneck.rateFromPrev!.toFixed(1)}% avançam desse passo para o
            seguinte. É onde ganhar 1 ponto percentual vale mais que aumentar tráfego.
          </span>
        </div>
      )}
    </Card>
  )
}

export function ClientesCard({ clientes }: { clientes: CustomerStats }) {
  const colunas: Column<AtRiskCustomer>[] = [
    {
      key: 'cliente', header: 'Cliente', primary: true,
      render: (r) => (
        <span style={{ fontWeight: 600 }}>
          {r.name || r.email}
        </span>
      ),
    },
    { key: 'gasto', header: 'Já gastou', align: 'right', render: (r) => <span style={{ fontFamily: 'monospace' }}>{brl(r.totalSpent)}</span> },
    { key: 'pedidos', header: 'Pedidos', align: 'right', render: (r) => <span style={{ fontFamily: 'monospace' }}>{r.ordersCount}</span> },
    { key: 'dias', header: 'Sem comprar', align: 'right', render: (r) => <span style={{ fontFamily: 'monospace', color: 'var(--admin-alert)' }}>{r.daysSinceLastOrder}d</span> },
    {
      key: 'acao', header: 'Ação',
      render: (r) => r.whatsappLink
        ? (
          <a
            href={r.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)',
              fontSize: 'var(--fs-xs)', fontWeight: 600, color: '#fff',
              background: 'var(--admin-accent)', borderRadius: 'var(--r-sm)',
              padding: '5px 10px', textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            <MessageCircle size={11} /> Chamar
          </a>
        )
        : <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)' }}>sem telefone</span>,
    },
  ]

  return (
    <>
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)', marginBottom: '-6px' }}>
        Números de cliente são vitalícios (toda a base desde o início), não da janela selecionada.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 'var(--sp-4)' }}>
        <MiniStat
          label="Taxa de recompra"
          value={`${clientes.repeatRatePct.toFixed(1)}%`}
          sub={`${int(clientes.repeatCustomers)} de ${int(clientes.totalCustomers)} clientes`}
          color={clientes.repeatRatePct >= 15 ? 'var(--admin-accent)' : 'var(--admin-alert)'}
          emphasis
        />
        <MiniStat
          label="LTV médio"
          value={brl(clientes.avgLtv)}
          sub={`${clientes.avgOrdersPerCustomer.toFixed(2)} pedidos por cliente`}
          color="var(--admin-text-main)"
        />
        <MiniStat
          label="Receita de recorrentes"
          value={brl(clientes.revenueFromRepeat)}
          sub="Vitalícia — não passou por mídia paga de novo"
          color="var(--admin-accent)"
        />
        <MiniStat
          label="Receita de compra única"
          value={brl(clientes.revenueFromSingle)}
          sub="Vitalícia — custo de aquisição gasto uma só vez"
          color="var(--admin-text-main)"
        />
      </div>

      {clientes.atRisk.length > 0 && (
        <Card
          title="Clientes para recuperar"
          desc="Já compraram mais de uma vez e estão há mais de 45 dias sem comprar. Ordenados por quanto já gastaram — perder quem gasta mais dói mais."
        >
          <ResponsiveTable
            columns={colunas}
            rows={clientes.atRisk}
            rowKey={(r) => r.email}
            emptyLabel="Nenhum cliente recorrente sumido."
          />
          <div style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)', lineHeight: 'var(--lh-normal)' }}>
            45 dias é ponto de partida, não verdade: o ciclo de recompra de óculos ainda não foi medido
            com o histórico disponível. Vale revisar quando houver mais base.
          </div>
        </Card>
      )}
    </>
  )
}
