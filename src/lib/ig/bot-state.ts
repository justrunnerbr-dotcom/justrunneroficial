import { getAdminSupabase } from '@/lib/admin-client'
import type { SendMessagePayload } from '@/lib/ig/instagram'

// Estado do fluxo da DM por contato, sem tabela própria: cada mensagem do bot
// vai para a ig_queue com um campo `_bot` dentro do payload (o drain tira esse
// campo antes de mandar ao Instagram). O estado atual do contato é o `_bot` da
// linha mais recente dele. Linhas só de estado (sem mensagem) entram como
// status 'skipped' e nunca são enviadas.

export type BotStep = 'busca' | 'email' | null

export interface BotMeta {
  step?: BotStep
  /** Bot calado até esta data (cliente pediu atendente ou a equipe respondeu). */
  pauseUntil?: string
  /** Lembrete agendado: o drain descarta se o cliente falou depois de criado. */
  followup?: boolean
  /** Ação que gerou a mensagem, para relatório (menu, busca, faq:prazo...). */
  action?: string
  /** Último modelo mostrado (para "tem vídeo?" sem dizer o nome). */
  productId?: string
  variantId?: string
  /** Mensagem do meio de um lote: não conta como resposta separada nem define estado. */
  part?: boolean
}

export interface BotState {
  step: BotStep
  stepAt: string | null
  lastAction: string | null
  lastProductId: string | null
  /** Último menu completo de boas-vindas mandado ao contato. */
  lastMenuAt: string | null
  lastVariantId: string | null
  pausedUntil: string | null
  lastBotAt: string | null
}

type Db = ReturnType<typeof getAdminSupabase>

export async function getBotState(db: Db, contactId: string): Promise<BotState> {
  const { data } = await db.from('ig_queue').select('payload, created_at')
    .eq('contact_id', contactId).not('payload->_bot', 'is', null)
    // created_at é igual para o lote inteiro (mesmo INSERT); scheduled_for desempata.
    .order('created_at', { ascending: false }).order('scheduled_for', { ascending: false }).limit(20)
  const rows = (data ?? []) as { payload: { _bot: BotMeta }; created_at: string }[]
  const pause = rows.find(r => r.payload._bot.pauseUntil)
  const last = rows.find(r => !r.payload._bot.followup && !r.payload._bot.part)
  return {
    step: last?.payload._bot.step ?? null,
    stepAt: last?.created_at ?? null,
    lastAction: last?.payload._bot.action ?? null,
    lastProductId: rows.find(r => r.payload._bot.productId)?.payload._bot.productId ?? null,
    lastMenuAt: rows.find(r => /^menu(:story|:foto)?$/.test(r.payload._bot.action ?? '') && !r.payload._bot.part)?.created_at ?? null,
    lastVariantId: rows.find(r => r.payload._bot.productId)?.payload._bot.variantId ?? null,
    pausedUntil: pause && pause.payload._bot.pauseUntil! > new Date().toISOString() ? pause.payload._bot.pauseUntil! : null,
    lastBotAt: rows[0]?.created_at ?? null,
  }
}

/** Põe mensagens na fila, em ordem; o `meta` vai na última (é ela que define o estado). */
export async function enqueueBot(db: Db, params: {
  contactId: string
  igScopedId: string
  messages: SendMessagePayload[]
  meta: BotMeta
  delayMinutes?: number
}): Promise<void> {
  const base = Date.now() + (params.delayMinutes ?? 0) * 60_000
  // Todo link do assistente leva o contato no utm_term (igc_<id>): a sessão do
  // site guarda e o check-in do funil (lib/ig/funnel-checkin) sabe até onde a
  // pessoa chegou depois de clicar.
  const tag = `utm_campaign=bot_dm&utm_term=igc_${params.contactId}`
  const messages = params.messages.map(m => JSON.parse(JSON.stringify(m).replaceAll('utm_campaign=bot_dm', tag)) as SendMessagePayload)
  const rows = messages.map((m, i) => ({
    contact_id: params.contactId,
    automation_id: null,
    send_type: 'dm',
    recipient_ig_id: params.igScopedId,
    // 1ms entre as mensagens do lote: o drain ordena por scheduled_for, e todas
    // já estão vencidas quando o webhook chama o drain logo em seguida.
    scheduled_for: new Date(base + i).toISOString(),
    payload: { ...m, _bot: i === messages.length - 1 ? params.meta : { action: params.meta.action, part: true } },
    requires_24h_window: true,
  }))
  if (rows.length) await db.from('ig_queue').insert(rows)
}

/** Grava só estado (ex.: pausa porque a equipe respondeu), sem mandar nada. */
export async function setBotState(db: Db, contactId: string, meta: BotMeta): Promise<void> {
  await db.from('ig_queue').insert({
    contact_id: contactId, automation_id: null, send_type: 'dm', recipient_ig_id: null,
    payload: { _bot: meta }, status: 'skipped', last_error: 'estado do bot', requires_24h_window: false,
  })
}

/** Textos que o próprio bot mandou ao contato nos últimos minutos (para reconhecer o eco). */
export async function recentBotTexts(db: Db, contactId: string, minutes = 15): Promise<string[]> {
  const desde = new Date(Date.now() - minutes * 60_000).toISOString()
  const { data } = await db.from('ig_queue').select('payload')
    .eq('contact_id', contactId).gte('created_at', desde).neq('status', 'skipped')
  return ((data ?? []) as { payload: { text?: string; attachment?: { payload?: { text?: string } } } }[])
    .map(r => r.payload.text ?? r.payload.attachment?.payload?.text ?? '')
    .filter(Boolean)
}
