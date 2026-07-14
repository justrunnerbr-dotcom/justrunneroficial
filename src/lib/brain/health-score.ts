import { SupabaseClient } from '@supabase/supabase-js'

const JHF_STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const TZ = 'America/Sao_Paulo'

function brlDate(daysAgo = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toLocaleDateString('en-CA', { timeZone: TZ })
}

// ─── Revenue Pillar: max 30pts ───────────────────────────────────────────────
// Compares this week vs last week revenue.
// Growth of ≥20% = 30pts. Flat = 25pts. Declining = scales down.
function calcRevenue(
  thisWeek: number,
  prevWeek: number,
  dataDays: number,
): { score: number; insight: string | null } {
  if (dataDays < 7) {
    return {
      score: Math.min(dataDays * 2, 10),
      insight: dataDays === 0 ? 'Sincronize pedidos do Yampi para ativar o pilar Receita.' : null,
    }
  }
  if (thisWeek === 0 && prevWeek === 0) {
    return { score: 0, insight: 'Nenhuma receita nos últimos 14 dias. Revisar campanhas de tráfego pago.' }
  }
  if (prevWeek === 0 && thisWeek > 0) {
    return { score: 20, insight: null }
  }
  const ratio = thisWeek / prevWeek
  if (ratio >= 1.2) return { score: 30, insight: null }
  if (ratio >= 1.0) return { score: 25, insight: null }
  if (ratio >= 0.7) return { score: 15, insight: 'Receita em queda leve vs semana anterior. Checar campanhas de Meta Ads.' }
  if (ratio >= 0.5) return { score: 10, insight: 'Receita caiu mais de 30% vs semana anterior. Ação necessária.' }
  return { score: 5, insight: 'Receita crítica: queda de mais de 50% em 7 dias. Revisar operação urgente.' }
}

// ─── Conversion Pillar: max 25pts ─────────────────────────────────────────────
// Média da taxa de conversão dos últimos 7 dias.
function calcConversion(
  avgRate: number,
  dataDays: number,
): { score: number; insight: string | null } {
  if (dataDays < 3) {
    return { score: 0, insight: 'Dados insuficientes para calcular conversão. Aguardar mais visitas.' }
  }
  if (avgRate >= 0.03) return { score: 25, insight: null }
  if (avgRate >= 0.02) return { score: 21, insight: null }
  if (avgRate >= 0.015) return { score: 17, insight: null }
  if (avgRate >= 0.01) return { score: 13, insight: 'Conversão abaixo de 1.5% — testar novas fotos de produto e descrições.' }
  if (avgRate >= 0.005) return { score: 8, insight: 'Conversão abaixo de 1% — revisar UX do checkout e preço vs concorrência.' }
  if (avgRate > 0) return { score: 4, insight: 'Conversão crítica (<0.5%) — verificar problemas no checkout ou desconfiança do cliente.' }
  return { score: 0, insight: 'Nenhuma conversão registrada. Verificar integração Yampi e webhook.' }
}

// ─── Catalog Pillar: max 15pts ────────────────────────────────────────────────
// Cobertura de imagens + variantes ativas com preço e estoque.
function calcCatalog(
  totalActive: number,
  withImages: number,
  variantsActive: number,
  variantsWithStock: number,
): { score: number; insight: string | null } {
  if (totalActive === 0) {
    return { score: 0, insight: 'Nenhum produto ativo encontrado no catálogo.' }
  }
  const imageCoverage = withImages / totalActive
  const stockCoverage = variantsActive > 0 ? variantsWithStock / variantsActive : 0

  if (imageCoverage >= 1.0 && stockCoverage >= 0.8) return { score: 15, insight: null }
  if (imageCoverage >= 0.9) return { score: 12, insight: stockCoverage < 0.8 ? 'Produtos com estoque baixo. Verificar reposição.' : null }
  if (imageCoverage >= 0.7) return { score: 9, insight: `${Math.round((1 - imageCoverage) * totalActive)} produto(s) sem imagem. Fotos são essenciais para conversão.` }
  if (imageCoverage >= 0.5) return { score: 6, insight: 'Mais de 30% dos produtos sem imagem. Isso reduz conversão significativamente.' }
  return { score: 3, insight: 'Catálogo incompleto: maioria dos produtos sem imagem. Prioridade máxima.' }
}

// ─── Acquisition Pillar: max 15pts ───────────────────────────────────────────
// Compara sessões desta semana vs semana anterior.
function calcAcquisition(
  thisWeek: number,
  prevWeek: number,
  dataDays: number,
): { score: number; insight: string | null } {
  if (dataDays < 7) {
    return { score: Math.min(thisWeek > 0 ? 8 : 0, 8), insight: null }
  }
  if (thisWeek === 0) {
    return { score: 0, insight: 'Nenhuma sessão esta semana. Verificar se o tracking está ativo.' }
  }
  if (prevWeek === 0) return { score: 10, insight: null }
  const ratio = thisWeek / prevWeek
  if (ratio >= 1.2) return { score: 15, insight: null }
  if (ratio >= 1.0) return { score: 12, insight: null }
  if (ratio >= 0.7) return { score: 9, insight: 'Tráfego levemente abaixo da semana anterior. Monitorar campanhas.' }
  if (ratio >= 0.5) return { score: 6, insight: 'Queda de tráfego de 30%+. Revisar orçamento de anúncios.' }
  return { score: 3, insight: 'Queda crítica de tráfego. Verificar campanhas ativas e indexação.' }
}

// ─── Retention Pillar: max 10pts ──────────────────────────────────────────────
// Taxa de clientes recorrentes (orders_count >= 2).
function calcRetention(
  totalCustomers: number,
  repeatCustomers: number,
): { score: number; insight: string | null } {
  if (totalCustomers === 0) {
    return { score: 0, insight: 'Nenhum cliente sincronizado. Verificar integração Yampi.' }
  }
  if (repeatCustomers === 0) {
    return { score: 1, insight: 'Nenhum cliente recorrente ainda. Implementar e-mail pós-venda e cupons de retorno.' }
  }
  const rate = repeatCustomers / totalCustomers
  if (rate >= 0.20) return { score: 10, insight: null }
  if (rate >= 0.10) return { score: 8, insight: null }
  if (rate >= 0.05) return { score: 6, insight: 'Retenção abaixo de 10%. Considerar programa de fidelidade ou WhatsApp pós-compra.' }
  return { score: 3, insight: 'Poucos clientes recorrentes. Estratégia de retenção é oportunidade de crescimento.' }
}

// ─── Technical Pillar: max 5pts ───────────────────────────────────────────────
// Tracking ativo + pedidos sincronizados.
function calcTechnical(
  eventsLast24h: number,
  ordersLast7d: number,
): { score: number; insight: string | null } {
  const trackingOk = eventsLast24h > 0
  const syncOk     = ordersLast7d > 0
  if (trackingOk && syncOk)  return { score: 5, insight: null }
  if (trackingOk)            return { score: 3, insight: 'Pedidos não sincronizados nos últimos 7 dias. Verificar webhook Yampi.' }
  if (syncOk)                return { score: 2, insight: 'Tracking sem eventos nas últimas 24h. Verificar TrackingProvider.' }
  return { score: 1, insight: 'Tracking e sincronização de pedidos inativos. Verificar configuração.' }
}

// ─── Main calculator ──────────────────────────────────────────────────────────

export interface HealthScoreResult {
  score:             number
  revenue_score:     number
  conversion_score:  number
  catalog_score:     number
  acquisition_score: number
  retention_score:   number
  technical_score:   number
  learning_mode:     boolean
  data_days:         number
  insights:          string[]
  raw:               Record<string, unknown>
}

export async function calculateHealthScore(db: SupabaseClient): Promise<HealthScoreResult> {
  const today   = brlDate(0)
  const day8    = brlDate(7)
  const day15   = brlDate(14)
  const day30   = brlDate(30)

  const [
    analyticsThis,
    analyticsPrev,
    analyticsAll,
    productsRes,
    imagesRes,
    variantsRes,
    customersRes,
    eventsRes,
    ordersRes,
  ] = await Promise.all([
    // This week: last 7 days
    db.from('daily_analytics')
      .select('revenue, sessions, orders, conversion_rate')
      .eq('store_id', JHF_STORE_ID)
      .gte('date', day8)
      .lte('date', today),

    // Prev week: days 8-14
    db.from('daily_analytics')
      .select('revenue, sessions, orders, conversion_rate')
      .eq('store_id', JHF_STORE_ID)
      .gte('date', day15)
      .lt('date', day8),

    // All analytics for data_days count (last 30)
    db.from('daily_analytics')
      .select('date', { count: 'exact', head: true })
      .eq('store_id', JHF_STORE_ID)
      .gte('date', day30)
      .lte('date', today),

    // Active products
    db.from('products')
      .select('id', { count: 'exact', head: false })
      .eq('status', 'active'),

    // Products with at least 1 image (distinct product_ids)
    db.from('images')
      .select('product_id'),

    // Variants with stock info
    db.from('variants')
      .select('product_id, stock, price'),

    // Customers for retention
    db.from('customers')
      .select('id, orders_count')
      .eq('store_id', JHF_STORE_ID),

    // Events last 24h (technical)
    db.from('events')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', JHF_STORE_ID)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

    // Orders synced last 7 days (technical)
    db.from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', JHF_STORE_ID)
      .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  // ── Raw data extraction ──────────────────────────────────────────────────

  const thisWeekRows = analyticsThis.data ?? []
  const prevWeekRows = analyticsPrev.data ?? []
  const dataDays     = analyticsAll.count ?? 0

  const thisWeekRevenue  = thisWeekRows.reduce((s, r) => s + parseFloat(String(r.revenue ?? 0)), 0)
  const prevWeekRevenue  = prevWeekRows.reduce((s, r) => s + parseFloat(String(r.revenue ?? 0)), 0)
  const thisWeekSessions = thisWeekRows.reduce((s, r) => s + (r.sessions ?? 0), 0)
  const prevWeekSessions = prevWeekRows.reduce((s, r) => s + (r.sessions ?? 0), 0)

  const convRates    = [...thisWeekRows, ...prevWeekRows]
    .map((r) => parseFloat(String(r.conversion_rate ?? 0)))
    .filter((v) => v > 0)
  const avgConvRate  = convRates.length > 0 ? convRates.reduce((s, v) => s + v, 0) / convRates.length : 0

  const activeProducts = productsRes.data ?? []
  const totalActive    = activeProducts.length

  const imageProductIds  = new Set((imagesRes.data ?? []).map((i) => i.product_id))
  const withImages       = activeProducts.filter((p) => imageProductIds.has(p.id)).length

  const variantData      = variantsRes.data ?? []
  const activeProductIds = new Set(activeProducts.map((p) => p.id))
  const activeVariants   = variantData.filter((v) => activeProductIds.has(v.product_id))
  const variantsWithStock = activeVariants.filter((v) => (v.stock ?? 0) > 0).length

  const customers        = customersRes.data ?? []
  const totalCustomers   = customers.length
  const repeatCustomers  = customers.filter((c) => (c.orders_count ?? 0) >= 2).length

  const eventsLast24h    = eventsRes.count ?? 0
  const ordersLast7d     = ordersRes.count ?? 0

  // ── Calculate pillars ────────────────────────────────────────────────────

  const rev = calcRevenue(thisWeekRevenue, prevWeekRevenue, dataDays)
  const cvr = calcConversion(avgConvRate, dataDays)
  const cat = calcCatalog(totalActive, withImages, activeVariants.length, variantsWithStock)
  const acq = calcAcquisition(thisWeekSessions, prevWeekSessions, dataDays)
  const ret = calcRetention(totalCustomers, repeatCustomers)
  const tec = calcTechnical(eventsLast24h, ordersLast7d)

  const totalScore =
    rev.score + cvr.score + cat.score + acq.score + ret.score + tec.score

  const insights = [rev.insight, cvr.insight, cat.insight, acq.insight, ret.insight, tec.insight]
    .filter((i): i is string => !!i)

  return {
    score:             Math.min(totalScore, 100),
    revenue_score:     rev.score,
    conversion_score:  cvr.score,
    catalog_score:     cat.score,
    acquisition_score: acq.score,
    retention_score:   ret.score,
    technical_score:   tec.score,
    learning_mode:     dataDays < 7,
    data_days:         dataDays,
    insights,
    raw: {
      thisWeekRevenue,
      prevWeekRevenue,
      thisWeekSessions,
      prevWeekSessions,
      avgConvRate,
      totalActive,
      withImages,
      activeVariants: activeVariants.length,
      variantsWithStock,
      totalCustomers,
      repeatCustomers,
      eventsLast24h,
      ordersLast7d,
    },
  }
}

export async function saveHealthScore(
  db: SupabaseClient,
  result: HealthScoreResult,
): Promise<void> {
  await db.from('health_scores').insert({
    store_id:          JHF_STORE_ID,
    score:             result.score,
    revenue_score:     result.revenue_score,
    conversion_score:  result.conversion_score,
    catalog_score:     result.catalog_score,
    acquisition_score: result.acquisition_score,
    retention_score:   result.retention_score,
    technical_score:   result.technical_score,
    learning_mode:     result.learning_mode,
    data_days:         result.data_days,
    insights:          result.insights,
    raw:               result.raw,
  })
}
