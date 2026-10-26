import { getAdminSupabase } from '@/lib/admin-client'

export type Automation = {
  id: string
  name: string
  active: boolean
  trigger_comment: boolean
  trigger_story_reply: boolean
  trigger_dm: boolean
  keywords: string[]
  match_type: 'contains' | 'exact' | 'any'
  specific_media_id: string | null
  public_replies: string[]
  welcome_message: string
  quick_reply_label: string | null
  link_message: string | null
  link_button_label: string | null
  link_url: string | null
  reminder_message: string | null
  reminder_delay_minutes: number | null
  created_at: string
}

export type AutomationInput = Omit<Automation, 'id' | 'created_at'>

export async function listAutomations(): Promise<Automation[]> {
  const db = getAdminSupabase()
  const { data } = await db.from('ig_automations').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export async function getAutomation(id: string): Promise<Automation | null> {
  const db = getAdminSupabase()
  const { data } = await db.from('ig_automations').select('*').eq('id', id).single()
  return data
}

export async function createAutomation(input: AutomationInput): Promise<string> {
  const db = getAdminSupabase()
  const { data, error } = await db.from('ig_automations').insert(input).select('id').single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function updateAutomation(id: string, input: AutomationInput): Promise<void> {
  const db = getAdminSupabase()
  const { error } = await db.from('ig_automations').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteAutomation(id: string): Promise<void> {
  const db = getAdminSupabase()
  const { error } = await db.from('ig_automations').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function setAutomationActive(id: string, active: boolean): Promise<void> {
  const db = getAdminSupabase()
  const { error } = await db.from('ig_automations').update({ active, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
}
