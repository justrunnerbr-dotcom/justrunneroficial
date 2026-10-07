import { NextResponse } from 'next/server'
import { setMetaEntityStatus } from '@/lib/admin/meta-ads'
import { checkAuth, unauthorized, currentActor, clientIp } from '@/lib/admin/auth'
import { logAudit } from '@/lib/admin/audit'

export async function POST(request: Request) {
  if (!(await checkAuth())) return unauthorized()

  const body = await request.json().catch(() => ({})) as { id?: string; status?: string }
  const { id, status } = body

  if (!id || (status !== 'ACTIVE' && status !== 'PAUSED')) {
    return NextResponse.json({ ok: false, error: 'id e status (ACTIVE|PAUSED) são obrigatórios' }, { status: 400 })
  }

  const result = await setMetaEntityStatus(id, status)

  // Registrado depois da chamada e só quando ela deu certo — o log precisa
  // refletir o que aconteceu de fato na Meta, não a intenção.
  if (result.ok) {
    await logAudit({
      actor:      await currentActor(),
      action:     'campanha_status',
      entityType: 'meta_entity',
      entityId:   id,
      summary:    `${status === 'ACTIVE' ? 'Ativou' : 'Pausou'} ${id} no Meta Ads`,
      metadata:   { status },
      ip:         clientIp(request),
    })
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
