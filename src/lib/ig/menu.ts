import { getAdminSupabase } from '@/lib/admin-client'
import type { SendMessagePayload } from '@/lib/ig/instagram'

// Menu de boas-vindas: toda DM nova recebe uma mensagem com até 3 botões que
// abrem o site (Compre 1 Leve 2, Mais vendidos, Combos...).
//
// "Nova" = primeira mensagem da pessoa depois de `silenceHours` sem falar com a
// loja, e sem ter recebido o menu nos últimos `cooldownDays`. Assim o menu não
// entra no meio de uma conversa que a equipe está atendendo.
//
// Fica em settings.ig_menu_dm (JSON), e não numa tabela, para não depender de
// migração. As linhas do menu na ig_queue são as únicas sem automation_id.

export const IG_MENU_KEY = 'ig_menu_dm'
export const IG_BUTTON_TITLE_MAX = 20 // limite do Instagram para o texto do botão
export const IG_TEXT_MAX = 640        // limite do Instagram para o texto do template

export interface MenuButton { title: string; url: string }
export interface MenuConfig {
  active: boolean
  message: string
  buttons: MenuButton[]
  silenceHours: number
  cooldownDays: number
}

const utm = (content: string) =>
  `utm_source=instagram&utm_medium=dm&utm_campaign=menu_dm&utm_content=${content}`

export const DEFAULT_MENU: MenuConfig = {
  active: false,
  message: 'Oi! 👋 Que bom te ver por aqui.\n\nEscolhe abaixo o que você quer ver 👇\n\nSe for dúvida sobre pedido, é só mandar aqui que a gente responde.',
  buttons: [
    { title: 'Compre 1 Leve 2 🔥', url: `https://justrunner.com.br/colecao/compre-1-leve-2?${utm('compre_1_leve_2')}` },
    { title: 'Mais vendidos', url: `https://justrunner.com.br/colecao/mais-vendidos?${utm('mais_vendidos')}` },
    { title: 'Combos', url: `https://justrunner.com.br/colecao/combos?${utm('combos')}` },
  ],
  silenceHours: 2,
  cooldownDays: 7,
}

export async function getMenuConfig(): Promise<MenuConfig> {
  const db = getAdminSupabase()
  const { data } = await db.from('settings').select('value').eq('key', IG_MENU_KEY).maybeSingle()
  if (!data?.value) return DEFAULT_MENU
  try {
    return { ...DEFAULT_MENU, ...(JSON.parse(data.value) as Partial<MenuConfig>) }
  } catch {
    return DEFAULT_MENU
  }
}

export async function saveMenuConfig(cfg: MenuConfig): Promise<void> {
  const db = getAdminSupabase()
  const { error } = await db.from('settings')
    .upsert({ key: IG_MENU_KEY, value: JSON.stringify(cfg), updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw new Error(error.message)
}

export function buildMenuPayload(cfg: MenuConfig): SendMessagePayload {
  if (cfg.buttons.length === 0) return { text: cfg.message }
  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'button',
        text: cfg.message,
        buttons: cfg.buttons.map(b => ({ type: 'web_url' as const, url: b.url, title: b.title })),
      },
    },
  }
}

/**
 * Coloca o menu na fila se a mensagem abre uma conversa nova.
 * `previousMessageAt` é o last_user_response_at do contato ANTES desta mensagem.
 */
export async function maybeEnqueueMenu(params: {
  igScopedId: string
  previousMessageAt: string | null
}): Promise<'enqueued' | 'inactive' | 'conversa_em_andamento' | 'menu_recente'> {
  const cfg = await getMenuConfig()
  if (!cfg.active) return 'inactive'

  if (params.previousMessageAt
    && Date.now() - new Date(params.previousMessageAt).getTime() < cfg.silenceHours * 3_600_000) {
    return 'conversa_em_andamento'
  }

  const db = getAdminSupabase()
  const { data: contact } = await db.from('ig_contacts')
    .upsert({ ig_scoped_id: params.igScopedId, updated_at: new Date().toISOString() }, { onConflict: 'ig_scoped_id' })
    .select('id').single()
  if (!contact) return 'inactive'

  const desde = new Date(Date.now() - cfg.cooldownDays * 86_400_000).toISOString()
  const { count } = await db.from('ig_queue').select('id', { count: 'exact', head: true })
    .eq('contact_id', contact.id).is('automation_id', null).gte('created_at', desde)
  if ((count ?? 0) > 0) return 'menu_recente'

  await db.from('ig_queue').insert({
    contact_id: contact.id,
    automation_id: null,
    send_type: 'dm',
    recipient_ig_id: params.igScopedId,
    payload: buildMenuPayload(cfg),
    requires_24h_window: true,
  })
  return 'enqueued'
}
