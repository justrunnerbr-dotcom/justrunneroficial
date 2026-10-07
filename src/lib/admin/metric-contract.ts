/** Contrato das métricas do admin: o que cada número mede, como é calculado e
 *  de onde vem. O "?" dos cards lê daqui, e o cálculo em `dashboard-data.ts`
 *  segue exatamente estas definições — se mudar uma, mudar a outra junto. */

export interface MetricDef {
  label:     string
  what:      string
  formula:   string
  sources:   string
  /** Evento temporal que decide em que dia o número cai. */
  dateField: string
  notes?:    string
}

const PAGO = 'Pedido pago = status aprovado na Yampi (pago, faturado, em separação, em transporte, entregue) + vendas manuais por link.'
const DATA_PEDIDO = 'Data de criação do pedido, fuso de São Paulo. A Yampi não informa a data de aprovação separada.'
const MIDIA = 'Meta Ads e Google Ads lidos ao vivo das APIs. Se uma conta falhar, entra o último sync diário e o card fica marcado como parcial.'

export const METRICS = {
  receita: {
    label: 'Receita paga',
    what: 'Tudo o que os clientes pagaram nos pedidos aprovados, com frete e já descontados cupons.',
    formula: 'Σ total dos pedidos pagos',
    sources: 'Yampi (pedidos sincronizados no Supabase) + vendas manuais',
    dateField: DATA_PEDIDO,
    notes: PAGO,
  },
  lucro: {
    label: 'Lucro gerencial',
    what: 'O que sobra da receita depois de todos os custos que o admin conhece.',
    formula: 'Receita − custo dos produtos − frete − logística por pedido − gateway − taxa e mensalidade Yampi − tributo de 13,8% sobre o Meta − Meta − Google − imposto sobre faturamento (se configurado)',
    sources: 'Pedidos, cadastro de custos, configurações de custo, Meta Ads, Google Ads',
    dateField: DATA_PEDIDO,
    notes: 'Item sem custo cadastrado entra com custo zero — o lucro fica maior que o real. A cobertura de custos mostra quantos pedidos estão nessa situação.',
  },
  margem: {
    label: 'Margem de lucro',
    what: 'Quanto de cada real vendido vira lucro.',
    formula: 'Lucro gerencial ÷ receita paga',
    sources: 'Mesmas do lucro',
    dateField: DATA_PEDIDO,
  },
  pagos: {
    label: 'Pedidos pagos',
    what: 'Quantidade de pedidos aprovados no período.',
    formula: 'Contagem de pedidos pagos',
    sources: 'Yampi + vendas manuais',
    dateField: DATA_PEDIDO,
    notes: PAGO,
  },
  ticket: {
    label: 'Ticket médio',
    what: 'Valor médio de cada pedido pago.',
    formula: 'Receita paga ÷ pedidos pagos (mesmo recorte)',
    sources: 'Yampi + vendas manuais',
    dateField: DATA_PEDIDO,
  },
  conversao: {
    label: 'Conversão da loja',
    what: 'De cada 100 visitas ao site, quantas terminaram em pedido pago.',
    formula: 'Sessões com pedido pago ÷ sessões iniciadas',
    sources: 'Tracking da loja (tabela sessions) + pedidos com sessão identificada',
    dateField: 'Início da sessão e criação do pedido, fuso de São Paulo',
    notes: 'Pedido sem sessão identificada (venda manual, link direto) fica fora desta conta, mas entra na receita.',
  },
  midia: {
    label: 'Investimento em mídia',
    what: 'Tudo o que foi gasto em anúncio no período.',
    formula: 'Gasto Meta + gasto Google',
    sources: MIDIA,
    dateField: 'Dia da veiculação na plataforma',
    notes: 'Não inclui o tributo de 13,8% sobre o Meta — ele aparece dentro do lucro.',
  },
  meta: {
    label: 'Gasto Meta',
    what: 'Gasto das contas de anúncio do Meta (Facebook e Instagram).',
    formula: 'Σ spend das contas',
    sources: MIDIA,
    dateField: 'Dia da veiculação',
  },
  google: {
    label: 'Gasto Google',
    what: 'Gasto da conta do Google Ads.',
    formula: 'Σ custo das campanhas',
    sources: MIDIA,
    dateField: 'Dia da veiculação',
  },
  mer: {
    label: 'ROAS combinado (MER)',
    what: 'Quantos reais de receita a loja fez para cada real investido em anúncio, somando todos os canais e o tributo de 13,8% sobre o Meta.',
    formula: 'Receita paga ÷ (Meta + tributo de 13,8% sobre o Meta + Google)',
    sources: 'Pedidos + Meta + Google',
    dateField: DATA_PEDIDO,
    notes: 'Não é o ROAS que a Meta mostra: aquele usa as compras que a própria plataforma atribui a si e ignora o tributo. Aqui é a receita real da loja inteira sobre o que a empresa de fato paga em mídia.',
  },
  roi: {
    label: 'ROI de mídia',
    what: 'Quanto de lucro sobrou para cada real investido em anúncio, contando o tributo de 13,8% sobre o Meta.',
    formula: 'Lucro gerencial ÷ (Meta + tributo de 13,8% sobre o Meta + Google)',
    sources: 'Mesmas do lucro',
    dateField: DATA_PEDIDO,
    notes: 'O lucro já desconta a mídia. 50% significa R$ 0,50 de lucro para cada R$ 1 investido.',
  },
  cpa: {
    label: 'Custo de mídia por pedido',
    what: 'Quanto de anúncio foi gasto para cada pedido pago, de qualquer origem, com o tributo de 13,8% sobre o Meta.',
    formula: '(Meta + tributo de 13,8% sobre o Meta + Google) ÷ pedidos pagos',
    sources: 'Meta + Google + pedidos',
    dateField: DATA_PEDIDO,
    notes: 'Divide pelo total de pedidos da loja, não pelas compras que a plataforma atribui. Não é o CPA do Gerenciador, que mostra só o gasto, sem o tributo. O Google não tem o tributo.',
  },
  pendentes: {
    label: 'Pedidos pendentes agora',
    what: 'Pedidos aguardando pagamento neste momento (Pix ou boleto ainda não pago).',
    formula: 'Contagem de pedidos com status pendente criados nos últimos 7 dias',
    sources: 'Yampi',
    dateField: 'Situação atual, não depende do período escolhido',
  },
  carrinhos: {
    label: 'Sessões com carrinho',
    what: 'Visitas em que alguém adicionou pelo menos um produto ao carrinho.',
    formula: 'Sessões distintas com evento add_to_cart, contadas dia a dia',
    sources: 'Tracking da loja',
    dateField: 'Hora do evento, fuso de São Paulo',
    notes: 'Conta a visita uma vez, mesmo que ela adicione vários produtos (o Compre 1 Leve 2 gera dois eventos).',
  },
  checkouts: {
    label: 'Sessões com checkout',
    what: 'Visitas que clicaram em finalizar a compra e foram para o checkout.',
    formula: 'Sessões distintas com evento initiate_checkout, contadas dia a dia',
    sources: 'Tracking da loja',
    dateField: 'Hora do evento, fuso de São Paulo',
  },
  recorrentes: {
    label: 'Pedidos de recorrentes',
    what: 'Parte dos pedidos feitos por quem já tinha comprado antes.',
    formula: 'Pedidos cujo cliente tem pedido pago anterior ÷ pedidos com cliente identificado',
    sources: 'Yampi',
    dateField: DATA_PEDIDO,
    notes: 'O histórico de pedidos começa em junho/2026. Quem comprou antes disso aparece como cliente novo.',
  },
  custos: {
    label: 'Cobertura de custos',
    what: 'Parte dos pedidos em que todos os itens têm custo cadastrado.',
    formula: 'Pedidos com todos os itens casados em product_costs ÷ pedidos pagos',
    sources: 'Pedidos + cadastro de custos',
    dateField: DATA_PEDIDO,
    notes: 'Abaixo de 100%, o lucro está maior que o real.',
  },
  atribuicao: {
    label: 'Cobertura de atribuição',
    what: 'Parte dos pedidos com origem conhecida (UTM ou clique do Google).',
    formula: 'Pedidos Yampi com utm_source ou gclid ÷ pedidos Yampi',
    sources: 'Yampi (UTMs capturadas no checkout)',
    dateField: DATA_PEDIDO,
    notes: 'Vendas manuais ficam fora da conta: não passam por link rastreável.',
  },
  simMeta: {
    label: 'Com e sem o gasto Meta',
    what: 'Simulação: o mesmo resultado financeiro, somando de volta só o que foi gasto no Meta.',
    formula: 'Resultado antes do Meta = lucro gerencial + gasto Meta + tributo de 13,8% sobre o Meta',
    sources: 'Mesmas do lucro',
    dateField: DATA_PEDIDO,
    notes: 'Usa os mesmos pedidos e a mesma receita. Não quer dizer que essas vendas existiriam sem anúncio.',
  },
  funil: {
    label: 'Funil de conversão',
    what: 'Quantas visitas chegaram a cada etapa da compra.',
    formula: 'Sessões → sessões que viram produto → com carrinho → com checkout → com pedido pago. Cada etapa conta a sessão uma vez por dia.',
    sources: 'Tracking da loja + pedidos com sessão identificada',
    dateField: 'Hora do evento, fuso de São Paulo',
    notes: 'A primeira porcentagem é a passagem da etapa anterior; a segunda, a partir do total de sessões. Compras sem sessão identificada ficam fora do funil e dentro da receita.',
  },
  rank: {
    label: 'Produtos em destaque',
    what: 'Produtos do período por unidades vendidas, receita, visualizações ou carrinho.',
    formula: 'Unidades e receita dos itens de pedidos pagos. Visualizações e carrinhos vêm dos eventos da página do produto. Conversão = pedidos com o produto ÷ visualizações.',
    sources: 'Itens dos pedidos (ligados ao produto pelo SKU) + estatística diária de produto',
    dateField: DATA_PEDIDO,
    notes: 'As versões R$ 297 e R$ 175 são produtos diferentes. Visualização é evento: a mesma pessoa vendo duas vezes conta duas.',
  },
  estados: {
    label: 'Estados com mais vendas',
    what: 'Onde os pedidos pagos foram entregues.',
    formula: 'Receita e pedidos pagos por estado de entrega',
    sources: 'Yampi (endereço de entrega)',
    dateField: DATA_PEDIDO,
    notes: 'É o estado de entrega do pedido, não a localização da visita.',
  },
  evolucao: {
    label: 'Evolução',
    what: 'Como o número andou dia a dia no período, contra o período de comparação.',
    formula: 'Mesmas fórmulas dos cards, calculadas por dia',
    sources: 'Pedidos + gasto diário sincronizado de Meta e Google',
    dateField: DATA_PEDIDO,
    notes: 'Mídia e lucro por dia usam o gasto sincronizado de cada dia; um dia sem gasto importado aparece como lacuna, não como zero.',
  },
} satisfies Record<string, MetricDef>

export type MetricKey = keyof typeof METRICS
