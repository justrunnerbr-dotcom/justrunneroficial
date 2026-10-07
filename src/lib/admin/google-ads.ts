import { GoogleAdsApi } from 'google-ads-api'
import {
  type SourceResult,
  sourceOk,
  sourceError,
  sourceNotConfigured,
  withTimeout,
} from '@/lib/admin/source-status'

const SOURCE = 'google-ads'
const SOURCE_TIMEOUT_MS = 15_000

// Backfill varre meses de uma vez; 15s é o orçamento de uma leitura de painel,
// não de uma varredura histórica.
const BACKFILL_TIMEOUT_MS = 120_000

export interface GoogleAdsLiveSpend {
  spend:       number
  impressions: number
  clicks:      number
}

export interface GoogleAdsDailySpend extends GoogleAdsLiveSpend {
  date: string
}

/** Nomes das variáveis ausentes, ou [] se estiver tudo configurado. */
function missingEnvVars(): string[] {
  const required = [
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CUSTOMER_ID',
    'GOOGLE_ADS_REFRESH_TOKEN',
  ]
  return required.filter(k => !process.env[k])
}

function getClient() {
  if (missingEnvVars().length > 0) return null

  // missingEnvVars() já garantiu que todas estão presentes; o `!` só informa
  // isso ao compilador, que não consegue enxergar a checagem indireta.
  const api = new GoogleAdsApi({
    client_id:       process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret:   process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  })

  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!

  return api.Customer({
    customer_id:        customerId,
    login_customer_id:  process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? customerId,
    refresh_token:      process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  })
}

// `until` segue a convenção DateRange.endExclusive (dia seguinte, exclusivo) —
// GAQL BETWEEN é inclusivo nas duas pontas, então subtrai 1 dia antes de montar a query.
function toInclusiveEnd(untilExclusive: string): string {
  const d = new Date(`${untilExclusive}T00:00:00-03:00`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function getGoogleAdsLiveSpend(
  since: string,
  untilExclusive: string,
): Promise<SourceResult<GoogleAdsLiveSpend>> {
  const missing = missingEnvVars()
  if (missing.length > 0) {
    return sourceNotConfigured(SOURCE, `variáveis ausentes: ${missing.join(', ')}`)
  }

  const customer = getClient()
  if (!customer) return sourceNotConfigured(SOURCE, 'cliente da API não pôde ser criado')

  const untilInclusive = toInclusiveEnd(untilExclusive)
  if (untilInclusive < since) {
    // Range de 0 dias (ex: "hoje" antes da meia-noite). Zero legítimo, não falha.
    return sourceOk(SOURCE, { spend: 0, impressions: 0, clicks: 0 })
  }

  try {
    const rows = await withTimeout(
      customer.query(
        `SELECT metrics.cost_micros, metrics.impressions, metrics.clicks
         FROM customer
         WHERE segments.date BETWEEN '${since}' AND '${untilInclusive}'`,
      ),
      SOURCE_TIMEOUT_MS,
      SOURCE,
    )

    return sourceOk(
      SOURCE,
      rows.reduce(
        (acc, row) => ({
          spend:       acc.spend       + Number(row.metrics?.cost_micros ?? 0) / 1_000_000,
          impressions: acc.impressions + Number(row.metrics?.impressions ?? 0),
          clicks:      acc.clicks      + Number(row.metrics?.clicks ?? 0),
        }),
        { spend: 0, impressions: 0, clicks: 0 },
      ),
    )
  } catch (err) {
    // Causa mais comum aqui: refresh token expirado ("invalid_grant"). O app
    // OAuth em modo "Testando" no Google Cloud mata todo token a cada 7 dias.
    return sourceError(SOURCE, err)
  }
}

/**
 * Gasto do Google Ads **quebrado por dia**, numa única chamada.
 *
 * `getGoogleAdsLiveSpend` devolve o total do período — serve pro painel, não
 * pra reconstruir histórico: preencher 90 dias com ela custaria 90 requisições.
 * Aqui `segments.date` entra no SELECT, então o GAQL já devolve uma linha por
 * dia e o backfill inteiro cabe em uma chamada.
 *
 * Dias sem veiculação simplesmente não voltam da API. Quem consome deve tratar
 * ausência como "sem dado", nunca como zero — zero é o valor que faz o lucro
 * parecer maior do que foi.
 */
export async function getGoogleAdsDailySpend(
  since: string,
  untilExclusive: string,
): Promise<SourceResult<GoogleAdsDailySpend[]>> {
  const missing = missingEnvVars()
  if (missing.length > 0) {
    return sourceNotConfigured(SOURCE, `variáveis ausentes: ${missing.join(', ')}`)
  }

  const customer = getClient()
  if (!customer) return sourceNotConfigured(SOURCE, 'cliente da API não pôde ser criado')

  const untilInclusive = toInclusiveEnd(untilExclusive)
  if (untilInclusive < since) return sourceOk(SOURCE, [])

  try {
    const rows = await withTimeout(
      customer.query(
        `SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks
         FROM customer
         WHERE segments.date BETWEEN '${since}' AND '${untilInclusive}'`,
      ),
      BACKFILL_TIMEOUT_MS,
      SOURCE,
    )

    // A mesma data pode voltar em mais de uma linha (a API segmenta por outros
    // eixos além do que pedimos); soma em vez de sobrescrever.
    const porDia = new Map<string, GoogleAdsDailySpend>()
    for (const row of rows) {
      const date = String(row.segments?.date ?? '')
      if (!date) continue
      const atual = porDia.get(date) ?? { date, spend: 0, impressions: 0, clicks: 0 }
      atual.spend       += Number(row.metrics?.cost_micros ?? 0) / 1_000_000
      atual.impressions += Number(row.metrics?.impressions  ?? 0)
      atual.clicks      += Number(row.metrics?.clicks       ?? 0)
      porDia.set(date, atual)
    }

    return sourceOk(SOURCE, [...porDia.values()].sort((a, b) => a.date.localeCompare(b.date)))
  } catch (err) {
    return sourceError(SOURCE, err)
  }
}
