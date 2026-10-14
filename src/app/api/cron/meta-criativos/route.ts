import { NextResponse } from 'next/server'
import { META_ACCOUNTS } from '@/lib/admin/meta-ads'

// Análise de criativos (14/10/2026): insights da Meta por ANÚNCIO + dados do criativo (texto, título,
// miniatura, vídeo), direto da Graph API, só leitura. Não grava no banco nem altera nada na conta.
// Protegida pelo CRON_SECRET, igual às outras rotas de /api/cron.
// GET /api/cron/meta-criativos?desde=AAAA-MM-DD&ate=AAAA-MM-DD[&diario=1]

export const maxDuration = 300

const VER = 'v21.0'
const INSIGHTS = [
  'account_id', 'campaign_id', 'campaign_name', 'adset_id', 'adset_name', 'ad_id', 'ad_name',
  'spend', 'impressions', 'reach', 'frequency', 'clicks', 'inline_link_clicks', 'ctr', 'inline_link_click_ctr', 'cpc', 'cpm',
  'actions', 'action_values', 'cost_per_action_type',
  'video_play_actions', 'video_thruplay_watched_actions', 'video_p25_watched_actions', 'video_p50_watched_actions',
  'video_p75_watched_actions', 'video_p100_watched_actions', 'video_avg_time_watched_actions',
].join(',')
const ADS = 'id,name,status,effective_status,created_time,adset_id,campaign_id,preview_shareable_link,' +
  'creative{id,name,title,body,object_type,thumbnail_url,image_url,video_id,call_to_action_type,object_story_spec,asset_feed_spec}'

async function todas(url: string, token: string): Promise<{ data: Record<string, unknown>[]; erro?: string }> {
  const data: Record<string, unknown>[] = []
  let next: string | null = url
  for (let i = 0; next && i < 50; i++) {
    const res: Response = await fetch(next, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(60000) })
    const j = await res.json().catch(() => ({})) as { data?: Record<string, unknown>[]; paging?: { next?: string }; error?: { message?: string } }
    if (!res.ok) return { data, erro: j.error?.message ?? `HTTP ${res.status}` }
    data.push(...(j.data ?? []))
    next = j.paging?.next ?? null
  }
  return { data }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return NextResponse.json({ ok: false, erro: 'META_ACCESS_TOKEN ausente' }, { status: 500 })

  const q = new URL(request.url).searchParams
  // ?contas=1: lista as contas de anúncio que o token enxerga (pra achar conta fora do META_ACCOUNTS)
  if (q.get('contas') === '1') {
    const r = await todas(`https://graph.facebook.com/${VER}/me/adaccounts?${new URLSearchParams({ fields: 'account_id,name,account_status,amount_spent,currency', limit: '100' })}`, token)
    return NextResponse.json({ ok: !r.erro, erro: r.erro, configuradas: META_ACCOUNTS.map(a => a.id), contas: r.data })
  }
  const dia = /^\d{4}-\d{2}-\d{2}$/
  const desde = q.get('desde') ?? ''
  const ate = q.get('ate') ?? new Date().toISOString().slice(0, 10)
  if (!dia.test(desde) || !dia.test(ate)) return NextResponse.json({ ok: false, erro: 'use ?desde=AAAA-MM-DD&ate=AAAA-MM-DD' }, { status: 400 })

  const contas = []
  // ?conta=ID: lê só essa conta (precisa estar entre as que o token enxerga)
  const alvo = q.get('conta')
  const lista = alvo && /^\d+$/.test(alvo) ? [{ id: alvo, name: `act_${alvo}` }] : META_ACCOUNTS.filter(a => a.id)
  for (const conta of lista) {
    const base = `https://graph.facebook.com/${VER}/act_${conta.id}`
    const pi = new URLSearchParams({ fields: INSIGHTS, level: 'ad', time_range: JSON.stringify({ since: desde, until: ate }), limit: '200' })
    if (q.get('diario') === '1') pi.set('time_increment', '1')
    const pa = new URLSearchParams({ fields: ADS, limit: '100', filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN',
      value: ['ACTIVE', 'PAUSED', 'ADSET_PAUSED', 'CAMPAIGN_PAUSED', 'ARCHIVED', 'WITH_ISSUES', 'DISAPPROVED', 'IN_PROCESS', 'PENDING_REVIEW'] }]) })
    const [insights, anuncios] = await Promise.all([todas(`${base}/insights?${pi}`, token), todas(`${base}/ads?${pa}`, token)])
    contas.push({ conta: conta.name, id: conta.id, insights: insights.data, anuncios: anuncios.data, erros: [insights.erro, anuncios.erro].filter(Boolean) })
  }

  // ?videos=1: link pra assistir (permalink), capa grande e duração de cada vídeo usado nos anúncios.
  const videos: Record<string, unknown> = {}
  if (q.get('videos') === '1') {
    type Criativo = { video_id?: string; object_story_spec?: { video_data?: { video_id?: string } }; asset_feed_spec?: { videos?: { video_id?: string }[] } }
    const ids = [...new Set(contas.flatMap(c => c.anuncios.flatMap(a => {
      const cr = (a.creative ?? {}) as Criativo
      return [cr.video_id, cr.object_story_spec?.video_data?.video_id, ...(cr.asset_feed_spec?.videos ?? []).map(v => v.video_id)]
    })).filter((v): v is string => !!v))]
    for (let i = 0; i < ids.length; i += 50) {
      const lote = ids.slice(i, i + 50)
      const res = await fetch(`https://graph.facebook.com/${VER}/?${new URLSearchParams({ ids: lote.join(','), fields: 'permalink_url,picture,length,title,description' })}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(60000) })
      const j = await res.json().catch(() => ({})) as Record<string, unknown> & { error?: { message?: string } }
      if (res.ok) Object.assign(videos, j)
      else for (const id of lote) videos[id] = { erro: j.error?.message ?? `HTTP ${res.status}` }   // um id sem acesso derruba o lote: marca e segue
    }
  }
  return NextResponse.json({ ok: true, desde, ate, contas, videos })
}
