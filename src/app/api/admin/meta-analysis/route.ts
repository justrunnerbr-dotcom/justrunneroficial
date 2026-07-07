import Anthropic          from '@anthropic-ai/sdk'
import { NextResponse }    from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'
import { getFunnelData }    from '@/lib/admin/meta-ads'

interface MetricsInput {
  spend: number; impressions: number; clicks: number; reach: number
  ctr: number; cpm: number; cpc: number; frequency: number
  results: number; costPerResult: number
}

interface RequestBody {
  level:       'account' | 'campaign' | 'adset' | 'ad'
  entityName:  string
  metrics:     MetricsInput
  since:       string
  until:       string
  accountId?:  string
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY não encontrada. Adicione a variável de ambiente no Vercel e no .env.local.' },
      { status: 500 },
    )
  }

  try {
    const body = await req.json() as RequestBody
    const { level, entityName, metrics, since, until } = body

    const fmtBrl   = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const fmtPct   = (n: number) => `${n.toFixed(2)}%`
    const funnel   = await getFunnelData(getAdminSupabase(), since, until)
    const realRoas = metrics.spend > 0 && funnel.totalRevenue > 0 ? funnel.totalRevenue / metrics.spend : 0
    const metaRoas = metrics.spend > 0 && metrics.results > 0 ? (metrics.results * 150) / metrics.spend : 0 // estimate if no value

    const levelNames: Record<string, string> = {
      account: 'Conta de Anúncios', campaign: 'Campanha', adset: 'Conjunto de Anúncios', ad: 'Anúncio/Criativo',
    }

    const prompt = `Você é um especialista sênior em performance de tráfego pago Meta Ads para e-commerce brasileiro de moda/óculos premium.

PERÍODO: ${since} a ${until}
NÍVEL: ${levelNames[level] ?? level}
ENTIDADE: ${entityName}

═══ MÉTRICAS META ADS (ao vivo) ═══
• Gasto: ${fmtBrl(metrics.spend)}
• Alcance: ${metrics.reach.toLocaleString('pt-BR')} pessoas
• Impressões: ${metrics.impressions.toLocaleString('pt-BR')} (Frequência: ${metrics.frequency.toFixed(2)}×)
• Cliques: ${metrics.clicks.toLocaleString('pt-BR')} (CTR: ${fmtPct(metrics.ctr)})
• CPM: ${fmtBrl(metrics.cpm)} | CPC: ${fmtBrl(metrics.cpc)}
• Conversões Meta (compras pixel): ${metrics.results.toFixed(0)}
• Custo por conversão Meta: ${metrics.costPerResult > 0 ? fmtBrl(metrics.costPerResult) : 'N/A'}

═══ FUNIL REAL (JHF Store — Supabase) ═══
• Sessões vindas do Meta: ${funnel.totalSessions.toLocaleString('pt-BR')}
• Add to Cart: ${funnel.totalAtc} (taxa ATC: ${funnel.totalSessions > 0 ? fmtPct((funnel.totalAtc / funnel.totalSessions) * 100) : 'N/A'})
• Iniciaram Checkout: ${funnel.totalCheckout} (taxa checkout: ${funnel.totalAtc > 0 ? fmtPct((funnel.totalCheckout / funnel.totalAtc) * 100) : 'N/A'})
• Pedidos pagos reais: ${funnel.totalOrders}
• Receita real atribuída: ${fmtBrl(funnel.totalRevenue)}
• ROAS real: ${realRoas > 0 ? `${realRoas.toFixed(2)}×` : 'sem dados'}

Baseado EXCLUSIVAMENTE nos dados acima, forneça análise profissional e direta em português:

**1. DIAGNÓSTICO**
Em 2-3 frases objetivas: qual é o estado atual desta ${levelNames[level] ?? level}? Está performando bem, mal, ou tem potencial?

**2. PROBLEMAS CRÍTICOS**
Lista com no máximo 3 problemas reais detectados nos dados (cite números). Se não houver problemas claros, diga isso. Foque em: frequência alta (>3.5), CPM elevado (>R$25), CTR baixo (<1%), funil quebrado (sessões vs ATC vs checkout vs pedidos), ROAS abaixo de 1×.

**3. OTIMIZAÇÕES PARA HOJE**
3 a 5 ações concretas que podem ser feitas HOJE no gerenciador para melhorar o resultado. Seja específico: "aumentar orçamento em 20%", "expandir público com lookalike 3-5%", "testar novo criativo com headline X", etc.

**4. OPORTUNIDADES**
2 a 3 oportunidades de escala ou teste identificadas nos dados. O que pode ser feito nas próximas semanas?

**5. SCORE DE PERFORMANCE: X/10**
Justificativa em 1 linha baseada nos dados reais.

Seja direto, use os números dos dados, não seja genérico.`

    const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages:   [{ role: 'user', content: prompt }],
    })

    const analysis = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ analysis, generatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[meta-analysis]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erro ao gerar análise. Verifique a chave ANTHROPIC_API_KEY.' }, { status: 500 })
  }
}
