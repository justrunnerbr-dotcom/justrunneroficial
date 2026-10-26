import { getAdminSupabase } from '@/lib/admin-client'
import type { SendMessagePayload } from '@/lib/ig/instagram'

type Automation = {
  id: string
  welcome_message: string
  quick_reply_label: string | null
  link_message: string | null
  link_button_label: string | null
  link_url: string | null
  reminder_message: string | null
  reminder_delay_minutes: number | null
}

export function buildWelcomePayload(a: Automation): SendMessagePayload {
  if (a.quick_reply_label) {
    return {
      text: a.welcome_message,
      quick_replies: [{ content_type: 'text', title: a.quick_reply_label, payload: a.id }],
    }
  }
  return { text: a.welcome_message }
}

function buildLinkPayload(a: Automation): SendMessagePayload | null {
  if (!a.link_message) return null
  if (a.link_url) {
    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: a.link_message,
          buttons: [{ type: 'web_url', url: a.link_url, title: a.link_button_label ?? 'Abrir link' }],
        },
      },
    }
  }
  return { text: a.link_message }
}

export async function enqueueWelcome(params: {
  contactId: string
  automation: Automation
  sendType: 'private_reply' | 'dm'
  recipientCommentId?: string
  recipientIgId?: string
}) {
  const db = getAdminSupabase()
  const payload = buildWelcomePayload(params.automation)
  await db.from('ig_queue').insert({
    contact_id: params.contactId,
    automation_id: params.automation.id,
    send_type: params.sendType,
    recipient_comment_id: params.recipientCommentId ?? null,
    recipient_ig_id: params.recipientIgId ?? null,
    payload,
    requires_24h_window: params.sendType === 'dm',
  })
}

export async function enqueueFollowups(params: { contactId: string; igScopedId: string; automation: Automation }) {
  const db = getAdminSupabase()
  const now = Date.now()

  const linkPayload = buildLinkPayload(params.automation)
  if (linkPayload) {
    await db.from('ig_queue').insert({
      contact_id: params.contactId,
      automation_id: params.automation.id,
      send_type: 'dm',
      recipient_ig_id: params.igScopedId,
      payload: linkPayload,
      requires_24h_window: true,
      scheduled_for: new Date(now).toISOString(),
    })
  }

  if (params.automation.reminder_message) {
    const delayMin = params.automation.reminder_delay_minutes ?? 60
    await db.from('ig_queue').insert({
      contact_id: params.contactId,
      automation_id: params.automation.id,
      send_type: 'dm',
      recipient_ig_id: params.igScopedId,
      payload: { text: params.automation.reminder_message } satisfies SendMessagePayload,
      requires_24h_window: true,
      scheduled_for: new Date(now + delayMin * 60_000).toISOString(),
    })
  }
}
