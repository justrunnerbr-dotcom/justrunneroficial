// Atribuição de receita por canal.
//
// `orders` guarda utm_source/medium/campaign em 62% dos pedidos pagos. A 2.0
// não usava nada disso — era a maior lacuna do painel, e não depende da Meta.

export type OrderForChannel = {
  utmSource: string | null
  utmCampaign: string | null
  total: number
  productTitle?: string
}

export type ChannelStat = {
  channel: string
  orders: number
  revenue: number
  aov: number
  share: number                 // % da receita TOTAL do período
  topCampaigns: Array<{ name: string; revenue: number; orders: number }>
}

export type ChannelBreakdown = {
  channels: ChannelStat[]
  attributedRevenue: number
  unattributedRevenue: number
  coveragePct: number           // % da receita com canal identificado
}

const SEM_ATRIBUICAO = 'Sem atribuição'

/**
 * Canoniza a origem do pedido.
 *
 * Sem isto o número mente: a loja grava o mesmo canal de dois jeitos (`ig` com
 * 302 pedidos e `instagram` com 6), o que fatiaria o Instagram em duas linhas.
 * Também filtra `{{site_source_name}}`, um placeholder de template que vazou
 * pra produção e chegou a virar "canal".
 */
export function canonicalChannel(utmSource: string | null | undefined): string {
  const raw = (utmSource ?? '').trim().toLowerCase()
  if (!raw) return SEM_ATRIBUICAO
  // Placeholder de template não substituído (Meta, Yampi, e-mail).
  if (raw.includes('{{') || raw.includes('}}')) return SEM_ATRIBUICAO

  if (raw === 'ig' || raw.startsWith('instagram')) return 'Instagram'
  if (raw.startsWith('fb') || raw.startsWith('facebook') || raw === 'meta') return 'Facebook'
  if (raw.startsWith('whatsapp') || raw.includes('whats')) return 'WhatsApp'
  if (raw.startsWith('google') || raw === 'adwords') return 'Google'
  if (raw.startsWith('tiktok')) return 'TikTok'
  if (raw.startsWith('email') || raw === 'mkt' || raw.startsWith('newsletter')) return 'E-mail'
  if (raw === 'direct' || raw === '(direct)' || raw === 'none' || raw === '(none)') return 'Direto'

  // Desconhecido conhecido: preserva o valor, capitalizado, em vez de descartar.
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

/** É um canal de verdade, ou o balde de quem não tem origem registrada? */
export function isAttributed(channel: string): boolean {
  return channel !== SEM_ATRIBUICAO
}

export function channelBreakdown(orders: OrderForChannel[]): ChannelBreakdown {
  const receitaTotal = orders.reduce((s, o) => s + o.total, 0)

  type Acc = { orders: number; revenue: number; campaigns: Map<string, { revenue: number; orders: number }> }
  const agg = new Map<string, Acc>()

  for (const o of orders) {
    const canal = canonicalChannel(o.utmSource)
    const cur = agg.get(canal) ?? { orders: 0, revenue: 0, campaigns: new Map() }
    cur.orders += 1
    cur.revenue += o.total

    const campanha = (o.utmCampaign ?? '').trim()
    if (campanha && !campanha.includes('{{')) {
      const c = cur.campaigns.get(campanha) ?? { revenue: 0, orders: 0 }
      c.revenue += o.total
      c.orders += 1
      cur.campaigns.set(campanha, c)
    }
    agg.set(canal, cur)
  }

  const channels: ChannelStat[] = [...agg.entries()]
    .map(([channel, v]) => ({
      channel,
      orders: v.orders,
      revenue: v.revenue,
      aov: v.orders > 0 ? v.revenue / v.orders : 0,
      share: receitaTotal > 0 ? (v.revenue / receitaTotal) * 100 : 0,
      topCampaigns: [...v.campaigns.entries()]
        .map(([name, c]) => ({ name, revenue: c.revenue, orders: c.orders }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3),
    }))
    .sort((a, b) => b.revenue - a.revenue)

  const attributedRevenue = channels.filter(c => isAttributed(c.channel)).reduce((s, c) => s + c.revenue, 0)
  const unattributedRevenue = receitaTotal - attributedRevenue

  return {
    channels,
    attributedRevenue,
    unattributedRevenue,
    coveragePct: receitaTotal > 0 ? (attributedRevenue / receitaTotal) * 100 : 0,
  }
}
