import Anthropic        from '@anthropic-ai/sdk'
import { NextResponse }  from 'next/server'
import { cookies }       from 'next/headers'
import { getAdminSupabase } from '@/lib/admin-client'
import {
  META_ACCOUNTS,
  getMetaAccountCampaigns,
  getMetaCampaignAdsets,
  getMetaAdsetAds,
  getFunnelData,
  getMetaLiveSpend,
  getMetaLiveCampaigns,
} from '@/lib/admin/meta-ads'

const JHF_STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const MODEL        = 'claude-sonnet-5'
const MAX_HISTORY  = 20
const MAX_TOOL_LOOPS = 10

async function checkAuth() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  return !!secret && token === secret
}

// ── Tools (function calling) ──────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_accounts',
    description: 'Lista as contas de anúncios Meta configuradas (id e nome).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_account_campaigns',
    description: 'Busca as campanhas de uma conta de anúncios com métricas de performance no período.',
    input_schema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'ID da conta de anúncios (ver list_accounts)' },
        since:     { type: 'string', description: 'Data inicial YYYY-MM-DD' },
        until:     { type: 'string', description: 'Data final YYYY-MM-DD' },
      },
      required: ['accountId', 'since', 'until'],
    },
  },
  {
    name: 'get_campaign_adsets',
    description: 'Busca os conjuntos de anúncios (adsets) de uma campanha com métricas de performance no período.',
    input_schema: {
      type: 'object',
      properties: {
        accountId:  { type: 'string', description: 'ID da conta de anúncios' },
        campaignId: { type: 'string', description: 'ID da campanha' },
        since:      { type: 'string', description: 'Data inicial YYYY-MM-DD' },
        until:      { type: 'string', description: 'Data final YYYY-MM-DD' },
      },
      required: ['accountId', 'campaignId', 'since', 'until'],
    },
  },
  {
    name: 'get_adset_ads',
    description: 'Busca os anúncios/criativos de um conjunto (adset), com thumbnail, título, corpo do anúncio, CTA e métricas de performance no período.',
    input_schema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'ID da conta de anúncios' },
        adsetId:   { type: 'string', description: 'ID do conjunto de anúncios' },
        since:     { type: 'string', description: 'Data inicial YYYY-MM-DD' },
        until:     { type: 'string', description: 'Data final YYYY-MM-DD' },
      },
      required: ['accountId', 'adsetId', 'since', 'until'],
    },
  },
  {
    name: 'get_real_funnel',
    description: 'Busca o funil real de vendas (sessões, add to cart, checkout, pedidos pagos, receita) atribuído a tráfego do Meta (Facebook/Instagram), direto do banco de dados da loja — use pra comparar com as métricas do próprio Meta (que podem estar infladas).',
    input_schema: {
      type: 'object',
      properties: {
        since: { type: 'string', description: 'Data inicial YYYY-MM-DD' },
        until: { type: 'string', description: 'Data final YYYY-MM-DD' },
      },
      required: ['since', 'until'],
    },
  },
  {
    name: 'get_all_accounts_overview',
    description: 'Busca uma visão cruzada de TODAS as contas de uma vez: gasto total e por conta (período atual, período anterior equivalente, últimos 7/30 dias, campanhas ativas/pausadas) e a lista de campanhas de todas as contas juntas ordenada por gasto. Prefira esta ferramenta a chamar get_account_campaigns conta por conta quando a pergunta envolver múltiplas contas, comparação entre contas, ou visão geral.',
    input_schema: {
      type: 'object',
      properties: {
        since: { type: 'string', description: 'Data inicial YYYY-MM-DD' },
        until: { type: 'string', description: 'Data final YYYY-MM-DD' },
      },
      required: ['since', 'until'],
    },
  },
  {
    name: 'view_ad_creative_image',
    description: 'Mostra visualmente (usando sua visão) a imagem/thumbnail de um criativo específico, pra você avaliar de verdade composição, texto na peça e apelo visual — não só os metadados de texto. Use a thumbnailUrl retornada por get_adset_ads. Chame quando o usuário pedir pra "ver"/avaliar visualmente um criativo, ou quando suspeitar que o problema de performance é o próprio criativo (não só as métricas). Funciona tanto pra imagem estática quanto pra thumbnail de vídeo.',
    input_schema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'thumbnailUrl retornada por get_adset_ads' },
        label:    { type: 'string', description: 'Nome do anúncio/criativo, pra identificar na conversa' },
      },
      required: ['imageUrl', 'label'],
    },
  },
  {
    name: 'update_strategy_notes',
    description: 'Atualiza a nota de estratégia de longo prazo — use sempre que o usuário ensinar uma preferência, regra ou padrão durável que deve ser lembrado em conversas futuras. Envie o TEXTO COMPLETO atualizado das notas (incorporando o que já existia + o novo aprendizado), não só a parte nova.',
    input_schema: {
      type: 'object',
      properties: {
        notes: { type: 'string', description: 'Texto completo e atualizado das notas de estratégia' },
      },
      required: ['notes'],
    },
  },
]

interface ImageToolResult {
  __image:   true
  url:       string
  label:     string
  base64:    string | null
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

function isImageResult(r: unknown): r is ImageToolResult {
  return !!r && typeof r === 'object' && '__image' in r
}

const IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

// Claude só aceita imagem via URL se o host permitir no robots.txt (o fetch é feito
// pelos servidores da Anthropic) — o CDN da Meta bloqueia isso, então baixamos aqui
// e mandamos em base64.
async function fetchImageAsBase64(url: string, label: string): Promise<ImageToolResult> {
  try {
    const res = await fetch(url)
    if (!res.ok) return { __image: true, url, label, base64: null, mediaType: 'image/jpeg' }
    const contentType = res.headers.get('content-type') ?? ''
    const mediaType = (IMAGE_MEDIA_TYPES as readonly string[]).includes(contentType)
      ? contentType as ImageToolResult['mediaType']
      : 'image/jpeg'
    const buf = Buffer.from(await res.arrayBuffer())
    return { __image: true, url, label, base64: buf.toString('base64'), mediaType }
  } catch {
    return { __image: true, url, label, base64: null, mediaType: 'image/jpeg' }
  }
}

async function runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const db = getAdminSupabase()
  switch (name) {
    case 'list_accounts':
      return META_ACCOUNTS.filter(a => a.id)
    case 'get_account_campaigns':
      return getMetaAccountCampaigns(String(input.accountId), String(input.since), String(input.until))
    case 'get_campaign_adsets':
      return getMetaCampaignAdsets(String(input.accountId), String(input.campaignId), String(input.since), String(input.until))
    case 'get_adset_ads':
      return getMetaAdsetAds(String(input.accountId), String(input.adsetId), String(input.since), String(input.until))
    case 'get_real_funnel':
      return getFunnelData(db, String(input.since), String(input.until))
    case 'get_all_accounts_overview': {
      const [liveSpend, campaigns] = await Promise.all([
        getMetaLiveSpend(String(input.since), String(input.until)),
        getMetaLiveCampaigns(String(input.since), String(input.until)),
      ])
      return { liveSpend, campaigns }
    }
    case 'view_ad_creative_image':
      return fetchImageAsBase64(String(input.imageUrl), String(input.label ?? ''))
    case 'update_strategy_notes': {
      const notes = String(input.notes ?? '')
      await db.from('meta_ads_agent_memory').upsert(
        { store_id: JHF_STORE_ID, notes, updated_at: new Date().toISOString() },
        { onConflict: 'store_id' },
      )
      return { ok: true }
    }
    default:
      return { error: `unknown tool ${name}` }
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(notes: string): string {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const accounts = META_ACCOUNTS.filter(a => a.id).map(a => `${a.name} (id ${a.id})`).join(', ')

  return `Você é um especialista sênior em performance de tráfego pago Meta Ads para um e-commerce brasileiro de moda/óculos premium (Just Runner). Você está conversando diretamente com o dono da operação, que vai te ensinando a estratégia dele ao longo do tempo.

Hoje é ${today} (fuso America/Sao_Paulo).

Contas de anúncios configuradas: ${accounts || 'nenhuma configurada'}.

Você tem ferramentas pra buscar dados reais (campanhas, conjuntos, criativos, funil de vendas real) — use-as sempre que precisar de números pra responder, não invente dados. Quando o usuário ensinar uma preferência, regra ou padrão que deve valer daqui pra frente, chame update_strategy_notes pra guardar isso.

Diretrizes de análise:
- Quando a pergunta envolver mais de uma conta, comparação entre contas, ou visão geral, use get_all_accounts_overview em vez de chamar get_account_campaigns conta por conta.
- Sempre que fizer sentido avaliar tendência (ex: "está piorando?", "esse criativo já era?", "vale escalar?"), busque proativamente um período anterior comparável (mesmo número de dias, imediatamente antes) com as mesmas ferramentas, e compare explicitamente os números (gasto, CPM, CTR, frequência, resultados) — aponte se melhorou, piorou ou estabilizou.
- Sinal de fadiga de criativo pra ficar de olho: frequência subindo + CTR caindo ao longo do tempo, sem mudança de público.
- Quando o usuário pedir pra "ver"/avaliar visualmente um criativo, ou quando você suspeitar que o problema é o próprio criativo (não só as métricas), use view_ad_creative_image com a thumbnailUrl que você já tem de uma chamada anterior a get_adset_ads — e comente de verdade sobre o que vê na imagem (composição, texto na peça, apelo visual), não só repita os números.

${notes ? `═══ NOTAS DE ESTRATÉGIA JÁ APRENDIDAS ═══\n${notes}\n` : '(Ainda não há notas de estratégia registradas — esta pode ser a primeira conversa.)'}

Seja direto, cite números reais das ferramentas, e converse naturalmente — não precisa forçar um formato fixo de resposta como um relatório, a menos que o usuário peça.`
}

// ── GET: histórico + notas ─────────────────────────────────────────────────────

export async function GET() {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const db = getAdminSupabase()
  const [{ data: messages }, { data: memory }] = await Promise.all([
    db.from('meta_ads_agent_messages')
      .select('role, content, created_at')
      .eq('store_id', JHF_STORE_ID)
      .order('created_at', { ascending: true })
      .limit(200),
    db.from('meta_ads_agent_memory')
      .select('notes')
      .eq('store_id', JHF_STORE_ID)
      .maybeSingle(),
  ])

  return NextResponse.json({ messages: messages ?? [], notes: memory?.notes ?? '' })
}

// ── POST: novo turno de conversa ───────────────────────────────────────────────

export async function POST(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY não encontrada. Adicione a variável de ambiente no Vercel e no .env.local.' },
      { status: 500 },
    )
  }

  const { message } = await req.json() as { message?: string }
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 })
  }

  const db = getAdminSupabase()

  try {
    const [{ data: history }, { data: memory }] = await Promise.all([
      db.from('meta_ads_agent_messages')
        .select('role, content')
        .eq('store_id', JHF_STORE_ID)
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY),
      db.from('meta_ads_agent_memory')
        .select('notes')
        .eq('store_id', JHF_STORE_ID)
        .maybeSingle(),
    ])

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const system = buildSystemPrompt(memory?.notes ?? '')

    const messages: Anthropic.MessageParam[] = [
      ...(history ?? []).slice().reverse().map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    let finalText = ''
    const viewedImages: { url: string; label: string }[] = []

    for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
      const response = await client.messages.create({
        model:      MODEL,
        max_tokens: 2000,
        system,
        messages,
        tools:      TOOLS,
      })

      const toolUses = response.content.filter(b => b.type === 'tool_use')

      if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
        finalText = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
        break
      }

      messages.push({ role: 'assistant', content: response.content })

      const toolResults = await Promise.all(toolUses.map(async (tu) => {
        const result = await runTool(tu.name, tu.input as Record<string, unknown>)

        if (isImageResult(result)) {
          const { url, label, base64, mediaType } = result
          viewedImages.push({ url, label })

          if (!base64) {
            return {
              type:        'tool_result' as const,
              tool_use_id: tu.id,
              content:     `Não consegui carregar a imagem do criativo "${label}".`,
            }
          }

          return {
            type:        'tool_result' as const,
            tool_use_id: tu.id,
            content: [
              { type: 'text' as const, text: `Imagem do criativo "${label}" carregada abaixo — analise visualmente.` },
              { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64 } },
            ],
          }
        }

        return {
          type:         'tool_result' as const,
          tool_use_id:  tu.id,
          content:      JSON.stringify(result),
        }
      }))

      messages.push({ role: 'user', content: toolResults })
    }

    if (!finalText) finalText = 'Não consegui gerar uma resposta — tente reformular a pergunta.'

    await db.from('meta_ads_agent_messages').insert([
      { store_id: JHF_STORE_ID, role: 'user',      content: message },
      { store_id: JHF_STORE_ID, role: 'assistant', content: finalText },
    ])

    return NextResponse.json({ reply: finalText, viewedImages, generatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[meta-ads-agent]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erro ao conversar com o agente. Verifique a chave ANTHROPIC_API_KEY.' }, { status: 500 })
  }
}
