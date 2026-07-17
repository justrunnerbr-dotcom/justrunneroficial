import Anthropic from '@anthropic-ai/sdk'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Signal } from './anomaly-detector'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'

const MODEL = 'claude-haiku-4-5-20251001'

interface Hypothesis {
  title:      string
  hypothesis: string
  action:     string
  priority:   'low' | 'medium' | 'high' | 'urgent'
}

function buildPrompt(signal: Signal): string {
  const fmtPct   = (v: number) => `${(v * 100).toFixed(2)}%`
  const fmtDelta = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
  const ctx      = signal.context as Record<string, unknown>

  const signalDescriptions: Record<string, string> = {
    conversion_drop: 'QUEDA NA TAXA DE CONVERSÃO',
    revenue_drop:    'QUEDA NA RECEITA DIÁRIA',
    traffic_drop:    'QUEDA NO TRÁFEGO',
  }

  const metricLines: Record<string, string> = {
    conversion_drop: [
      `- Taxa atual (últimos 3 dias): ${fmtPct(signal.current_value)}`,
      `- Taxa base (7 dias anteriores): ${fmtPct(signal.baseline_value)}`,
      `- Variação: ${fmtDelta(signal.delta_pct)}`,
      `- Sessões recentes: ${ctx.recent_sessions ?? 'N/A'}`,
      `- Pedidos recentes: ${ctx.recent_orders ?? 'N/A'}`,
    ].join('\n'),
    revenue_drop: [
      `- Receita média atual (últimos 3 dias): R$ ${signal.current_value.toFixed(2)}/dia`,
      `- Receita média base (7 dias anteriores): R$ ${signal.baseline_value.toFixed(2)}/dia`,
      `- Variação: ${fmtDelta(signal.delta_pct)}`,
    ].join('\n'),
    traffic_drop: [
      `- Sessões médias atuais (últimos 3 dias): ${signal.current_value.toFixed(0)}/dia`,
      `- Sessões médias base (7 dias anteriores): ${signal.baseline_value.toFixed(0)}/dia`,
      `- Variação: ${fmtDelta(signal.delta_pct)}`,
    ].join('\n'),
  }

  return `Você é Commerce Brain, o analista de inteligência de uma loja de óculos premium brasileira chamada Just Runner.

ANOMALIA DETECTADA:
${signalDescriptions[signal.signal_type] ?? signal.signal_type.toUpperCase()}
Severidade: ${signal.severity.toUpperCase()}

MÉTRICAS:
${metricLines[signal.signal_type] ?? JSON.stringify(signal.context, null, 2)}

CONTEXTO DA LOJA:
- Produto: óculos de sol premium (R$ 80-250)
- Canal principal: Meta Ads (Instagram/Facebook)
- Checkout: Yampi

Sua tarefa: analisar esta anomalia e gerar exatamente um JSON com este formato:
{
  "title": "título curto e direto (máx 8 palavras)",
  "hypothesis": "causa mais provável desta anomalia, específica e acionável (2-3 frases)",
  "action": "ação específica a tomar AGORA para investigar ou corrigir (1 frase imperativa)",
  "priority": "urgent | high | medium | low"
}

Regras:
- Responda APENAS com o JSON, sem markdown, sem texto extra
- Em português brasileiro
- Seja específico sobre óculos de sol, Meta Ads, checkout
- "urgent" = precisa de ação nas próximas 2 horas
- "high" = ação até o fim do dia
- Não invente dados que não foram fornecidos`
}

function parseHypothesis(raw: string): Hypothesis | null {
  try {
    const cleaned = raw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const parsed  = JSON.parse(cleaned)
    if (!parsed.title || !parsed.hypothesis || !parsed.action || !parsed.priority) return null
    return parsed as Hypothesis
  } catch {
    return null
  }
}

// ─── Fallback when Claude API is unavailable ──────────────────────────────────

function fallbackHypothesis(signal: Signal): Hypothesis {
  const fallbacks: Record<string, Hypothesis> = {
    conversion_drop: {
      title:      'Taxa de conversão em queda',
      hypothesis: `A taxa de conversão caiu ${Math.abs(signal.delta_pct).toFixed(1)}% em relação à média anterior. As causas mais comuns são problemas no checkout do Yampi, mudanças no público dos anúncios do Meta Ads ou aumento no preço percebido versus concorrência.`,
      action:     'Verificar o fluxo completo de checkout no Yampi e revisar os criativos ativos no Meta Ads Manager.',
      priority:   signal.severity === 'critical' || signal.severity === 'high' ? 'urgent' : 'high',
    },
    revenue_drop: {
      title:      'Receita diária abaixo da média',
      hypothesis: `A receita média dos últimos 3 dias caiu ${Math.abs(signal.delta_pct).toFixed(1)}% em relação à semana anterior. Pode indicar queda de tráfego qualificado, aumento de rejeição no checkout ou problema com métodos de pagamento.`,
      action:     'Verificar o Yampi para pedidos com erro de pagamento e checar o orçamento das campanhas no Meta Ads.',
      priority:   'high',
    },
    traffic_drop: {
      title:      'Queda no tráfego da loja',
      hypothesis: `O número de sessões caiu ${Math.abs(signal.delta_pct).toFixed(1)}% em relação à média anterior. Principais causas: redução no orçamento de anúncios, criativos com desempenho em queda ou problema técnico com o site.`,
      action:     'Verificar o Meta Ads Manager para campanhas pausadas ou com orçamento esgotado.',
      priority:   signal.severity === 'critical' ? 'urgent' : 'high',
    },
  }

  return fallbacks[signal.signal_type] ?? {
    title:      'Anomalia detectada',
    hypothesis: `Detectada variação de ${signal.delta_pct.toFixed(1)}% em ${signal.metric_name}. Investigação necessária.`,
    action:     'Revisar métricas no painel de analytics e verificar campanhas ativas.',
    priority:   'medium',
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────

export interface RecommendationResult {
  title:       string
  hypothesis:  string
  action:      string
  priority:    string
  model_used:  string
  tokens_used: number
}

export async function generateHypothesis(signal: Signal): Promise<RecommendationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    const fb = fallbackHypothesis(signal)
    return { ...fb, model_used: 'fallback', tokens_used: 0 }
  }

  try {
    const client   = new Anthropic({ apiKey })
    const prompt   = buildPrompt(signal)
    const response = await client.messages.create({
      model:      MODEL,
      max_tokens: 512,
      messages:   [{ role: 'user', content: prompt }],
    })

    const rawText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const parsed = parseHypothesis(rawText)

    if (!parsed) {
      const fb = fallbackHypothesis(signal)
      return { ...fb, model_used: `${MODEL}(parse-fail)`, tokens_used: response.usage.output_tokens }
    }

    return {
      title:       parsed.title,
      hypothesis:  parsed.hypothesis,
      action:      parsed.action,
      priority:    parsed.priority,
      model_used:  MODEL,
      tokens_used: response.usage.output_tokens,
    }
  } catch {
    const fb = fallbackHypothesis(signal)
    return { ...fb, model_used: 'fallback(api-error)', tokens_used: 0 }
  }
}

// ─── Persist recommendation ───────────────────────────────────────────────────

export async function saveRecommendation(
  db:        SupabaseClient,
  signalId:  string,
  rec:       RecommendationResult,
): Promise<string> {
  const { data, error } = await db.from('brain_recommendations').insert({
    store_id:    STORE_ID,
    signal_id:   signalId,
    title:       rec.title,
    hypothesis:  rec.hypothesis,
    action:      rec.action,
    priority:    rec.priority,
    model_used:  rec.model_used,
    tokens_used: rec.tokens_used,
    status:      'open',
  }).select('id').single()

  if (error) throw new Error(`saveRecommendation: ${error.message}`)
  return data.id
}
