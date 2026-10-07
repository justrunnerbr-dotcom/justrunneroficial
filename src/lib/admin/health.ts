import { getAdminSupabase } from '@/lib/admin-client'
import { getMetaLiveSpend } from '@/lib/admin/meta-ads'
import { getGoogleAdsLiveSpend } from '@/lib/admin/google-ads'
import { withTimeout, type SourceResult, type SourceStatus } from '@/lib/admin/source-status'

// Painel de saúde do admin: responde "dá pra confiar nos números agora?" sem
// precisar abrir log da Vercel. Nasceu do incidente de 2026-08-02, em que o
// token do Google Ads expirou e o dashboard exibiu R$ 0,00 por 5 dias sem
// nenhum sinal de que a fonte estava muda.

export interface SourceHealth {
  key:       string
  label:     string
  status:    SourceStatus
  detail:    string | null
  checkedAt: string
  /** Resumo curto do dado lido, quando houve leitura bem-sucedida. */
  sample:    string | null
  /**
   * Respondeu, mas incompleto (ex.: 2 das 3 contas Meta não retornaram).
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

/**
 * Frescor de uma rotina que grava dado histórico.
 *
 * As fontes ao vivo acima respondem "a API está de pé agora". Isto responde
 * outra pergunta, que ficou sem dono: "o que está gravado no banco é recente?".
 * O sync da Meta ficou semanas parado gravando zero em silêncio, e o único
 * sintoma foi um alerta de saturação que nunca disparava — nenhuma tela dizia
 * que a fonte tinha envelhecido, porque nenhuma tela olhava a idade do dado.
 */
export interface SyncHealth {
  key:      string
  label:    string
  /** Momento do registro mais recente, ISO. Null quando não há nenhum. */
  lastAt:   string | null
  ageHours: number | null
  status:   'ok' | 'stale' | 'empty'
  detail:   string
}

export interface SystemHealth {
  sources:       SourceHealth[]
  syncs:         SyncHealth[]
  missingTables: TableHealth[]
  tablesChecked: number
  generatedAt:   string
}

// As rotinas rodam de madrugada (03:00, 03:40). 48h dá folga pra uma execução
// falhar sem alarme falso, e ainda pega a segunda falha seguida.
const SYNC_STALE_HOURS = 48

// Tabelas que o código realmente consulta. Uma ausente significa migration não
// rodada — a tela que depende dela falha em silêncio hoje (o cliente Supabase
// devolve `data: null` sem lançar, e o código faz `?? []`).
const EXPECTED_TABLES = [
  'admin_creatives', 'brain_recommendations', 'brain_signals', 'collections',
  'cost_settings', 'customer_contact_log', 'customer_purchase_stats', 'customers',
  'daily_analytics', 'events', 'google_click_ids', 'health_scores',
  'images',
  'live_visitors', 'manual_order_items', 'manual_orders', 'meta_ad_insights',
  'meta_ads_agent_memory', 'meta_ads_agent_messages', 'meta_sync_logs',
  'order_cost_overrides', 'order_items', 'orders', 'product_costs', 'products',
  'recovery_actions', 'sessions', 'settings', 'stock_purchases',
  'supplier_mapping', 'supplier_order_items', 'suppliers', 'variants',
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
  const alias = process.env.NEXT_PUBLIC_YAMPI_ALIAS

  if (!token || !key || !alias) {
    return {
      key: 'yampi', label: 'Yampi', status: 'not_configured', checkedAt, sample: null, partial: false,
      detail: 'YAMPI_API_TOKEN / YAMPI_SECRET_KEY / YAMPI_ALIAS ausentes',
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

  // `.limit(1)` em vez de count exato: contar linha em tabela grande deste
  // projeto estoura statement timeout (erro 57014). Aqui só interessa saber
  // se a tabela existe, e o erro PGRST205 responde isso de graça.
  const results = await Promise.all(
    EXPECTED_TABLES.map(async name => {
      const { error } = await db.from(name).select('*').limit(1)
      return { name, exists: !error, error: error?.message ?? null }
    }),
  )

  return results.filter(r => !r.exists)
}

/**
 * Idade do registro mais recente de uma tabela sincronizada.
 *
 * `empty` e `stale` são estados diferentes de propósito: tabela vazia significa
 * que a rotina nunca gravou (ou que o backfill nunca rodou), tabela velha
 * significa que ela parou. As duas quebram o painel, mas o conserto é outro.
 */
async function checkSyncFreshness(
  key: string,
  label: string,
  table: string,
  column: string,
  filtro?: { coluna: string; valor: string },
): Promise<SyncHealth> {
  const db = getAdminSupabase()
  try {
    let q = db.from(table).select(column).order(column, { ascending: false }).limit(1)
    if (filtro) q = q.eq(filtro.coluna, filtro.valor)

    const { data, error } = await q
    if (error) {
      return { key, label, lastAt: null, ageHours: null, status: 'empty', detail: error.message }
    }

    // `select(column)` com nome dinâmico impede o supabase-js de inferir a
    // forma da linha; o cast é o preço de checar tabelas diferentes com uma
    // função só.
    const linha = (data ?? [])[0] as unknown as Record<string, unknown> | undefined
    const bruto = linha?.[column]
    if (!bruto) {
      return { key, label, lastAt: null, ageHours: null, status: 'empty', detail: 'nenhum registro gravado' }
    }

    // `date_start` é DATE (sem hora); as demais são timestamptz. Normalizar pro
    // início do dia mantém a conta de idade correta nos dois casos.
    const lastAt = new Date(String(bruto).length === 10 ? `${bruto}T00:00:00-03:00` : String(bruto))
    const ageHours = (Date.now() - lastAt.getTime()) / 3_600_000
    const stale = ageHours > SYNC_STALE_HOURS

    return {
      key, label,
      lastAt:   lastAt.toISOString(),
      ageHours: Math.round(ageHours),
      status:   stale ? 'stale' : 'ok',
      detail:   stale
        ? `parado há ${Math.floor(ageHours / 24)} dia(s) — o custo do período longo está incompleto`
        : `atualizado há ${Math.round(ageHours)}h`,
    }
  } catch (err) {
    return {
      key, label, lastAt: null, ageHours: null, status: 'empty',
      detail: err instanceof Error ? err.message : 'falha ao consultar',
    }
  }
}

export async function getSystemHealth(since: string, endExclusive: string): Promise<SystemHealth> {
  // A própria página de saúde não pode travar por causa de uma fonte travada —
  // seria o pior lugar possível pra isso acontecer.
  const [supabase, yampi, meta, google, missingTables, syncs] = await Promise.all([
    checkSupabase(),
    checkYampi(),
    getMetaLiveSpend(since, endExclusive),
    getGoogleAdsLiveSpend(since, endExclusive),
    withTimeout(checkTables(), 20_000, 'tabelas').catch(() => [] as TableHealth[]),
    Promise.all([
      checkSyncFreshness('sync-meta-insights', 'Meta Ads — insights sincronizados', 'meta_ad_insights', 'date_start'),
      checkSyncFreshness('sync-custo-meta',    'Custo diário — Meta',                'daily_marketing_costs', 'updated_at', { coluna: 'platform', valor: 'meta' }),
      checkSyncFreshness('sync-produtos',      'Estatística diária de produto',      'product_daily_stats', 'date'),
      // Ficou 47 dias parada sem ninguém notar (03/07 a 19/08/2026): só rodava
      // por clique manual. LTV, recompra e "clientes sumidos" saem daqui.
      checkSyncFreshness('sync-clientes',      'Estatística de clientes (LTV/recompra)', 'customer_purchase_stats', 'synced_at'),
    ]).catch(() => [] as SyncHealth[]),
  ])

  const metaPartial = (meta.data?.failedAccounts.length ?? 0) > 0
  const metaHealth = fromSourceResult(
    'meta-ads', 'Meta Ads', meta,
    d => d.failedAccounts.length > 0
      ? `${fmtBrl(d.total.spend)} · sem ${d.failedAccounts.join(', ')}`
      : `${fmtBrl(d.total.spend)} em ${d.accounts.length} conta(s)`,
    metaPartial,
  )

  const googleHealth = fromSourceResult('google-ads', 'Google Ads', google, d => fmtBrl(d.spend))

  return {
    sources:       [supabase, yampi, metaHealth, googleHealth],
    syncs,
    missingTables,
    tablesChecked: EXPECTED_TABLES.length,
    generatedAt:   new Date().toISOString(),
  }
}
