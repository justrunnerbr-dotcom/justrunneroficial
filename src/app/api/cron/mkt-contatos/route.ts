import { NextResponse } from 'next/server'
import { sincronizarContatos, lerEstadoSync } from '@/lib/mkt/contatos'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Sincroniza a base do e-mail marketing com os clientes da Yampi (lib/mkt/contatos.ts).
 *  pg_cron (jr-mkt-contatos) chama 3× às 06h de Brasília: a 1ª faz tudo (~2 mil
 *  clientes cabem numa chamada); as outras só continuam se a 1ª não terminou.
 *  ?forcar=1 roda mesmo com sincronização completa recente. */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  try {
    const forcar = new URL(request.url).searchParams.get('forcar') === '1'
    const estado = await lerEstadoSync()
    const recente = estado.ultimoCompleto && Date.now() - new Date(estado.ultimoCompleto).getTime() < 6 * 3_600_000
    if (!forcar && estado.pagina == null && recente) {
      return NextResponse.json({ ok: true, pulado: 'sincronização completa há menos de 6h', ultimoCompleto: estado.ultimoCompleto })
    }
    return NextResponse.json({ ok: true, ...(await sincronizarContatos()) })
  } catch (err) {
    console.error('[cron mkt-contatos]', err)
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
