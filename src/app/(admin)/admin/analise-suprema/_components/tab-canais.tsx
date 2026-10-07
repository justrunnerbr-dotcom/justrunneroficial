'use client'

import { AlertTriangle, MapPin } from 'lucide-react'
import { Card, MiniStat, ResponsiveTable, type Column } from './shared'
import type { ChannelBreakdown, ChannelStat } from '@/lib/admin/analise-suprema-canais'
import type { RegionStat, Referencias } from '@/lib/admin/analise-suprema-source'
import type { MidiaRange } from '@/lib/admin/analise-suprema-midia'
import { inflacaoDeclarada, riscoDeEscala } from '@/lib/admin/analise-suprema-midia'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const int = (v: number) => v.toLocaleString('pt-BR')

const COR_CANAL = 'var(--admin-accent)'

export function CanaisTab({ canais, regioes, midia, referencias }: { canais: ChannelBreakdown; regioes: RegionStat[]; midia: MidiaRange; referencias: Referencias | null }) {
  const maxRev = Math.max(1, ...canais.channels.map(c => c.revenue))
  const maxUf = Math.max(1, ...regioes.map(r => r.revenue))
  const semAtribuicao = 100 - canais.coveragePct

  const colunas: Column<ChannelStat>[] = [
    {
      key: 'canal', header: 'Canal', primary: true,
      render: (r) => (
        <span style={{ fontWeight: 600, color: r.channel === 'Sem atribuição' ? 'var(--admin-text-muted)' : 'var(--admin-text-main)' }}>
          {r.channel}
        </span>
      ),
    },
    {
      key: 'receita', header: 'Receita',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: '150px' }}>
          <Barra frac={r.revenue / maxRev} cor={r.channel === 'Sem atribuição' ? 'var(--admin-text-muted)' : COR_CANAL} />
          <span style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)', whiteSpace: 'nowrap' }}>{brl(r.revenue)}</span>
        </div>
      ),
    },
    { key: 'pedidos', header: 'Pedidos', align: 'right', render: (r) => <span style={{ fontFamily: 'monospace' }}>{int(r.orders)}</span> },
    { key: 'aov', header: 'Ticket', align: 'right', render: (r) => <span style={{ fontFamily: 'monospace' }}>{brl(r.aov)}</span> },
    { key: 'share', header: '% receita', align: 'right', render: (r) => <span style={{ fontFamily: 'monospace' }}>{r.share.toFixed(1)}%</span> },
    {
      key: 'campanhas', header: 'Principais campanhas',
      render: (r) => r.topCampaigns.length === 0
        ? <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)' }}>—</span>
        : (
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-sec)', lineHeight: 'var(--lh-normal)' }}>
            {r.topCampaigns.map(c => `${c.name} (${brl(c.revenue)})`).join(' · ')}
          </span>
        ),
    },
  ]

  const colunasUf: Column<RegionStat>[] = [
    { key: 'uf', header: 'UF', primary: true, render: (r) => <span style={{ fontWeight: 600 }}>{r.uf}</span> },
    {
      key: 'receita', header: 'Receita',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: '140px' }}>
          <Barra frac={r.revenue / maxUf} cor={COR_CANAL} />
          <span style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)' }}>{brl(r.revenue)}</span>
        </div>
      ),
    },
    { key: 'pedidos', header: 'Pedidos', align: 'right', render: (r) => <span style={{ fontFamily: 'monospace' }}>{int(r.orders)}</span> },
    { key: 'aov', header: 'Ticket', align: 'right', render: (r) => <span style={{ fontFamily: 'monospace' }}>{brl(r.aov)}</span> },
    { key: 'share', header: '% receita', align: 'right', render: (r) => <span style={{ fontFamily: 'monospace' }}>{r.share.toFixed(1)}%</span> },
  ]

  const inflacao = inflacaoDeclarada(midia)
  // Equilíbrio do último mês fechado (Fechamento do Mês), na base com tributo — a mesma do CPA desta tela.
  const equilibrio = referencias?.cpaEquilibrio ?? null
  const risco = equilibrio !== null ? riscoDeEscala(midia, equilibrio) : 'seguro'
  const corRisco = risco === 'critico' ? 'var(--admin-red)' : risco === 'atencao' ? 'var(--admin-alert)' : 'var(--admin-accent)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      {midia.spend > 0 && (
        <Card
          title="Retorno da mídia"
          desc="Faixa, não número único: parte da receita não tem origem registrada. O piso conta só o que é comprovadamente Meta; o teto assume que todo o não atribuído também é."
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 'var(--sp-3)' }}>
            <MiniStat label="Investido" value={brl(midia.spend)} sub="Meta Ads com tributo de 13,8%" color="var(--admin-text-main)" />
            <MiniStat
              label="ROAS real"
              value={`${midia.roasMin.toFixed(2)}x – ${midia.roasMax.toFixed(2)}x`}
              sub={midia.declaredRoas ? `Meta declara ${midia.declaredRoas.toFixed(2)}x sobre o mesmo gasto` : 'Sem número declarado'}
              color="var(--admin-text-main)"
              emphasis
            />
            <MiniStat
              label="CPA real"
              value={`${brl(midia.cpaMin)} – ${brl(midia.cpaMax)}`}
              sub={equilibrio !== null ? `Equilíbrio ${brl(equilibrio)} (${referencias!.mes.slice(5, 7)}/${referencias!.mes.slice(0, 4)}, Fechamento)` : 'Sem equilíbrio do último mês fechado'}
              color={corRisco}
              emphasis
            />
            <MiniStat
              label="Receita sem origem"
              value={brl(midia.unattributedRevenue)}
              sub={`${midia.unattributedOrders} pedidos — é o que abre a faixa`}
              color="var(--admin-text-main)"
            />
          </div>

          {inflacao !== null && inflacao > 15 && (
            <div style={{
              marginTop: 'var(--sp-4)', background: 'var(--admin-alert-soft)',
              border: '1px solid var(--admin-alert)', borderRadius: 'var(--r-md)',
              padding: '12px 14px', fontSize: 'var(--fs-sm)', color: 'var(--admin-text-sec)', lineHeight: 'var(--lh-normal)',
            }}>
              <strong style={{ color: 'var(--admin-alert)' }}>
                A Meta reivindica {inflacao.toFixed(0)}% a mais do que a atribuição real mostra.
              </strong>{' '}
              Ela conta conversão por visualização e chega a declarar mais compras do que a loja teve no
              total, somando todos os canais. Decidir escala pelo número dela superestima o retorno —
              use a faixa acima.
            </div>
          )}

          {risco !== 'seguro' && (
            <div style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-sm)', color: corRisco, lineHeight: 'var(--lh-normal)', fontWeight: 600 }}>
              {risco === 'critico'
                ? `No pior caso o CPA (${brl(midia.cpaMax)}) já passou do equilíbrio de ${brl(equilibrio!)} — escalar agora queima margem.`
                : `No pior caso o CPA (${brl(midia.cpaMax)}) está perto do equilíbrio de ${brl(equilibrio!)} — a folga para escalar é menor do que a Meta sugere.`}
            </div>
          )}
        </Card>
      )}
      {semAtribuicao > 5 && (
        <div style={{
          background: 'var(--admin-alert-soft)', border: '1px solid var(--admin-alert)',
          borderRadius: 'var(--r-md)', padding: '12px 16px', fontSize: 'var(--fs-sm)',
          color: 'var(--admin-text-sec)', lineHeight: 'var(--lh-normal)',
          display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start',
        }}>
          <AlertTriangle size={14} color="var(--admin-alert)" style={{ flexShrink: 0, marginTop: 'var(--sp-1)' }} />
          <span>
            <strong style={{ color: 'var(--admin-alert)' }}>
              {semAtribuicao.toFixed(0)}% da receita sem canal identificado
            </strong>{' '}
            ({brl(canais.unattributedRevenue)}). Os percentuais abaixo são share do total, não do atribuído —
            então &quot;Instagram = X%&quot; significa X% de tudo, e não X% do que tem origem conhecida.
            A causa provável é o checkout perdendo os parâmetros de UTM; corrigir isso na origem é o que
            eleva o teto desta análise.
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 'var(--sp-4)' }}>
        <MiniStat
          label="Receita atribuída"
          value={brl(canais.attributedRevenue)}
          sub={`${canais.coveragePct.toFixed(0)}% do total`}
          color="var(--admin-text-main)"
        />
        {canais.channels.filter(c => c.channel !== 'Sem atribuição').slice(0, 3).map(c => (
          <MiniStat
            key={c.channel}
            label={c.channel}
            value={brl(c.revenue)}
            sub={`${c.orders} pedidos · ticket ${brl(c.aov)}`}
            color="var(--admin-accent)"
          />
        ))}
      </div>

      <Card
        title="Receita por canal"
        desc="Origem gravada no pedido (utm_source), com variantes do mesmo canal já unificadas — a loja grava Instagram como 'ig' e 'instagram'."
      >
        <ResponsiveTable
          columns={colunas}
          rows={canais.channels}
          rowKey={(r) => r.channel}
          emptyLabel="Nenhum pedido pago no período."
        />
      </Card>

      <Card
        title="Receita por estado"
        desc="Todos os pedidos têm UF de entrega, então esta é a única dimensão do painel com 100% de cobertura."
        action={<MapPin size={14} color="var(--admin-text-muted)" />}
      >
        <ResponsiveTable
          columns={colunasUf}
          rows={regioes.slice(0, 10)}
          rowKey={(r) => r.uf}
          emptyLabel="Nenhum pedido pago no período."
        />
      </Card>
    </div>
  )
}

function Barra({ frac, cor }: { frac: number; cor: string }) {
  return (
    <span style={{
      display: 'inline-block', width: '58px', height: '6px', flexShrink: 0,
      borderRadius: '999px', background: 'var(--admin-bg)', overflow: 'hidden',
    }}>
      <span style={{ display: 'block', height: '100%', borderRadius: '999px', background: cor, width: `${Math.max(2, Math.min(100, frac * 100))}%` }} />
    </span>
  )
}
