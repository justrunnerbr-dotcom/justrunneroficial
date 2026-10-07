import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'
import { checkAuth, unauthorized, currentActor, clientIp } from '@/lib/admin/auth'
import { logAudit } from '@/lib/admin/audit'

// PATCH body: { key: string, value: string }
export async function PATCH(request: Request) {
  if (!(await checkAuth())) return unauthorized()

  const { key, value } = await request.json()
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  const db = getAdminSupabase()
  const { data, error } = await db
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Aqui moram, entre outras, a data do contador de promoção e o texto da
  // barra de avisos — mudanças que aparecem na loja inteira sem passar por
  // deploy, e que por isso precisam ficar rastreadas.
  await logAudit({
    actor:      await currentActor(),
    action:     'config_alterada',
    entityType: 'settings',
    entityId:   String(key),
    summary:    `Alterou a configuração "${key}"`,
    metadata:   { key, value },
    ip:         clientIp(request),
  })

  return NextResponse.json(data)
}
