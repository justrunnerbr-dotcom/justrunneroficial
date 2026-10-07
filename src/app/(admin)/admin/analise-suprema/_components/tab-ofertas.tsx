'use client'

import { PackageX, Target } from 'lucide-react'
import { Card, MiniStat, ResponsiveTable, type Column } from './shared'
import type { OfertaStat } from '@/lib/admin/analise-suprema-ofertas'
import type { ReturnsCost } from '@/lib/admin/analise-suprema-source'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const int = (v: number) => v.toLocaleString('pt-BR')

export function OfertasTab({
  periodoLabel, ofertas, devolucoes, receitaMes, metaMes, diaDoMes, diasNoMes,
}: {
  periodoLabel: string
  ofertas: OfertaStat[]
  devolucoes: ReturnsCost
  receitaMes: number
  metaMes: number
  diaDoMes: number
  diasNoMes: number
}) {
  const principais = ofertas.filter(o => o.oferta !== 'bump')
  const bump = ofertas.find(o => o.oferta === 'bump')

  // `receitaMes` cobre só os dias COMPLETOS (`diaDoMes` = dias até ontem): hoje,
  // pela metade, puxaria a média para baixo. Mesma projeção da aba Supremo.
  const projecao = diaDoMes > 0 ? (receitaMes / diaDoMes) * diasNoMes : 0
  const diasRestantes = diasNoMes - diaDoMes
  const pctMeta = metaMes > 0 ? (projecao / metaMes) * 100 : 0
  const corMeta = pctMeta >= 100 ? 'var(--admin-accent)' : pctMeta >= 80 ? 'var(--admin-alert)' : 'var(--admin-red)'

  const colunas: Column<OfertaStat>[] = [
    { key: 'oferta', header: 'Oferta', primary: true, render: (r) => <span style={{ fontWeight: 600 }}>{r.label}</span> },
    { key: 'pedidos', header: 'Pedidos', align: 'right', render: (r) => <span style={{ fontFamily: 'monospace' }}>{int(r.orders)}</span> },
    { key: 'unidades', header: 'Óculos entregues', align: 'right', render: (r) => <span style={{ fontFamily: 'monospace' }}>{int(r.units)}</span> },
    { key: 'receita', header: 'Receita paga', align: 'right', render: (r) => <span style={{ fontFamily: 'monospace' }}>{brl(r.revenue)}</span> },
    {
      key: 'porUnidade', header: 'Receita por óculos', align: 'right',
      render: (r) => <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{brl(r.revenuePerUnit)}</span>,
    },
    {
      key: 'custo', header: 'Custo por óculos', align: 'right',
      render: (r) => r.costPerUnit === null
        ? <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)' }}>—</span>
        : <span style={{ fontFamily: 'monospace' }}>{brl(r.costPerUnit)}</span>,
    },
    {
      key: 'margem', header: 'Margem', align: 'right',
      render: (r) => r.marginPct === null
        ? <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)' }}>—</span>
        : <span style={{ fontFamily: 'monospace', fontWeight: 700, color: r.marginPct < 40 ? 'var(--admin-alert)' : 'var(--admin-text-main)' }}>
            {r.marginPct.toFixed(0)}%
          </span>,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 'var(--sp-4)' }}>
        <MiniStat
          label="Receita do mês (até ontem)"
          value={brl(receitaMes)}
          sub={`${diaDoMes} de ${diasNoMes} dias completos`}
          color="var(--admin-text-main)"
        />
        <MiniStat
          label="Projeção do mês"
          value={diaDoMes > 0 ? brl(projecao) : '—'}
          sub={diaDoMes > 0 ? `${pctMeta.toFixed(0)}% da meta de ${brl(metaMes)}` : 'Primeiro dia do mês: ainda sem dia completo'}
          color={corMeta}
          emphasis
        />
        <MiniStat
          label="Falta para a meta"
          value={brl(Math.max(0, metaMes - receitaMes))}
          sub={`${(metaMes - receitaMes) > 0 && diasRestantes > 0 ? brl((metaMes - receitaMes) / diasRestantes) : brl(0)} por dia restante (contando hoje)`}
          color="var(--admin-text-main)"
        />
      </div>

      <Card
        title="Compre 1 Leve 2 contra unidade avulsa"
        desc="A comparação que importa é receita por óculos entregue, não por pedido: é ela que mostra o preço real de cada oferta."
        action={<Target size={14} color="var(--admin-text-muted)" />}
      >
        <ResponsiveTable
          columns={colunas}
          rows={principais}
          rowKey={(r) => r.oferta}
          emptyLabel="Nenhuma venda no período."
        />
        {principais.length >= 2 && (() => {
          const l2 = principais.find(o => o.oferta === 'leve2')
          const av = principais.find(o => o.oferta === 'avulso')
          if (!l2 || !av) return null
          const diff = av.revenuePerUnit - l2.revenuePerUnit
          return (
            <div style={{ marginTop: 'var(--sp-4)', fontSize: 'var(--fs-sm)', color: 'var(--admin-text-sec)', lineHeight: 'var(--lh-normal)' }}>
              O óculos do <strong>Compre 1 Leve 2</strong> sai por {brl(l2.revenuePerUnit)} contra{' '}
              {brl(av.revenuePerUnit)} do avulso — diferença de {brl(Math.abs(diff))} por unidade
              {diff > 0 ? ' a favor da promoção' : ' a favor do avulso'}. Quando a promoção entrega o
              óculos mais barato que a venda unitária, taxa de conversão menor no avulso é consequência
              da oferta, não da página: comparar a conversão das duas como se fossem o mesmo produto
              leva à conclusão errada.
            </div>
          )
        })()}
      </Card>

      {bump && (
        <Card
          title="Order bump"
          desc="Acessório oferecido no checkout, medido à parte para não contaminar o ranking de óculos."
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 'var(--sp-3)' }}>
            <MiniStat label="Pedidos com bump" value={int(bump.orders)} sub="No período" color="var(--admin-text-main)" />
            <MiniStat label="Unidades" value={int(bump.units)} sub="Acessórios vendidos" color="var(--admin-text-main)" />
            <MiniStat label="Receita" value={brl(bump.revenue)} sub={`${brl(bump.revenuePerUnit)} por unidade`} color="var(--admin-accent)" />
            <MiniStat
              label="Margem"
              value={bump.marginPct === null ? '—' : `${bump.marginPct.toFixed(0)}%`}
              sub={bump.costPerUnit === null ? 'Custo não cadastrado' : `Custo ${brl(bump.costPerUnit)}`}
              color="var(--admin-text-main)"
            />
          </div>
        </Card>
      )}

      <Card
        title="Pedidos não pagos e estornos"
        desc="O banco não distingue Pix/boleto expirado de estorno: todo cancelado da janela aparece como não pago, que é o caso quase sempre (em setembro foram 159 cancelados contra ~15 estornos). Não é perda — o dinheiro nunca entrou. A perda real vem do extrato da AppMax, lançado no Fechamento do Mês."
        action={<PackageX size={14} color="var(--admin-red)" />}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 'var(--sp-3)' }}>
          <MiniStat
            label="Pedidos não pagos"
            value={int(devolucoes.naoPagos.orders)}
            sub={`Pix/boleto expirado ou cartão recusado · ${periodoLabel}`}
            color="var(--admin-text-main)"
          />
          <MiniStat
            label="Valor não realizado"
            value={brl(devolucoes.naoPagos.value)}
            sub="Venda que não se concretizou — não é custo"
            color="var(--admin-text-main)"
          />
          <MiniStat
            label={`Estornos e chargebacks · ${devolucoes.estornosMes.mes ? `${devolucoes.estornosMes.mes.slice(5, 7)}/${devolucoes.estornosMes.mes.slice(0, 4)}` : 'último mês'}`}
            value={devolucoes.estornosMes.valor !== null ? brl(devolucoes.estornosMes.valor) : '—'}
            sub={devolucoes.estornosMes.valor !== null
              ? `${devolucoes.estornosMes.receitaBruta > 0 ? ((devolucoes.estornosMes.valor / devolucoes.estornosMes.receitaBruta) * 100).toFixed(1) : '0'}% da receita · extrato AppMax`
              : 'Lance os estornos no Fechamento do Mês'}
            color="var(--admin-red)"
            emphasis
          />
        </div>
      </Card>
    </div>
  )
}
