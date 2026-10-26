'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createAutomation, updateAutomation, deleteAutomation, setAutomationActive,
  type AutomationInput,
} from '@/lib/ig/automations'
import { saveMenuConfig, IG_BUTTON_TITLE_MAX, IG_TEXT_MAX, type MenuButton } from '@/lib/ig/menu'

function parseInput(formData: FormData): AutomationInput {
  const keywordsRaw = String(formData.get('keywords') ?? '')
  const repliesRaw = String(formData.get('public_replies') ?? '')
  const reminderDelay = formData.get('reminder_delay_minutes')

  return {
    name: String(formData.get('name') ?? '').trim(),
    active: formData.get('active') === 'on',
    trigger_comment: formData.get('trigger_comment') === 'on',
    trigger_story_reply: formData.get('trigger_story_reply') === 'on',
    trigger_dm: formData.get('trigger_dm') === 'on',
    keywords: keywordsRaw.split(',').map(k => k.trim()).filter(Boolean),
    match_type: (String(formData.get('match_type') ?? 'contains') as AutomationInput['match_type']),
    specific_media_id: String(formData.get('specific_media_id') ?? '').trim() || null,
    public_replies: repliesRaw.split('\n').map(r => r.trim()).filter(Boolean),
    welcome_message: String(formData.get('welcome_message') ?? '').trim(),
    quick_reply_label: String(formData.get('quick_reply_label') ?? '').trim() || null,
    link_message: String(formData.get('link_message') ?? '').trim() || null,
    link_button_label: String(formData.get('link_button_label') ?? '').trim() || null,
    link_url: String(formData.get('link_url') ?? '').trim() || null,
    reminder_message: String(formData.get('reminder_message') ?? '').trim() || null,
    reminder_delay_minutes: reminderDelay ? Number(reminderDelay) : null,
  }
}

export async function createAutomationAction(formData: FormData) {
  const input = parseInput(formData)
  await createAutomation(input)
  revalidatePath('/admin/instagram')
  redirect('/admin/instagram')
}

export async function updateAutomationAction(id: string, formData: FormData) {
  const input = parseInput(formData)
  await updateAutomation(id, input)
  revalidatePath('/admin/instagram')
  redirect('/admin/instagram')
}

export async function deleteAutomationAction(id: string) {
  await deleteAutomation(id)
  revalidatePath('/admin/instagram')
}

export async function toggleAutomationAction(id: string, active: boolean) {
  await setAutomationActive(id, active)
  revalidatePath('/admin/instagram')
}

export async function saveMenuAction(formData: FormData) {
  const buttons: MenuButton[] = [0, 1, 2]
    .map(i => ({
      title: String(formData.get(`button_title_${i}`) ?? '').trim().slice(0, IG_BUTTON_TITLE_MAX),
      url: String(formData.get(`button_url_${i}`) ?? '').trim(),
    }))
    .filter(b => b.title && /^https:\/\//.test(b.url))
  await saveMenuConfig({
    active: formData.get('active') === 'on',
    message: String(formData.get('message') ?? '').trim().slice(0, IG_TEXT_MAX),
    buttons,
    silenceHours: Math.max(1, Number(formData.get('silence_hours')) || 24),
    cooldownDays: Math.max(1, Number(formData.get('cooldown_days')) || 7),
  })
  revalidatePath('/admin/instagram')
  redirect('/admin/instagram?menu=salvo')
}
