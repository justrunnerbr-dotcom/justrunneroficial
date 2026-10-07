import { getAdminSupabase } from '@/lib/admin-client'

export type CostSettings = {
  yampi_fee_pct: number
  appmax_pix_pct: number
  appmax_pix_fixed: number
  appmax_card_pct: number
  appmax_boleto_fixed: number
  appmax_gateway_fixed: number
  appmax_installment_pct: number
  default_installments: number
  frete_gratis_custo: number
  /**
   * Custo fixo que a logística cobra por pedido PAGO (manuseio da etiqueta).
   *
   * É por pedido, não por item nem por unidade: dez óculos num pedido só pagam
   * uma vez. Zero significa não configurado — diferente do imposto, aqui zero
   * não distorce nada, só deixa a linha de fora até alguém preencher.
   */
  custo_logistica_pedido: number
  /**
   * Alíquota de imposto sobre faturamento (Simples Nacional), em %.
   *
   * `null` significa NÃO CONFIGURADO, e é diferente de zero: zero seria afirmar
   * que a loja não paga imposto, inflando o Lucro Líquido em 4 a 11 pontos. Quem
   * consome precisa tratar o nulo como lacuna declarada — ver `missingCostSources`
   * em `financial-breakdown.ts`.
   */
  imposto_pct: number | null
}

const DEFAULTS: CostSettings = {
  yampi_fee_pct: 2.5,
  appmax_pix_pct: 1.00,
  appmax_pix_fixed: 0.99,
  appmax_card_pct: 4.98,
  appmax_boleto_fixed: 3.49,
  appmax_gateway_fixed: 0.99,
  appmax_installment_pct: 1.89,
  default_installments: 3,
  frete_gratis_custo: 25.00,
  custo_logistica_pedido: 10.00,
  imposto_pct: null,
}

const COLUNAS_BASE =
  'yampi_fee_pct, appmax_pix_pct, appmax_pix_fixed, appmax_card_pct, appmax_boleto_fixed, appmax_gateway_fixed, appmax_installment_pct, default_installments, frete_gratis_custo, imposto_pct'

export async function getCostSettings(): Promise<CostSettings> {
  const db = getAdminSupabase()
  const { data } = await db
    .from('cost_settings')
    .select(`${COLUNAS_BASE}, custo_logistica_pedido`)
    .maybeSingle()
  if (data) return data as CostSettings

  // `custo_logistica_pedido` só existe a partir de 20260903000001. Se o código
  // subir antes da migration rodar, o select acima falha INTEIRO — e cair no
  // DEFAULTS aqui seria pior que a lacuna: os defaults trazem a taxa antiga da
  // Yampi (2,5% em vez de 1,5%) e reescreveriam o custo de todos os pedidos com
  // um número que a loja não paga mais. Então tenta de novo sem a coluna nova e
  // preserva os valores reais, deixando só a logística zerada até a migration.
  const { data: semColuna } = await db
    .from('cost_settings')
    .select(COLUNAS_BASE)
    .maybeSingle()
  if (semColuna) return { ...(semColuna as Omit<CostSettings, 'custo_logistica_pedido'>), custo_logistica_pedido: 0 }

  return DEFAULTS
}

/**
 * Imposto sobre o faturamento do período.
 *
 * Devolve `null` quando a alíquota não está configurada — o chamador precisa
 * decidir o que dizer ao usuário, e não pode simplesmente somar zero.
 */
export function computeSalesTax(revenue: number, s: CostSettings): number | null {
  if (s.imposto_pct === null || s.imposto_pct === undefined) return null
  return revenue * (s.imposto_pct / 100)
}

/** Taxa de gateway (AppMax) por pedido — soma a taxa do método de pagamento
 *  (se conhecido) + parcelamento (cartão, 1,89 p.p. por parcela além da 1ª —
 *  a loja oferece parcelamento sem juros pro cliente, mas a AppMax cobra essa
 *  taxa extra dela mesma) + a taxa fixa de Gateway/Antifraude, cobrada em
 *  TODA transação aprovada independente do método. Pedidos sem método
 *  identificado (sincronizados antes do campo existir) usam o cartão como
 *  estimativa conservadora (é a taxa mais alta das três). `installments`
 *  default vem de `default_installments` (parcelamento padrão oferecido) —
 *  pedidos manuais podem informar o valor real usado naquele link. */
export function computeGatewayFee(valor: number, paymentMethod: string | null, s: CostSettings, installments?: number): number {
  const method = paymentMethod ?? 'credit_card'
  let methodFee: number
  if (method === 'pix') methodFee = valor * (s.appmax_pix_pct / 100) + s.appmax_pix_fixed
  else if (method === 'boleto') methodFee = s.appmax_boleto_fixed
  else {
    const n = installments ?? s.default_installments
    const pct = s.appmax_card_pct + Math.max(0, n - 1) * s.appmax_installment_pct
    methodFee = valor * (pct / 100)
  }
  return methodFee + s.appmax_gateway_fixed
}

/**
 * A Yampi mudou em 01/08/2026: saiu de 2,5% por pedido para 1,5% + mensalidade de
 * R$ 527. A tabela `cost_settings` guarda só o valor vigente, sem histórico — então
 * a taxa antiga fica aqui. Sem isso, abrir o filtro de julho no admin recalcularia
 * aquele mês com a taxa de hoje e mostraria um custo menor do que foi cobrado de fato
 * (a taxa de 2,5% em julho foi conferida contra dois ciclos de cobrança da Yampi,
 * que bateram ao centavo com a receita de pedidos pagos).
 *
 * Se a data da mudança não for essa, é só corrigir a constante abaixo.
 */
export const YAMPI_MUDANCA_ISO   = '2026-08-01'
export const YAMPI_PCT_ANTERIOR  = 2.5
export const YAMPI_MENSALIDADE   = 527

export function computeYampiFee(valor: number, s: CostSettings, dataPedidoISO?: string): number {
  const pct = dataPedidoISO && dataPedidoISO < YAMPI_MUDANCA_ISO ? YAMPI_PCT_ANTERIOR : s.yampi_fee_pct
  return valor * (pct / 100)
}

/**
 * Tributo de 13,8% incidente sobre o investimento em Meta Ads — informado pela empresa
 * em 11/08/2026. NÃO é imposto sobre faturamento: incide só sobre a mídia, e é pago
 * junto com ela. Até esta data o admin não descontava nada disso, o que inflava o
 * Lucro Líquido em ~R$ 4.700 (julho) a ~R$ 6.100/mês (ritmo de agosto).
 */
export const TRIBUTO_MIDIA_PCT = 13.8

/**
 * Só sobre a Meta — e isso é intencional.
 *
 * Confirmado pelo Matheus em 19/08/2026: o tributo não incide sobre o gasto do
 * Google Ads. A assimetria parece esquecimento à primeira vista (as duas são
 * mídia paga, ambas de fornecedor estrangeiro), e já foi questionada uma vez.
 * Fica registrado aqui para ninguém "corrigir" aplicando ao Google e passar a
 * subtrair um custo que a empresa não paga.
 */
export function computeMediaTax(metaSpend: number): number {
  return metaSpend * (TRIBUTO_MIDIA_PCT / 100)
}

/** Custo de frete: se o cliente pagou frete, esse É o custo real (repassado
 *  direto pra transportadora). Se foi frete grátis (shipping_amount = 0), usa
 *  o custo interno configurado (a empresa paga do próprio bolso). */
export function computeFreightCost(shippingAmount: number, s: CostSettings): number {
  return shippingAmount > 0 ? shippingAmount : s.frete_gratis_custo
}

/**
 * Custo de logística de um período: valor fixo × quantidade de pedidos PAGOS.
 *
 * Separado do frete de propósito. `computeFreightCost` é o transporte em si
 * (o que o cliente pagou, ou o custo interno quando é frete grátis); isto aqui
 * é o que a logística cobra para manusear cada pedido, e é devido mesmo quando
 * o cliente pagou o frete inteiro. Somar os dois numa linha só esconderia que
 * são duas cobranças de naturezas diferentes.
 *
 * A base é pedido pago porque pedido não pago não vira etiqueta — confirmado
 * pelo dono em 03/09/2026.
 */
export function computeLogisticsCost(paidOrders: number, s: CostSettings): number {
  return paidOrders * s.custo_logistica_pedido
}
