import { getAdminSupabase } from '@/lib/admin-client'
import { detectVariables } from '@/lib/mkt/template'
import type { EmailDoc } from '@/lib/mkt/email-kit'

export type MktTemplate = {
  id: string
  name: string
  channel: 'email'
  subject: string | null
  body: string
  variables: string[]
  /** EmailDoc do kit; null = HTML colado à mão */
  blocks: EmailDoc | null
  created_at: string
  updated_at: string
}

export type MktTemplateInput = { name: string; subject: string | null; body: string; blocks: EmailDoc | null }

/** Envio de teste usa campanha/modelo descartáveis com este prefixo: some das listas. */
export const PREFIXO_TESTE = '__teste__'

export async function listTemplates(): Promise<MktTemplate[]> {
  const db = getAdminSupabase()
  const { data, error } = await db.from('mkt_templates').select('*').eq('channel', 'email')
    .not('name', 'like', `${PREFIXO_TESTE}%`).order('created_at', { ascending: false }).limit(200)
  if (error) throw new Error(error.message)
  return (data ?? []) as MktTemplate[]
}

export async function getTemplate(id: string): Promise<MktTemplate | null> {
  const db = getAdminSupabase()
  const { data } = await db.from('mkt_templates').select('*').eq('id', id).maybeSingle()
  return (data as MktTemplate | null) ?? null
}

export async function createTemplate(input: MktTemplateInput): Promise<string> {
  const db = getAdminSupabase()
  const variables = detectVariables(`${input.subject ?? ''} ${input.body}`)
  const { data, error } = await db.from('mkt_templates').insert({ ...input, channel: 'email', variables }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id as string
}

export async function updateTemplate(id: string, input: MktTemplateInput): Promise<void> {
  const db = getAdminSupabase()
  const variables = detectVariables(`${input.subject ?? ''} ${input.body}`)
  const { error } = await db.from('mkt_templates').update({ ...input, variables, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = getAdminSupabase()
  const { error } = await db.from('mkt_templates').delete().eq('id', id)
  // FK de mkt_campaigns: modelo usado por campanha não pode sumir
  if (error) throw new Error(error.code === '23503' ? 'este modelo é usado por uma campanha' : error.message)
}
