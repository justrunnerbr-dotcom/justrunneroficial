'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { updateStories, type Story, type StoryTema } from '@/lib/ig/stories'

const PATH = '/admin/instagram/stories'

/** "2026-10-12T14:00" digitado no admin é horário de Brasília. */
function deBrasilia(local: string): string {
  return new Date(`${local}:00-03:00`).toISOString()
}

export async function addStoryAction(formData: FormData) {
  const mediaUrl = String(formData.get('mediaUrl') ?? '').trim()
  const quando = String(formData.get('agendadoPara') ?? '')
  if (!/^https:\/\//.test(mediaUrl) || !quando) return
  const tipo = /\.(mp4|mov|m4v)(\?|$)/i.test(mediaUrl) ? 'video' : 'imagem'
  const novo: Story = {
    id: randomUUID(), mediaUrl, tipo, agendadoPara: deBrasilia(quando),
    tema: (String(formData.get('tema') ?? 'produto') as StoryTema),
    modelo: String(formData.get('modelo') ?? '').trim() || null,
    cta: String(formData.get('cta') ?? '').trim() || null,
    nota: String(formData.get('nota') ?? '').trim() || null,
    status: formData.get('aprovar') === 'on' ? 'aprovado' : 'rascunho',
    criadoEm: new Date().toISOString(),
  }
  await updateStories(itens => [...itens, novo])
  revalidatePath(PATH)
}

export async function setStatusAction(id: string, status: 'aprovado' | 'rascunho' | 'cancelado') {
  await updateStories(itens => itens.map(s => (s.id === id && !['publicado', 'publicando'].includes(s.status) ? { ...s, status, erro: null } : s)))
  revalidatePath(PATH)
}

export async function aprovarDiaAction(dia: string) {
  await updateStories(itens => itens.map(s => {
    const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(s.agendadoPara))
    return d === dia && s.status === 'rascunho' ? { ...s, status: 'aprovado' } : s
  }))
  revalidatePath(PATH)
}

export async function reagendarAction(id: string, formData: FormData) {
  const quando = String(formData.get('agendadoPara') ?? '')
  if (!quando) return
  await updateStories(itens => itens.map(s => (s.id === id && s.status !== 'publicado'
    ? { ...s, agendadoPara: deBrasilia(quando), status: s.status === 'erro' ? 'rascunho' : s.status, erro: null, containerId: null }
    : s)))
  revalidatePath(PATH)
}

export async function excluirStoryAction(id: string) {
  await updateStories(itens => itens.filter(s => s.id !== id || s.status === 'publicado'))
  revalidatePath(PATH)
}
