'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { updateFila, type ItemFila } from '@/lib/ig/feed'

// Reels moram na mesma fila do feed (settings.ig_feed_fila), publicados pelo
// cron /api/cron/ig-stories (pg_cron, a cada 5 min), que também roda o feed.
// Esta página só mostra e mexe nos itens de reels.

const PATH = '/admin/instagram/reels'

/** "2026-10-12T14:00" digitado no admin é horário de Brasília. */
function deBrasilia(local: string): string {
  return new Date(`${local}:00-03:00`).toISOString()
}

const editavel = (i: ItemFila) => !['publicado', 'publicando'].includes(i.status)

function revalidar() {
  revalidatePath(PATH)
}

/** Link de vídeo aceito: arquivo .mp4/.mov ou arquivo do Drive (vira link de download direto). */
function linkVideo(bruto: string): { url: string; thumb: string | null; fonte: string | null } | null {
  const drive = bruto.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=download&)?id=)([\w-]{20,})/)
    ?? bruto.match(/drive\.usercontent\.google\.com\/download\?id=([\w-]{20,})/)
  if (drive) {
    const id = drive[1]
    return {
      url: `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
      thumb: `https://drive.google.com/thumbnail?id=${id}&sz=w720`,
      fonte: `drive:${id}`,
    }
  }
  return /^https:\/\/.+\.(mp4|mov|m4v)(\?|$)/i.test(bruto) ? { url: bruto, thumb: null, fonte: null } : null
}

export async function addReelAction(formData: FormData) {
  const link = linkVideo(String(formData.get('url') ?? '').trim())
  const quando = String(formData.get('agendadoPara') ?? '')
  if (!link || !quando) return
  const novo: ItemFila = {
    id: randomUUID(), origemId: null, origemPermalink: null, midias: [link.url], formato: 'reels', thumb: link.thumb, fonte: link.fonte,
    legenda: String(formData.get('legenda') ?? '').slice(0, 2200),
    soReels: formData.get('soReels') === 'on',
    agendadoPara: deBrasilia(quando),
    status: formData.get('aprovar') === 'on' ? 'aprovado' : 'rascunho',
    criadoEm: new Date().toISOString(),
  }
  await updateFila(itens => [...itens, novo])
  revalidar()
}

export async function setStatusAction(id: string, status: 'aprovado' | 'rascunho' | 'cancelado') {
  await updateFila(itens => itens.map(i => (i.id === id && editavel(i) ? { ...i, status, erro: null } : i)))
  revalidar()
}

export async function aprovarDiaAction(dia: string) {
  await updateFila(itens => itens.map(i => {
    const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(i.agendadoPara))
    return i.formato === 'reels' && d === dia && i.status === 'rascunho' ? { ...i, status: 'aprovado' } : i
  }))
  revalidar()
}

export async function legendaAction(id: string, formData: FormData) {
  const legenda = String(formData.get('legenda') ?? '').slice(0, 2200)
  await updateFila(itens => itens.map(i => (i.id === id && editavel(i) ? { ...i, legenda, containerId: null } : i)))
  revalidar()
}

export async function reagendarAction(id: string, formData: FormData) {
  const quando = String(formData.get('agendadoPara') ?? '')
  if (!quando) return
  await updateFila(itens => itens.map(i => (i.id === id && editavel(i)
    ? { ...i, agendadoPara: deBrasilia(quando), status: i.status === 'erro' ? 'rascunho' : i.status, erro: null, containerId: null }
    : i)))
  revalidar()
}

export async function soReelsAction(id: string, soReels: boolean) {
  await updateFila(itens => itens.map(i => (i.id === id && editavel(i) ? { ...i, soReels, containerId: null } : i)))
  revalidar()
}

export async function excluirAction(id: string) {
  await updateFila(itens => itens.filter(i => i.id !== id || i.status === 'publicado'))
  revalidar()
}
