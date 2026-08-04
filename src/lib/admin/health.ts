import { getAdminSupabase } from '@/lib/admin-client'
import { getMetaLiveSpend } from '@/lib/admin/meta-ads'
import { withTimeout, type SourceResult, type SourceStatus } from '@/lib/admin/source-status'

// Painel de saúde do admin: responde "dá pra confiar nos números agora?" sem
// precisar abrir log da Vercel. Existe porque uma fonte muda não se anuncia —
// ela vira R$ 0,00 na tela e ninguém percebe por dias.

export interface SourceHealth {
  key:       string
  label:     string
  status:    SourceStatus
  detail:    string | null
  checkedAt: string
  /** Resumo curto do dado lido, quando houve leitura bem-sucedida. */
  sample:    string | null
  /**
   * Respondeu, mas incompleto (ex.: 1 das 2 contas Meta não retornou).
   * Precisa de estado visual próprio: exibir "Operando" aqui seria a mesma
   * meia-verdade que esta página existe pra eliminar.
   */
  partial:   boolean
}

export interface TableHealth {
  name:    string
  exists:  boolean
  error:   string | null
}

export interface SystemHealth {
  sources:       SourceHealth[]
  missingTables: TableHealth[]
  tablesChecked: number
  generatedAt:   string
}

// Tabelas que o código realmente consulta. Uma ausente significa migration não
// rodada — a tela que depende dela falha em silêncio hoje (o cliente Supabase
// devolve `data: null` sem lançar, e o código faz `?? []`).
const EXPECTED_TABLES = [
  'admin_audit_log', 'brain_recommendations', 'brain_signals', 'collections',
  'cost_settings', 'customer_contact_log', 'customer_purchase_stats', 'customers',
  'daily_analytics', 'daily_marketing_costs', 'events', 'health_scores', 'images',
  'live_visitors', 'manual_order_items', 'manual_orders', 'meta_ad_insights',
  'meta_ads_agent_memory', 'meta_ads_agent_messages', 'meta_sync_logs',
  'order_cost_overrides', 'order_items', 'orders', 'product_costs', 'products',
  'recovery_actions', 'sessions', 'settings', 'stock_purchases',
  'supplier_order_items', 'suppliers', 'variants',
  'whatsapp_conversations', 'whatsapp_messages', 'yampi_catalog_sync_logs',
]

const fmtBrl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function fromSourceResult<T>(
  key: string,
  label: string,
  r: SourceResult<T>,
  sample: (d: T) => string,
  partial = false,
): SourceHealth {
  return {
    key,
    label,
    status:    r.status,
    detail:    r.error,
    checkedAt: r.checkedAt,
    sample:    r.status === 'ok' && r.data !== null ? sample(r.data) : null,
    partial,
  }
}

/** Supabase é a fonte do catálogo/eventos — testada com uma leitura barata. */
async function checkSupabase(): Promise<SourceHealth> {
  const checkedAt = new Date().toISOString()
  try {
    const db = getAdminSupabase()
    const { error, count } = await db
      .from('orders')
      .select('id', { count: 'estimated', head: true })
    if (error) {
      return { key: 'supabase', label: 'Supabase', status: 'error', detail: error.message, checkedAt, sample: null, partial: false }
    }
    return { key: 'supabase', label: 'Supabase', status: 'ok', detail: null, checkedAt, sample: `~${count ?? 0} pedidos`, partial: false }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return { key: 'supabase', label: 'Supabase', status: 'error', detail, checkedAt, sample: null, partial: false }
  }
}

/** Yampi é a fonte da verdade de pedidos pagos. */
async function checkYampi(): Promise<SourceHealth> {
  const checkedAt = new Date().toISOString()
  const token = process.env.YAMPI_API_TOKEN
  const key   = process.env.YAMPI_SECRET_KEY
  // Atenção: aqui é NEXT_PUBLIC_YAMPI_ALIAS. A variável `YAMPI_ALIAS` nunca
  // existiu neste projeto — ler o nome errado já quebrou o sync de pedidos e a
  // sincronização de carrinho abandonado antes, sempre em silêncio.
  const alias = process.env.NEXT_PUBLIC_YAMPI_ALIAS

  if (!token || !key || !alias) {
    return {
      key: 'yampi', label: 'Yampi', status: 'not_configured', checkedAt, sample: null, partial: false,
      detail: 'YAMPI_API_TOKEN / YAMPI_SECRET_KEY / NEXT_PUBLIC_YAMPI_ALIAS ausentes',
    }
  }

  try {
    const res = await fetch(`https://api.dooki.com.br/v2/${alias}/catalog/products?limit=1`, {
      headers: { 'User-Token': token, 'User-Secret-Key': key, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      return { key: 'yampi', label: 'Yampi', status: 'error', detail: `HTTP ${res.status}`, checkedAt, sample: null, partial: false }
    }
    return { key: 'yampi', label: 'Yampi', status: 'ok', detail: null, checkedAt, sample: 'API respondendo', partial: false }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return { key: 'yampi', label: 'Yampi', status: 'error', detail, checkedAt, sample: null, partial: false }
  }
}

/** Confere quais tabelas esperadas não existem (migration não rodada). */
async function checkTables(): Promise<TableHealth[]> {
  const db = getAdminSupabase()

  // `.limit(1)` em vez de count exato: contar linha em tabela grande estoura
  // statement timeout (erro 57014). Aqui só interessa saber se a tabela existe,
  // e o erro PGRST205 responde isso de graça.
  const results = await Promise.all(
    EXPECTED_TABLES.map(async name => {
      const { error } = await db.from(name).select('*').limit(1)
      return { name, exists: !error, error: error?.message ?? null }
    }),
  )

  return results.filter(r => !r.exists)
}

export async function getSystemHealth(since: string, endExclusive: string): Promise<SystemHealth> {
  // A própria página de saúde não pode travar por causa de uma fonte travada —
  // seria o pior lugar possível pra isso acontecer.
  const [supabase, yampi, meta, missingTables] = await Promise.all([
    checkSupabase(),
    checkYampi(),
    getMetaLiveSpend(since, endExclusive),
    withTimeout(checkTables(), 20_000, 'tabelas').catch(() => [] as TableHealth[]),
  ])

  const metaPartial = (meta.data?.failedAccounts.length ?? 0) > 0
  const metaHealth = fromSourceResult(
    'meta-ads', 'Meta Ads', meta,
    d => d.failedAccounts.length > 0
      ? `${fmtBrl(d.total.spend)} · sem ${d.failedAccounts.join(', ')}`
      : `${fmtBrl(d.total.spend)} em ${d.accounts.length} conta(s)`,
    metaPartial,
  )

  return {
    sources:       [supabase, yampi, metaHealth],
    missingTables,
    tablesChecked: EXPECTED_TABLES.length,
    generatedAt:   new Date().toISOString(),
  }
}
