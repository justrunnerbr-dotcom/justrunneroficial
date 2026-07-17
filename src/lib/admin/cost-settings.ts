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
}

export async function getCostSettings(): Promise<CostSettings> {
  const db = getAdminSupabase()
  const { data } = await db
    .from('cost_settings')
    .select('yampi_fee_pct, appmax_pix_pct, appmax_pix_fixed, appmax_card_pct, appmax_boleto_fixed, appmax_gateway_fixed, appmax_installment_pct, default_installments, frete_gratis_custo')
    .maybeSingle()
  return data ?? DEFAULTS
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

export function computeYampiFee(valor: number, s: CostSettings): number {
  return valor * (s.yampi_fee_pct / 100)
}

/** Custo de frete: se o cliente pagou frete, esse É o custo real (repassado
 *  direto pra transportadora). Se foi frete grátis (shipping_amount = 0), usa
 *  o custo interno configurado (a empresa paga do próprio bolso). */
export function computeFreightCost(shippingAmount: number, s: CostSettings): number {
  return shippingAmount > 0 ? shippingAmount : s.frete_gratis_custo
}
