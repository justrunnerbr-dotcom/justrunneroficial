import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { setMetaEntityStatus } from '@/lib/admin/meta-ads'

async function checkAuth() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  return !!secret && token === secret
}

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
