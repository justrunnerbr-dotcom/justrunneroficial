import { NextResponse } from 'next/server'
import { setMetaEntityStatus } from '@/lib/admin/meta-ads'
import { checkAuth } from '@/lib/admin/auth'

export async function POST(request: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { id?: string; status?: string }
  const { id, status } = body

  if (!id || (status !== 'ACTIVE' && status !== 'PAUSED')) {
    return NextResponse.json({ ok: false, error: 'id e status (ACTIVE|PAUSED) são obrigatórios' }, { status: 400 })
  }

  const result = await setMetaEntityStatus(id, status)
  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
